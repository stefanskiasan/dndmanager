import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CharacterForm } from '@/components/character/CharacterForm'

export default async function NewCharacterPage({
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
    .select('name')
    .eq('id', campaignId)
    .single()

  if (!campaign) redirect('/campaigns')

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Neuer Charakter</CardTitle>
          <CardDescription>Fuer Kampagne: {campaign.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <CharacterForm campaignId={campaignId} />
        </CardContent>
        <CardContent className="border-t border-neutral-800 pt-4">
          <p className="text-sm text-neutral-400 text-center">
            Oder{' '}
            <Link
              href={`/campaigns/${campaignId}/characters/import`}
              className="text-blue-400 hover:underline"
            >
              Charakter aus Pathbuilder 2e importieren
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
