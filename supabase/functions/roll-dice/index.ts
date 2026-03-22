import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

interface RollRequest {
  count: number
  sides: number
  modifier?: number
  gameStateId?: string
  purpose?: string
}

serve(async (req) => {
  try {
    const { count, sides, modifier = 0, gameStateId, purpose } = await req.json() as RollRequest

    if (count < 1 || count > 100 || sides < 1 || sides > 100) {
      return new Response(JSON.stringify({ error: 'Invalid dice parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Server-side random (crypto-secure)
    const rolls: number[] = []
    for (let i = 0; i < count; i++) {
      const array = new Uint32Array(1)
      crypto.getRandomValues(array)
      rolls.push((array[0] % sides) + 1)
    }

    const total = rolls.reduce((a, b) => a + b, 0) + modifier

    // Optionally log to game action log
    if (gameStateId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      await supabase.from('game_action_log').insert({
        game_state_id: gameStateId,
        event_type: 'dice_roll',
        data: { rolls, modifier, total, sides, count, purpose },
      })
    }

    return new Response(JSON.stringify({ rolls, modifier, total }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
