'use client'

import { useGameStore } from '@/lib/stores/game-store'
import { ActionMenu } from './actions/ActionMenu'

export function InitiativeBar() {
  const mode = useGameStore((s) => s.mode)
  const turnOrder = useGameStore((s) => s.turnOrder)
  const tokens = useGameStore((s) => s.tokens)
  const turn = useGameStore((s) => s.turn)
  const round = useGameStore((s) => s.round)

  if (mode !== 'encounter') return null

  return (
    <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center gap-2 bg-neutral-900/80 px-4 py-2 backdrop-blur-sm">
      <span className="mr-4 text-sm text-neutral-400">Runde {round}</span>
      {turnOrder.map((tokenId) => {
        const token = tokens.find((t) => t.id === tokenId)
        if (!token) return null
        const isActive = turn?.currentTokenId === tokenId

        return (
          <div
            key={tokenId}
            className={`rounded px-3 py-1 text-sm font-medium ${
              isActive
                ? 'bg-amber-500 text-neutral-900'
                : token.type === 'player'
                  ? 'bg-blue-900 text-blue-200'
                  : 'bg-red-900 text-red-200'
            }`}
          >
            {token.name}
          </div>
        )
      })}
    </div>
  )
}

export function ActionBar() {
  const mode = useGameStore((s) => s.mode)
  const turn = useGameStore((s) => s.turn)

  if (mode !== 'encounter' || !turn) return null

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-neutral-900/80 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <ActionMenu />
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full ${
                  i <= turn.actionsRemaining
                    ? 'bg-amber-400'
                    : 'bg-neutral-600'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-neutral-400">
            {turn.actionsRemaining}/3 Aktionen
          </span>
          <div
            className={`h-4 w-4 rounded-full ${
              turn.reactionAvailable ? 'bg-cyan-400' : 'bg-neutral-600'
            }`}
            title="Reaction"
          />
        </div>
      </div>
    </div>
  )
}

export function UIOverlay() {
  return (
    <>
      <InitiativeBar />
      <ActionBar />
    </>
  )
}
