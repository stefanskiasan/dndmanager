'use client'

import { useGameStore } from '@/lib/stores/game-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function EncounterPanel() {
  const mode = useGameStore((s) => s.mode)
  const tokens = useGameStore((s) => s.tokens)
  const setMode = useGameStore((s) => s.setMode)

  function handleStartEncounter() {
    setMode('encounter')
    // Auto-roll initiative for all tokens
    const initiatives = tokens.map((t) => ({
      tokenId: t.id,
      roll: Math.floor(Math.random() * 20) + 1,
      modifier: 0,
      total: Math.floor(Math.random() * 20) + 1,
    }))
    const sorted = [...initiatives].sort((a, b) => b.total - a.total)
    useGameStore.getState().setInitiative(sorted, sorted.map((e) => e.tokenId))
    useGameStore.getState().setRound(1)
    if (sorted.length > 0) {
      useGameStore.getState().setTurn({
        currentTokenId: sorted[0].tokenId,
        actionsRemaining: 3,
        reactionAvailable: true,
        actionsUsed: [],
      })
    }
  }

  function handleEndEncounter() {
    setMode('exploration')
    useGameStore.getState().setTurn(null)
    useGameStore.getState().setRound(0)
    useGameStore.getState().setInitiative([], [])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Encounter</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-neutral-400">
          Modus: <span className="font-medium text-neutral-200">{mode}</span>
        </p>
        {mode === 'exploration' ? (
          <Button onClick={handleStartEncounter} className="w-full" disabled={tokens.length === 0}>
            Encounter starten
          </Button>
        ) : (
          <Button onClick={handleEndEncounter} variant="destructive" className="w-full">
            Encounter beenden
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
