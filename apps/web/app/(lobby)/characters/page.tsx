import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function MyCharactersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  // Get campaign assignments for each character
  const characterIds = characters?.map((c) => c.id) ?? []
  const { data: assignments } = characterIds.length > 0
    ? await supabase
        .from('campaign_characters')
        .select('character_id, campaign_id, campaigns(name)')
        .in('character_id', characterIds)
    : { data: [] }

  const assignmentMap = new Map<string, { campaignId: string; campaignName: string }[]>()
  for (const a of assignments ?? []) {
    const list = assignmentMap.get(a.character_id) ?? []
    list.push({
      campaignId: a.campaign_id,
      campaignName: (a.campaigns as any)?.name ?? 'Unbekannt',
    })
    assignmentMap.set(a.character_id, list)
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Meine Charaktere</h1>
        <Link href="/characters/new">
          <Button>Neuer Charakter</Button>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {characters && characters.length > 0 ? (
          characters.map((char) => {
            const campaigns = assignmentMap.get(char.id) ?? []
            const charData = (char.data ?? {}) as Record<string, unknown>

            return (
              <Link key={char.id} href={`/characters/${char.id}`}>
                <Card className="cursor-pointer transition-colors hover:border-neutral-600">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{char.name}</CardTitle>
                      <Badge variant="outline">Lvl {char.level}</Badge>
                    </div>
                    <CardDescription>
                      {charData.ancestry && charData.class
                        ? `${charData.ancestry} ${charData.class}`
                        : `${char.xp} XP`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {campaigns.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {campaigns.map((c) => (
                          <Badge key={c.campaignId} variant="secondary" className="text-xs">
                            {c.campaignName}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500">Keiner Kampagne zugewiesen</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })
        ) : (
          <div className="col-span-2 text-center py-12">
            <p className="text-lg text-neutral-400">Noch keine Charaktere erstellt.</p>
            <Link href="/characters/new" className="mt-4 inline-block">
              <Button>Ersten Charakter erstellen</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
