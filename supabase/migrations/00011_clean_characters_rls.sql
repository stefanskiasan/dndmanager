-- ============================================================
-- CLEAN SWEEP: Drop ALL character policies and recreate simply
-- The multiple overlapping FOR ALL policies cause infinite recursion
-- ============================================================

-- Drop every policy on characters
drop policy if exists "Owners have full access to their characters" on public.characters;
drop policy if exists "Campaign members can view characters in their campaign" on public.characters;
drop policy if exists "Campaign members can view characters via assignment" on public.characters;
drop policy if exists "GMs have full access to characters in their campaigns" on public.characters;

-- Simple owner-based policies (NO cross-table queries = NO recursion)
create policy "characters_select"
  on public.characters for select
  using (owner_id = auth.uid());

create policy "characters_insert"
  on public.characters for insert
  with check (owner_id = auth.uid());

create policy "characters_update"
  on public.characters for update
  using (owner_id = auth.uid());

create policy "characters_delete"
  on public.characters for delete
  using (owner_id = auth.uid());

-- GMs and campaign members see characters via security definer function
create or replace function public.get_campaign_character_ids(p_user_id uuid)
returns setof uuid as $$
  select cc.character_id
  from public.campaign_characters cc
  where cc.campaign_id in (select public.user_campaign_ids(p_user_id))
$$ language sql security definer stable;

-- Additional SELECT for campaign-visible characters
create policy "characters_campaign_select"
  on public.characters for select
  using (id in (select public.get_campaign_character_ids(auth.uid())));

-- Also clean up campaign_characters policies
drop policy if exists "Owners can manage their character assignments" on public.campaign_characters;
drop policy if exists "Campaign members can view character assignments" on public.campaign_characters;
drop policy if exists "GMs can manage character assignments in their campaigns" on public.campaign_characters;

create policy "campaign_characters_select"
  on public.campaign_characters for select
  using (
    campaign_id in (select public.user_campaign_ids(auth.uid()))
  );

create policy "campaign_characters_insert"
  on public.campaign_characters for insert
  with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
    or campaign_id in (select public.user_campaign_ids(auth.uid()))
  );

create policy "campaign_characters_delete"
  on public.campaign_characters for delete
  using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
    or public.is_campaign_gm(campaign_id, auth.uid())
  );
