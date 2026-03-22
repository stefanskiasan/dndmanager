'use client'

import type { LevelUpGains } from '@dndmanager/pf2e-engine'
import { abilityModifier } from '@dndmanager/pf2e-engine'

interface HpStepProps {
  gains: LevelUpGains
  classHitPoints: number
  conScore: number
  onNext: () => void
}

export function HpStep({ gains, classHitPoints, conScore, onNext }: HpStepProps) {
  const conMod = abilityModifier(conScore)
  const sign = conMod >= 0 ? '+' : ''

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Hit Point Increase</h3>
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex justify-between">
          <span>Class Hit Points</span>
          <span className="font-mono">{classHitPoints}</span>
        </div>
        <div className="flex justify-between">
          <span>CON Modifier ({conScore})</span>
          <span className="font-mono">{sign}{conMod}</span>
        </div>
        <hr />
        <div className="flex justify-between font-bold text-lg">
          <span>HP Gained</span>
          <span className="text-green-600">+{gains.hpIncrease}</span>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          Next
        </button>
      </div>
    </div>
  )
}
