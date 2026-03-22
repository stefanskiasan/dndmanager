'use client'

import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { subscribeToGameState } from '@/lib/sync/game-sync'
import { loadGameState } from '@/lib/sync/game-actions'
import { useGameStore } from '@/lib/stores/game-store'
import type { Token, ActiveCondition } from '@dndmanager/game-runtime'

interface GameSyncProviderProps {
  sessionId: string
  children: React.ReactNode
}

export function GameSyncProvider({ sessionId, children }: GameSyncProviderProps) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [gameStateId, setGameStateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      try {
        const result = await loadGameState(supabase, sessionId)
        if (!result) {
          setError('Kein Spielzustand fuer diese Session gefunden')
          setLoading(false)
          return
        }

        const { state, tokens } = result
        setGameStateId(state.id)

        // Hydrate Zustand store
        const store = useGameStore.getState()
        store.setMode(state.mode)
        store.setRound(state.round)
        store.setTokens(
          tokens.map((t) => ({
            id: t.id,
            name: t.name,
            type: t.token_type as Token['type'],
            ownerId: t.owner_id ?? 'gm',
            position: { x: t.position_x, y: t.position_y },
            speed: t.speed,
            hp: { current: t.hp_current, max: t.hp_max, temp: t.hp_temp },
            ac: t.ac,
            conditions: (t.conditions ?? []) as ActiveCondition[],
            visible: t.visible,
          }))
        )

        if (state.current_token_id) {
          store.setTurn({
            currentTokenId: state.current_token_id,
            actionsRemaining: state.actions_remaining,
            reactionAvailable: state.reaction_available,
            actionsUsed: [],
          })
        }

        // Subscribe to Realtime
        channelRef.current = subscribeToGameState(supabase, state.id)
        setLoading(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
        setLoading(false)
      }
    }

    init()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <p className="text-neutral-400">Spielzustand wird geladen...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return <>{children}</>
}
