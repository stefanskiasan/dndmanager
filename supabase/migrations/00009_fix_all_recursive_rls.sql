-- ============================================================
-- Fix ALL recursive RLS policies
-- Problem: campaigns policy queries campaign_members,
-- campaign_members policy queries campaigns -> infinite loop
-- Solution: Use security definer functions to bypass RLS
-- ============================================================

-- Helper function: check if user is member of a campaign (bypasses RLS)
create or replace function public.is_campaign_member(p_campaign_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.campaign_members
    where campaign_id = p_campaign_id
    and user_id = p_user_id
  )
$$ language sql security definer stable;

-- Helper function: check if user is GM of a campaign (bypasses RLS)
create or replace function public.is_campaign_gm(p_campaign_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.campaigns
    where id = p_campaign_id
    and gm_id = p_user_id
  )
$$ language sql security definer stable;

-- Helper function: get all campaign IDs where user is member or GM
create or replace function public.user_campaign_ids(p_user_id uuid)
returns setof uuid as $$
  select campaign_id from public.campaign_members where user_id = p_user_id
  union
  select id from public.campaigns where gm_id = p_user_id
$$ language sql security definer stable;

-- ============================================================
-- Fix campaigns policies
-- ============================================================
drop policy if exists "Members can view their campaigns" on public.campaigns;
create policy "Members can view their campaigns"
  on public.campaigns for select
  using (
    gm_id = auth.uid()
    or public.is_campaign_member(id, auth.uid())
  );

-- ============================================================
-- Fix campaign_members policies
-- ============================================================
drop policy if exists "Members can view campaign members" on public.campaign_members;
create policy "Members can view campaign members"
  on public.campaign_members for select
  using (
    public.is_campaign_gm(campaign_id, auth.uid())
    or public.is_campaign_member(campaign_id, auth.uid())
  );

-- ============================================================
-- Fix sessions policies
-- ============================================================
drop policy if exists "Campaign members can view sessions" on public.sessions;
create policy "Campaign members can view sessions"
  on public.sessions for select
  using (
    public.is_campaign_gm(campaign_id, auth.uid())
    or public.is_campaign_member(campaign_id, auth.uid())
  );

-- ============================================================
-- Fix characters policies (the campaign-based one)
-- ============================================================
drop policy if exists "Campaign members can view characters in their campaign" on public.characters;
drop policy if exists "Campaign members can view characters via assignment" on public.characters;
create policy "Campaign members can view characters via assignment"
  on public.characters for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.campaign_characters cc
      where cc.character_id = characters.id
      and cc.campaign_id in (select public.user_campaign_ids(auth.uid()))
    )
  );

-- ============================================================
-- Fix game_state policies
-- ============================================================
drop policy if exists "Campaign members can view game state" on public.game_state;
create policy "Campaign members can view game state"
  on public.game_state for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = game_state.session_id
      and s.campaign_id in (select public.user_campaign_ids(auth.uid()))
    )
  );

-- ============================================================
-- Fix game_tokens policies
-- ============================================================
drop policy if exists "Campaign members can view visible tokens" on public.game_tokens;
create policy "Campaign members can view visible tokens"
  on public.game_tokens for select
  using (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      where gs.id = game_tokens.game_state_id
      and s.campaign_id in (select public.user_campaign_ids(auth.uid()))
    )
    and (visible = true or exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      where gs.id = game_tokens.game_state_id
      and public.is_campaign_gm(s.campaign_id, auth.uid())
    ))
  );
