import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSessionJournal } from '@dndmanager/ai-services'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await req.json()

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  // Fetch session + verify GM
  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, campaign_id, campaigns!inner(gm_id, settings)')
    .eq('id', sessionId)
    .single()

  if (!session || (session.campaigns as any).gm_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if journal already exists
  const { data: existing } = await supabase
    .from('session_journals')
    .select('id')
    .eq('session_id', sessionId)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Journal already exists for this session' },
      { status: 409 }
    )
  }

  // Fetch action log via game_state
  const { data: gameState } = await supabase
    .from('game_state')
    .select('id')
    .eq('session_id', sessionId)
    .single()

  if (!gameState) {
    return NextResponse.json({ error: 'No game state found' }, { status: 404 })
  }

  const { data: actionLog } = await supabase
    .from('game_action_log')
    .select('event_type, data, created_at')
    .eq('game_state_id', gameState.id)
    .order('created_at', { ascending: true })

  if (!actionLog || actionLog.length === 0) {
    return NextResponse.json({ error: 'No action log entries' }, { status: 404 })
  }

  // Fetch party member names
  const { data: characters } = await supabase
    .from('characters')
    .select('name')
    .eq('campaign_id', session.campaign_id)

  const partyMembers = characters?.map((c) => c.name) ?? []

  try {
    const journal = await generateSessionJournal({
      sessionId,
      campaignId: session.campaign_id,
      sessionName: session.name,
      actionLog: actionLog.map((entry) => ({
        eventType: entry.event_type,
        data: entry.data as Record<string, unknown>,
        createdAt: entry.created_at,
      })),
      partyMembers,
    })

    // Persist to database
    const { data: saved, error } = await supabase
      .from('session_journals')
      .insert({
        session_id: journal.sessionId,
        campaign_id: journal.campaignId,
        title: journal.title,
        narrative: journal.narrative,
        highlights: journal.highlights,
        combat_summary: journal.combatSummary ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save journal:', error)
      return NextResponse.json({ error: 'Failed to save journal' }, { status: 500 })
    }

    return NextResponse.json(saved)
  } catch (err) {
    console.error('Journal generation error:', err)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
