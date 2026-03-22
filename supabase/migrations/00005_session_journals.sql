-- ============================================================
-- Session Journals (AI-generated session summaries)
-- ============================================================

create table public.session_journals (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  narrative text not null,
  highlights jsonb not null default '[]'::jsonb,
  combat_summary text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(session_id)  -- one journal per session
);

alter table public.session_journals enable row level security;

-- Campaign members can read journals
create policy "Campaign members can view session journals"
  on public.session_journals for select
  using (
    exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = session_journals.campaign_id
      and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaigns c
      where c.id = session_journals.campaign_id
      and c.gm_id = auth.uid()
    )
  );

-- Only GMs can create/update/delete journals
create policy "GMs can manage session journals"
  on public.session_journals for all
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = session_journals.campaign_id
      and c.gm_id = auth.uid()
    )
  );

-- Index for fast lookup by campaign
create index idx_session_journals_campaign_id on public.session_journals(campaign_id);
