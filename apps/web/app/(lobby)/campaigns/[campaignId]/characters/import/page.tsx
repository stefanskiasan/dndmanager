import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PathbuilderImport } from '@/components/character/PathbuilderImport'

export default async function ImportCharacterPage({
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
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Charakter importieren</h1>
          <p className="text-sm text-neutral-400">Kampagne: {campaign.name}</p>
        </div>
        <PathbuilderImport campaignId={campaignId} />
      </div>
    </main>
  )
}
