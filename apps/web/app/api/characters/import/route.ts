import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pathbuilderExportSchema } from '@/lib/schemas/pathbuilder'
import { mapPathbuilderToCharacter, validateCharacterData } from '@dndmanager/pf2e-engine/pathbuilder'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungueltiges JSON' }, { status: 400 })
  }

  const { campaignId, pathbuilderData } = body as {
    campaignId?: string
    pathbuilderData?: unknown
  }

  if (!campaignId || !pathbuilderData) {
    return NextResponse.json(
      { error: 'campaignId und pathbuilderData sind erforderlich' },
      { status: 400 },
    )
  }

  // Verify campaign membership
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Kampagne nicht gefunden' }, { status: 404 })
  }

  // Validate Pathbuilder JSON shape
  const parseResult = pathbuilderExportSchema.safeParse(pathbuilderData)
  if (!parseResult.success) {
    return NextResponse.json({
      error: 'Ungueltige Pathbuilder-Datei',
      details: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    }, { status: 422 })
  }

  // Map to our format
  const { name, level, data } = mapPathbuilderToCharacter(parseResult.data)

  // Validate against pf2e rules
  const validation = validateCharacterData(data)
  if (!validation.valid) {
    return NextResponse.json({
      error: 'Charakter-Validierung fehlgeschlagen',
      details: validation.errors.map((e) => `${e.field}: ${e.message}`),
      warnings: validation.warnings.map((w) => `${w.field}: ${w.message}`),
    }, { status: 422 })
  }

  // Insert character
  const { data: character, error: insertError } = await supabase
    .from('characters')
    .insert({
      name,
      level,
      xp: 0,
      owner_id: user.id,
      campaign_id: campaignId,
      data,
    })
    .select('id, name')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    character,
    warnings: validation.warnings.map((w) => `${w.field}: ${w.message}`),
  }, { status: 201 })
}
