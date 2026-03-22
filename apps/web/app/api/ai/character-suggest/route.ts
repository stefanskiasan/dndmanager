import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { suggestCharacter } from '@dndmanager/ai-services'
import type { CharacterSuggestionRequest } from '@dndmanager/ai-services'

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse request body
  let body: CharacterSuggestionRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  // Validate concept text
  if (!body.concept || body.concept.trim().length < 10) {
    return NextResponse.json(
      { error: 'Concept must be at least 10 characters long' },
      { status: 400 }
    )
  }

  if (body.concept.length > 2000) {
    return NextResponse.json(
      { error: 'Concept must be under 2000 characters' },
      { status: 400 }
    )
  }

  // Call AI service
  try {
    const suggestion = await suggestCharacter({
      concept: body.concept.trim(),
      level: body.level ?? 1,
      campaignSetting: body.campaignSetting,
    })

    return NextResponse.json(suggestion)
  } catch (error) {
    console.error('AI suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to generate character suggestions. Please try again.' },
      { status: 500 }
    )
  }
}
