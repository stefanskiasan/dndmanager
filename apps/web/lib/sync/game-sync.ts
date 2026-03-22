import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '../types/database.js'
import type { GameTokenRow, GameStateRow } from './types.js'
import { useGameStore } from '../stores/game-store.js'
import type { Token } from '@dndmanager/game-runtime'

type Client = SupabaseClient<Database>

function tokenRowToToken(row: GameTokenRow): Token {
  return {
    id: row.id,
    name: row.name,
    type: row.token_type as Token['type'],
    ownerId: row.owner_id ?? 'gm',
    position: { x: row.position_x, y: row.position_y },
    speed: row.speed,
    hp: { current: row.hp_current, max: row.hp_max, temp: row.hp_temp },
    ac: row.ac,
    conditions: (row.conditions ?? []) as Token['conditions'],
    visible: row.visible,
  }
}

export function subscribeToGameState(
  supabase: Client,
  gameStateId: string
): RealtimeChannel {
  const channel = supabase.channel(`game:${gameStateId}`)

  // Subscribe to game_state changes
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'game_state',
      filter: `id=eq.${gameStateId}`,
    },
    (payload) => {
      const row = payload.new as GameStateRow
      if (!row) return
      const store = useGameStore.getState()
      store.setMode(row.mode)
      store.setRound(row.round)
      if (row.current_token_id) {
        store.setTurn({
          currentTokenId: row.current_token_id,
          actionsRemaining: row.actions_remaining,
          reactionAvailable: row.reaction_available,
          actionsUsed: [],
        })
      } else {
        store.setTurn(null)
      }
    }
  )

  // Subscribe to game_tokens changes
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'game_tokens',
      filter: `game_state_id=eq.${gameStateId}`,
    },
    (payload) => {
      const store = useGameStore.getState()
      const tokens = [...store.tokens]

      if (payload.eventType === 'INSERT') {
        const newToken = tokenRowToToken(payload.new as GameTokenRow)
        if (!tokens.find((t) => t.id === newToken.id)) {
          store.setTokens([...tokens, newToken])
        }
      } else if (payload.eventType === 'UPDATE') {
        const updated = tokenRowToToken(payload.new as GameTokenRow)
        store.setTokens(tokens.map((t) => t.id === updated.id ? updated : t))
      } else if (payload.eventType === 'DELETE') {
        const old = payload.old as { id?: string }
        if (old.id) {
          store.setTokens(tokens.filter((t) => t.id !== old.id))
        }
      }
    }
  )

  // Subscribe to initiative changes
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'game_initiative',
      filter: `game_state_id=eq.${gameStateId}`,
    },
    (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        // Re-fetch all initiative for this game to get sorted order
        supabase
          .from('game_initiative')
          .select('*')
          .eq('game_state_id', gameStateId)
          .order('sort_order')
          .then(({ data }) => {
            if (data) {
              const store = useGameStore.getState()
              store.setInitiative(
                data.map((d) => ({
                  tokenId: d.token_id,
                  roll: d.roll,
                  modifier: d.modifier,
                  total: d.total,
                })),
                data.map((d) => d.token_id)
              )
            }
          })
      }
    }
  )

  channel.subscribe()

  return channel
}
