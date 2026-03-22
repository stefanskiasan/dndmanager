import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const characterId = request.nextUrl.searchParams.get('characterId')
  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: character, error } = await supabase
    .from('characters')
    .select('id, model_url, model_thumbnail_url, model_status')
    .eq('id', characterId)
    .single()

  if (error || !character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 })
  }

  return NextResponse.json({
    characterId: character.id,
    status: character.model_status,
    modelUrl: character.model_url,
    thumbnailUrl: character.model_thumbnail_url,
  })
}
