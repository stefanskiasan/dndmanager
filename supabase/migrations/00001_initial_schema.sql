-- ============================================================
-- DnD Manager — Initial Schema
-- Pathfinder 2e Hybrid Tabletop Platform
-- ============================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- Profiles (extends Supabase Auth)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null default 'player' check (role in ('player', 'gm')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Campaigns
-- ============================================================
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null default '',
  gm_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(4), 'hex'),
  settings jsonb not null default '{
    "rateLimits": {
      "aiCallsPerHour": 50,
      "modelGenerationsPerDay": 5,
      "audioGenerationsPerSession": 20,
      "realtimeUpdatesPerMinute": 60
    },
    "dataRetention": {
      "aiConversationDays": 30,
      "sessionSnapshotMax": 50,
      "actionLogDays": 90
    }
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campaigns enable row level security;

create policy "Members can view their campaigns"
  on public.campaigns for select
  using (
    gm_id = auth.uid()
    or exists (
      select 1 from public.campaign_members
      where campaign_id = campaigns.id
      and user_id = auth.uid()
    )
  );

create policy "GMs can create campaigns"
  on public.campaigns for insert
  with check (gm_id = auth.uid());

create policy "GMs can update their campaigns"
  on public.campaigns for update
  using (gm_id = auth.uid());

create policy "GMs can delete their campaigns"
  on public.campaigns for delete
  using (gm_id = auth.uid());

-- ============================================================
-- Campaign Members
-- ============================================================
create table public.campaign_members (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'player' check (role in ('player', 'gm')),
  joined_at timestamptz not null default now(),
  unique(campaign_id, user_id)
);

alter table public.campaign_members enable row level security;

create policy "Members can view campaign members"
  on public.campaign_members for select
  using (
    exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = campaign_members.campaign_id
      and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_members.campaign_id
      and c.gm_id = auth.uid()
    )
  );

create policy "Users can join campaigns"
  on public.campaign_members for insert
  with check (user_id = auth.uid());

create policy "GMs can manage members"
  on public.campaign_members for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_members.campaign_id
      and c.gm_id = auth.uid()
    )
  );

-- ============================================================
-- Sessions
-- ============================================================
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Campaign members can view sessions"
  on public.sessions for select
  using (
    exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = sessions.campaign_id
      and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaigns c
      where c.id = sessions.campaign_id
      and c.gm_id = auth.uid()
    )
  );

create policy "GMs can manage sessions"
  on public.sessions for all
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = sessions.campaign_id
      and c.gm_id = auth.uid()
    )
  );

-- ============================================================
-- Characters (base — expanded in Phase 1.2)
-- ============================================================
create table public.characters (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  level integer not null default 1 check (level >= 1 and level <= 20),
  xp integer not null default 0 check (xp >= 0),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.characters enable row level security;

create policy "Owners have full access to their characters"
  on public.characters for all
  using (owner_id = auth.uid());

create policy "Campaign members can view characters in their campaign"
  on public.characters for select
  using (
    exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = characters.campaign_id
      and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaigns c
      where c.id = characters.campaign_id
      and c.gm_id = auth.uid()
    )
  );

create policy "GMs have full access to characters in their campaigns"
  on public.characters for all
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = characters.campaign_id
      and c.gm_id = auth.uid()
    )
  );

-- ============================================================
-- Updated-at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create trigger set_characters_updated_at
  before update on public.characters
  for each row execute function public.set_updated_at();

-- ============================================================
-- RPC: Join campaign by invite code
-- ============================================================
create or replace function public.join_campaign_by_invite_code(code text)
returns uuid as $$
declare
  v_campaign_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_campaign_id
  from public.campaigns
  where invite_code = code;

  if v_campaign_id is null then
    raise exception 'Campaign not found';
  end if;

  insert into public.campaign_members (campaign_id, user_id, role)
  values (v_campaign_id, v_user_id, 'player')
  on conflict (campaign_id, user_id) do nothing;

  return v_campaign_id;
end;
$$ language plpgsql security definer;
