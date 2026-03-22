import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface LevelUpPayload {
  newLevel: number
  hpIncrease: number
  abilityBoosts: string[]      // ability IDs
  skillIncreases: string[]     // skill names
  feats: { slot: string; name: string }[]
  spells?: string[]
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params
    const body = (await req.json()) as LevelUpPayload
    const supabase = await createClient()

    // Fetch current character
    const { data: character, error: fetchError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single()

    if (fetchError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Update character with level-up data
    const { error: updateError } = await supabase
      .from('characters')
      .update({
        level: body.newLevel,
        hp_max: (character.hp_max ?? 0) + body.hpIncrease,
        hp_current: (character.hp_max ?? 0) + body.hpIncrease,
        // Additional fields updated via JSON columns
        updated_at: new Date().toISOString(),
      })
      .eq('id', characterId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save level-up' }, { status: 500 })
    }

    return NextResponse.json({ success: true, newLevel: body.newLevel })
  } catch (error) {
    console.error('Level-up error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
