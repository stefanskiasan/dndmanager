import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  resolveEarnIncome,
  resolveTreatWounds,
  resolveCrafting,
} from '@dndmanager/pf2e-engine'
import type { DowntimeActivity } from '@dndmanager/pf2e-engine'

interface DowntimePayload {
  activity: DowntimeActivity
  params: Record<string, unknown>
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params
    const body = (await req.json()) as DowntimePayload
    const supabase = await createClient()

    let result
    switch (body.activity) {
      case 'earn-income':
        result = resolveEarnIncome(body.params as any)
        break
      case 'treat-wounds':
        result = resolveTreatWounds(body.params as any)
        break
      case 'craft':
        result = resolveCrafting(body.params as any)
        break
      case 'retrain':
        result = { activity: 'retrain', daysRequired: 7 }
        break
      default:
        return NextResponse.json({ error: 'Unknown activity' }, { status: 400 })
    }

    // Log the downtime activity
    await supabase.from('game_action_log').insert({
      game_state_id: characterId,
      event_type: `downtime:${body.activity}`,
      data: result as unknown as Record<string, unknown>,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Downtime resolution error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
