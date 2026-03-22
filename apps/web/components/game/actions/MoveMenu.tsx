'use client'

import { ActionButton } from './ActionButton'
import { useGameStore } from '@/lib/stores/game-store'

interface MoveMenuProps {
  onStride: () => void
  onStep: () => void
  onBack: () => void
}

export function MoveMenu({ onStride, onStep, onBack }: MoveMenuProps) {
  const turn = useGameStore((s) => s.turn)
  const selectedTokenId = useGameStore((s) => s.selectedTokenId)
  const tokens = useGameStore((s) => s.tokens)

  const selectedToken = tokens.find((t) => t.id === selectedTokenId)
  const speed = selectedToken?.speed ?? 25

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">Bewegung</h3>
        <button onClick={onBack} className="text-xs text-neutral-500 hover:text-neutral-300">
          Zurueck
        </button>
      </div>

      <div className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-400">
        Geschwindigkeit: {speed} ft
      </div>

      <div className="space-y-1">
        <ActionButton
          label="Stride"
          description={`Bewege dich bis zu ${speed} ft`}
          variant="move"
          disabled={!turn || turn.actionsRemaining <= 0}
          onClick={onStride}
        />
        <ActionButton
          label="Step"
          description="Bewege dich 5 ft ohne Reaktionen auszuloesen"
          variant="move"
          disabled={!turn || turn.actionsRemaining <= 0}
          onClick={onStep}
        />
      </div>
    </div>
  )
}
