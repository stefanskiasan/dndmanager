import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (!campaign) redirect('/campaigns')

  const isGM = campaign.gm_id === user.id

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('campaign_id', campaignId)

  const myCharacter = characters?.find((c) => c.owner_id === user.id)

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <p className="mt-1 text-neutral-400">{campaign.description || 'Keine Beschreibung'}</p>
        </div>
        {isGM && (
          <Badge variant="outline" className="text-amber-400 border-amber-400">
            Gamemaster
          </Badge>
        )}
      </div>

      {isGM && (
        <div className="mt-4 rounded bg-neutral-800 p-3">
          <span className="text-sm text-neutral-400">Einladungscode: </span>
          <code className="rounded bg-neutral-700 px-2 py-1 text-amber-400">{campaign.invite_code}</code>
        </div>
      )}

      <Separator className="my-8" />

      {/* Character Section */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Charaktere</h2>
          <Link href={`/campaigns/${campaignId}/characters/new`}>
            <Button size="sm">Charakter erstellen</Button>
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {characters && characters.length > 0 ? (
            characters.map((char) => (
              <Link key={char.id} href={`/campaigns/${campaignId}/characters/${char.id}`}>
                <Card className={`cursor-pointer transition-colors hover:border-neutral-600 ${char.owner_id === user.id ? 'border-blue-500' : ''}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{char.name}</CardTitle>
                    <CardDescription>Level {char.level}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))
          ) : (
            <p className="text-neutral-500">Noch keine Charaktere erstellt.</p>
          )}
        </div>
      </section>

      <Separator className="my-8" />

      {/* Sessions Section */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Sessions</h2>
          {isGM && (
            <form action={async () => {
              'use server'
              const { createClient: createServerClient } = await import('@/lib/supabase/server')
              const supabase = await createServerClient()
              const { data } = await supabase
                .from('sessions')
                .insert({
                  campaign_id: campaignId,
                  name: `Session ${(sessions?.length ?? 0) + 1}`,
                  status: 'planned',
                })
                .select()
                .single()
              if (data) {
                redirect(`/campaigns/${campaignId}`)
              }
            }}>
              <Button type="submit" size="sm">Neue Session</Button>
            </form>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {sessions && sessions.length > 0 ? (
            sessions.map((session) => (
              <Card key={session.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg">{session.name}</CardTitle>
                    <CardDescription>
                      Status: <Badge variant={
                        session.status === 'active' ? 'default' :
                        session.status === 'completed' ? 'secondary' : 'outline'
                      }>{session.status}</Badge>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {isGM && session.status !== 'completed' && (
                      <Link href={`/dashboard/${session.id}`}>
                        <Button variant="outline" size="sm">GM Dashboard</Button>
                      </Link>
                    )}
                    {session.status === 'active' && (
                      <Link href={`/play/${session.id}`}>
                        <Button size="sm">Beitreten</Button>
                      </Link>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            <p className="text-neutral-500">Noch keine Sessions geplant.</p>
          )}
        </div>
      </section>

      <div className="mt-8">
        <Link href="/campaigns">
          <Button variant="ghost">&larr; Zurueck zu Kampagnen</Button>
        </Link>
      </div>
    </main>
  )
}
