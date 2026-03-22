import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ModelGenerationPanel } from '@/components/character/ModelGenerationPanel'

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ characterId: string }>
}) {
  const { characterId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .single()

  if (!character) redirect('/characters')

  const isOwner = character.owner_id === user.id
  const charData = (character.data ?? {}) as Record<string, unknown>

  // Get campaign assignments
  const { data: assignments } = await supabase
    .from('campaign_characters')
    .select('campaign_id, campaigns(name)')
    .eq('character_id', characterId)

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/characters">
        <Button variant="ghost" className="mb-4">&larr; Meine Charaktere</Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{character.name}</CardTitle>
              <CardDescription>Level {character.level} &middot; {character.xp} XP</CardDescription>
            </div>
            {isOwner && (
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                Dein Charakter
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campaign Assignments */}
          {assignments && assignments.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-neutral-400">Kampagnen</h3>
              <div className="flex flex-wrap gap-2">
                {assignments.map((a) => (
                  <Link key={a.campaign_id} href={`/campaigns/${a.campaign_id}`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-neutral-700">
                      {(a.campaigns as any)?.name ?? 'Unbekannt'}
                    </Badge>
                  </Link>
                ))}
              </div>
              <Separator />
            </>
          )}

          {/* Ability Scores */}
          {charData.abilities && (
            <>
              <h3 className="text-sm font-semibold text-neutral-400">Ability Scores</h3>
              <div className="grid grid-cols-6 gap-2 text-center">
                {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((ab) => (
                  <div key={ab} className="rounded bg-neutral-800 p-2">
                    <div className="text-xs uppercase text-neutral-500">{ab}</div>
                    <div className="text-lg font-bold">{(charData.abilities as Record<string, number>)[ab] ?? 10}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Class & Ancestry */}
          {(charData.class || charData.ancestry) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {charData.ancestry && (
                  <div>
                    <span className="text-xs text-neutral-500">Ancestry</span>
                    <p className="font-medium">{charData.ancestry as string}</p>
                  </div>
                )}
                {charData.class && (
                  <div>
                    <span className="text-xs text-neutral-500">Class</span>
                    <p className="font-medium">{charData.class as string}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* HP & AC */}
          <Separator />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded bg-neutral-800 p-3">
              <div className="text-xs text-neutral-500">HP</div>
              <div className="text-xl font-bold text-green-400">
                {(charData.hp as Record<string, number>)?.current ?? '—'}/{(charData.hp as Record<string, number>)?.max ?? '—'}
              </div>
            </div>
            <div className="rounded bg-neutral-800 p-3">
              <div className="text-xs text-neutral-500">AC</div>
              <div className="text-xl font-bold text-blue-400">{(charData.ac as number) ?? '—'}</div>
            </div>
            <div className="rounded bg-neutral-800 p-3">
              <div className="text-xs text-neutral-500">Speed</div>
              <div className="text-xl font-bold text-amber-400">{(charData.speed as number) ?? '—'} ft</div>
            </div>
          </div>

          {!charData.abilities && !charData.class && (
            <div className="rounded bg-neutral-800/50 p-4 text-center">
              <p className="text-neutral-400">Charakter-Details werden nach der Erstellung ueber den AI-Wizard oder Pathbuilder-Import angezeigt.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <div className="mt-6">
          <ModelGenerationPanel
            characterId={character.id}
            initialStatus={(character.model_status ?? 'none') as 'none' | 'pending' | 'processing' | 'succeeded' | 'failed'}
            initialModelUrl={character.model_url}
            initialThumbnailUrl={character.model_thumbnail_url}
          />
        </div>
      )}
    </main>
  )
}
