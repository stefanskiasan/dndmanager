import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ModelGenerationPanel } from '@/components/character/ModelGenerationPanel'

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string; characterId: string }>
}) {
  const { campaignId, characterId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .single()

  if (!character) redirect(`/campaigns/${campaignId}`)

  const isOwner = character.owner_id === user.id

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{character.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-400">Level {character.level}</p>
        </CardContent>
      </Card>

      {isOwner && (
        <div className="w-full max-w-md">
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
