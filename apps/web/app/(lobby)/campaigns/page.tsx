import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: gmCampaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('gm_id', user.id)
    .order('created_at', { ascending: false })

  const { data: memberships } = await supabase
    .from('campaign_members')
    .select('campaign_id, campaigns(*)')
    .eq('user_id', user.id)

  const playerCampaigns = memberships
    ?.map((m) => m.campaigns)
    .filter(Boolean) ?? []

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Kampagnen</h1>
        <div className="flex gap-2">
          <Link href="/campaigns/join">
            <Button variant="outline">Beitreten</Button>
          </Link>
          <Link href="/campaigns/new">
            <Button>Neue Kampagne</Button>
          </Link>
        </div>
      </div>

      {gmCampaigns && gmCampaigns.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Deine Kampagnen (GM)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {gmCampaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <CardTitle>{campaign.name}</CardTitle>
                  <CardDescription>{campaign.description || 'Keine Beschreibung'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-400">
                    Einladungscode: <code className="rounded bg-neutral-800 px-2 py-1">{campaign.invite_code}</code>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {playerCampaigns.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Beigetretene Kampagnen</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {playerCampaigns.map((campaign: any) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <CardTitle>{campaign.name}</CardTitle>
                  <CardDescription>{campaign.description || 'Keine Beschreibung'}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      )}

      {(!gmCampaigns || gmCampaigns.length === 0) && playerCampaigns.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-lg text-neutral-400">
            Noch keine Kampagnen. Erstelle eine neue oder tritt einer bei.
          </p>
        </div>
      )}
    </main>
  )
}
