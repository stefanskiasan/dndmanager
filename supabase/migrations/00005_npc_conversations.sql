-- ============================================================
-- NPC Conversations (AI Dialog Engine)
-- ============================================================

-- NPC Conversations: tracks an ongoing dialog between a player and an NPC
create table public.npc_conversations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  npc_id text not null,
  player_id uuid not null references public.profiles(id) on delete cascade,
  npc_name text not null,
  npc_profile jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, npc_id, player_id)
);

alter table public.npc_conversations enable row level security;
alter publication supabase_realtime add table public.npc_conversations;

-- Campaign members can view conversations in their session
create policy "Campaign members can view NPC conversations"
  on public.npc_conversations for select
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      left join public.campaign_members cm on cm.campaign_id = c.id
      where s.id = npc_conversations.session_id
      and (c.gm_id = auth.uid() or cm.user_id = auth.uid())
    )
  );

-- Players can start conversations (insert)
create policy "Players can start NPC conversations"
  on public.npc_conversations for insert
  with check (player_id = auth.uid());

-- GMs can manage all conversations in their campaigns
create policy "GMs can manage NPC conversations"
  on public.npc_conversations for all
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = npc_conversations.session_id
      and c.gm_id = auth.uid()
    )
  );

-- NPC Messages: individual messages within a conversation
create table public.npc_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.npc_conversations(id) on delete cascade,
  role text not null check (role in ('player', 'npc', 'system')),
  content text not null,
  status text not null default 'approved'
    check (status in ('pending', 'approved', 'edited', 'rejected')),
  original_content text,
  token_count_input integer,
  token_count_output integer,
  created_at timestamptz not null default now()
);

alter table public.npc_messages enable row level security;
alter publication supabase_realtime add table public.npc_messages;

-- Campaign members can view approved messages in their session
create policy "Campaign members can view approved NPC messages"
  on public.npc_messages for select
  using (
    exists (
      select 1 from public.npc_conversations nc
      join public.sessions s on s.id = nc.session_id
      join public.campaigns c on c.id = s.campaign_id
      left join public.campaign_members cm on cm.campaign_id = c.id
      where nc.id = npc_messages.conversation_id
      and (c.gm_id = auth.uid() or cm.user_id = auth.uid())
    )
    and (
      -- GMs see all messages (including pending)
      exists (
        select 1 from public.npc_conversations nc
        join public.sessions s on s.id = nc.session_id
        join public.campaigns c on c.id = s.campaign_id
        where nc.id = npc_messages.conversation_id
        and c.gm_id = auth.uid()
      )
      -- Players only see approved/edited messages and their own player messages
      or status in ('approved', 'edited')
      or (role = 'player' and exists (
        select 1 from public.npc_conversations nc
        where nc.id = npc_messages.conversation_id
        and nc.player_id = auth.uid()
      ))
    )
  );

-- Players can insert their own messages
create policy "Players can send messages"
  on public.npc_messages for insert
  with check (
    role = 'player'
    and exists (
      select 1 from public.npc_conversations nc
      where nc.id = npc_messages.conversation_id
      and nc.player_id = auth.uid()
    )
  );

-- GMs can insert and update messages (for AI responses and approval)
create policy "GMs can manage NPC messages"
  on public.npc_messages for all
  using (
    exists (
      select 1 from public.npc_conversations nc
      join public.sessions s on s.id = nc.session_id
      join public.campaigns c on c.id = s.campaign_id
      where nc.id = npc_messages.conversation_id
      and c.gm_id = auth.uid()
    )
  );

-- Index for fast conversation message lookups
create index idx_npc_messages_conversation_id on public.npc_messages(conversation_id);
create index idx_npc_messages_status on public.npc_messages(status) where status = 'pending';
create index idx_npc_conversations_session_id on public.npc_conversations(session_id);

-- Updated-at trigger for conversations
create trigger set_npc_conversations_updated_at
  before update on public.npc_conversations
  for each row execute function public.set_updated_at();
