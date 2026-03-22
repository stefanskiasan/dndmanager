-- ============================================================
-- Game State Tables (Realtime-enabled)
-- ============================================================

-- Game State: tracks current mode, round, active session
create table public.game_state (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  mode text not null default 'exploration' check (mode in ('exploration', 'encounter', 'downtime')),
  round integer not null default 0,
  current_turn_index integer not null default -1,
  current_token_id text,
  actions_remaining integer not null default 3,
  reaction_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id)
);

alter table public.game_state enable row level security;
alter publication supabase_realtime add table public.game_state;

create policy "Campaign members can view game state"
  on public.game_state for select
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      left join public.campaign_members cm on cm.campaign_id = c.id
      where s.id = game_state.session_id
      and (c.gm_id = auth.uid() or cm.user_id = auth.uid())
    )
  );

create policy "GMs can manage game state"
  on public.game_state for all
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = game_state.session_id
      and c.gm_id = auth.uid()
    )
  );

-- Game Tokens: all tokens on the map
create table public.game_tokens (
  id text not null,
  game_state_id uuid not null references public.game_state(id) on delete cascade,
  name text not null,
  token_type text not null check (token_type in ('player', 'monster', 'npc')),
  owner_id uuid references public.profiles(id),
  position_x integer not null default 0,
  position_y integer not null default 0,
  speed integer not null default 25,
  hp_current integer not null,
  hp_max integer not null,
  hp_temp integer not null default 0,
  ac integer not null,
  conditions jsonb not null default '[]'::jsonb,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, game_state_id)
);

alter table public.game_tokens enable row level security;
alter publication supabase_realtime add table public.game_tokens;

create policy "Campaign members can view visible tokens"
  on public.game_tokens for select
  using (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      join public.campaigns c on c.id = s.campaign_id
      left join public.campaign_members cm on cm.campaign_id = c.id
      where gs.id = game_tokens.game_state_id
      and (c.gm_id = auth.uid() or cm.user_id = auth.uid())
    )
    and (
      visible = true
      or exists (
        select 1 from public.game_state gs
        join public.sessions s on s.id = gs.session_id
        join public.campaigns c on c.id = s.campaign_id
        where gs.id = game_tokens.game_state_id
        and c.gm_id = auth.uid()
      )
    )
  );

create policy "GMs can manage tokens"
  on public.game_tokens for all
  using (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      join public.campaigns c on c.id = s.campaign_id
      where gs.id = game_tokens.game_state_id
      and c.gm_id = auth.uid()
    )
  );

create policy "Players can update their own tokens"
  on public.game_tokens for update
  using (owner_id = auth.uid());

-- Game Initiative: turn order during encounters
create table public.game_initiative (
  id uuid primary key default uuid_generate_v4(),
  game_state_id uuid not null references public.game_state(id) on delete cascade,
  token_id text not null,
  roll integer not null,
  modifier integer not null default 0,
  total integer not null,
  sort_order integer not null default 0
);

alter table public.game_initiative enable row level security;
alter publication supabase_realtime add table public.game_initiative;

create policy "Campaign members can view initiative"
  on public.game_initiative for select
  using (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      join public.campaigns c on c.id = s.campaign_id
      left join public.campaign_members cm on cm.campaign_id = c.id
      where gs.id = game_initiative.game_state_id
      and (c.gm_id = auth.uid() or cm.user_id = auth.uid())
    )
  );

create policy "GMs can manage initiative"
  on public.game_initiative for all
  using (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      join public.campaigns c on c.id = s.campaign_id
      where gs.id = game_initiative.game_state_id
      and c.gm_id = auth.uid()
    )
  );

-- Game Action Log: records all actions for replay
create table public.game_action_log (
  id uuid primary key default uuid_generate_v4(),
  game_state_id uuid not null references public.game_state(id) on delete cascade,
  event_type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.game_action_log enable row level security;
alter publication supabase_realtime add table public.game_action_log;

create policy "Campaign members can view action log"
  on public.game_action_log for select
  using (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      join public.campaigns c on c.id = s.campaign_id
      left join public.campaign_members cm on cm.campaign_id = c.id
      where gs.id = game_action_log.game_state_id
      and (c.gm_id = auth.uid() or cm.user_id = auth.uid())
    )
  );

create policy "GMs can write action log"
  on public.game_action_log for insert
  with check (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      join public.campaigns c on c.id = s.campaign_id
      where gs.id = game_action_log.game_state_id
      and c.gm_id = auth.uid()
    )
  );

-- Updated-at triggers
create trigger set_game_state_updated_at
  before update on public.game_state
  for each row execute function public.set_updated_at();

create trigger set_game_tokens_updated_at
  before update on public.game_tokens
  for each row execute function public.set_updated_at();
