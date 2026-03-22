-- Fix remaining recursive policy on characters
-- "GMs have full access" was querying campaigns which triggers campaign RLS

drop policy if exists "GMs have full access to characters in their campaigns" on public.characters;

-- Replace with security definer function approach
create policy "GMs have full access to characters in their campaigns"
  on public.characters for all
  using (
    owner_id = auth.uid()
    or (
      campaign_id is not null
      and public.is_campaign_gm(campaign_id, auth.uid())
    )
    or exists (
      select 1 from public.campaign_characters cc
      where cc.character_id = characters.id
      and public.is_campaign_gm(cc.campaign_id, auth.uid())
    )
  );
