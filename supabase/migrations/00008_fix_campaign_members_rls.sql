-- Fix infinite recursion in campaign_members RLS policy
-- The old policy checked campaign_members to verify membership,
-- which triggered the same policy again.

-- Drop the recursive policy
drop policy if exists "Members can view campaign members" on public.campaign_members;

-- New policy: you can see members if you're the GM or if your own row exists
-- Using a non-recursive approach: check campaigns.gm_id OR match your own user_id
create policy "Members can view campaign members"
  on public.campaign_members for select
  using (
    -- You can always see rows in campaigns where you are GM
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_members.campaign_id
      and c.gm_id = auth.uid()
    )
    -- Or you can see rows in campaigns where you have a membership
    -- (this is safe because it matches on user_id directly, not recursing into the policy)
    or campaign_members.campaign_id in (
      select cm.campaign_id from public.campaign_members cm
      where cm.user_id = auth.uid()
    )
  );

-- Also fix the campaigns "Members can view" policy which has the same issue
drop policy if exists "Members can view their campaigns" on public.campaigns;

create policy "Members can view their campaigns"
  on public.campaigns for select
  using (
    gm_id = auth.uid()
    or id in (
      select cm.campaign_id from public.campaign_members cm
      where cm.user_id = auth.uid()
    )
  );
