-- ============================================================
-- Make characters independent from campaigns
-- Characters can exist without a campaign and be assigned to multiple
-- ============================================================

-- Make campaign_id nullable
alter table public.characters alter column campaign_id drop not null;

-- Create junction table for character-campaign assignments
create table public.campaign_characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  unique(campaign_id, character_id)
);

alter table public.campaign_characters enable row level security;

create policy "Owners can manage their character assignments"
  on public.campaign_characters for all
  using (
    exists (
      select 1 from public.characters c
      where c.id = campaign_characters.character_id
      and c.owner_id = auth.uid()
    )
  );

create policy "Campaign members can view character assignments"
  on public.campaign_characters for select
  using (
    exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = campaign_characters.campaign_id
      and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_characters.campaign_id
      and c.gm_id = auth.uid()
    )
  );

create policy "GMs can manage character assignments in their campaigns"
  on public.campaign_characters for all
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_characters.campaign_id
      and c.gm_id = auth.uid()
    )
  );

-- Update characters RLS: owners always see their own characters (even without campaign)
drop policy if exists "Owners have full access to their characters" on public.characters;
create policy "Owners have full access to their characters"
  on public.characters for all
  using (owner_id = auth.uid());

-- Campaign members can see characters assigned to their campaign
drop policy if exists "Campaign members can view characters in their campaign" on public.characters;
create policy "Campaign members can view characters via assignment"
  on public.characters for select
  using (
    exists (
      select 1 from public.campaign_characters cc
      join public.campaign_members cm on cm.campaign_id = cc.campaign_id
      where cc.character_id = characters.id
      and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_characters cc
      join public.campaigns c on c.id = cc.campaign_id
      where cc.character_id = characters.id
      and c.gm_id = auth.uid()
    )
  );

-- Migrate existing data: create campaign_characters entries for all characters with campaign_id
insert into public.campaign_characters (campaign_id, character_id)
select campaign_id, id from public.characters
where campaign_id is not null
on conflict do nothing;
