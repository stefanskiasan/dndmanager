'use client'

import { useGameStore } from '@/lib/stores/game-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TurnControls() {
  const mode = useGameStore((s) => s.mode)
  const turn = useGameStore((s) => s.turn)
  const tokens = useGameStore((s) => s.tokens)
  const turnOrder = useGameStore((s) => s.turnOrder)
  const round = useGameStore((s) => s.round)

  if (mode !== 'encounter' || !turn) return null

  const currentToken = tokens.find((t) => t.id === turn.currentTokenId)

  function handleNextTurn() {
    const store = useGameStore.getState()
    const currentIdx = turnOrder.indexOf(turn!.currentTokenId)
    let nextIdx = currentIdx + 1
    let newRound = round

    if (nextIdx >= turnOrder.length) {
      nextIdx = 0
      newRound += 1
      store.setRound(newRound)
    }

    const nextTokenId = turnOrder[nextIdx]
    store.setTurn({
      currentTokenId: nextTokenId,
      actionsRemaining: 3,
      reactionAvailable: true,
      actionsUsed: [],
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Turn-Steuerung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <p className="text-neutral-400">Runde: <span className="text-neutral-200">{round}</span></p>
          <p className="text-neutral-400">
            Am Zug: <span className="font-medium text-amber-400">{currentToken?.name ?? 'Unbekannt'}</span>
          </p>
          <p className="text-neutral-400">
            Aktionen: <span className="text-neutral-200">{turn.actionsRemaining}/3</span>
          </p>
        </div>
        <Button onClick={handleNextTurn} className="w-full">
          Naechster Turn
        </Button>
      </CardContent>
    </Card>
  )
}
