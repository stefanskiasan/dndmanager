'use client'

import { useMemo } from 'react'
import { ActionButton } from './ActionButton'
import { useGameStore } from '@/lib/stores/game-store'
import { multipleAttackPenalty } from '@dndmanager/pf2e-engine'

interface Weapon {
  name: string
  attackBonus: number
  damage: string
  damageType: string
  agile: boolean
  reach: number
  traits: string[]
}

// Placeholder weapons until character system is full
const DEFAULT_WEAPONS: Weapon[] = [
  { name: 'Longsword', attackBonus: 12, damage: '1d8+4', damageType: 'slashing', agile: false, reach: 5, traits: ['versatile P'] },
  { name: 'Dagger', attackBonus: 12, damage: '1d4+4', damageType: 'piercing', agile: true, reach: 5, traits: ['agile', 'finesse', 'thrown 10'] },
  { name: 'Shortbow', attackBonus: 10, damage: '1d6', damageType: 'piercing', agile: false, reach: 60, traits: ['deadly d10'] },
]

interface StrikeMenuProps {
  onStrike: (weapon: Weapon, attackNumber: 1 | 2 | 3) => void
  onBack: () => void
}

export function StrikeMenu({ onStrike, onBack }: StrikeMenuProps) {
  const turn = useGameStore((s) => s.turn)
  const actionsUsed = turn?.actionsUsed ?? []

  const attackNumber = useMemo(() => {
    const strikes = actionsUsed.filter((a) => a.type === 'strike').length
    return Math.min(strikes + 1, 3) as 1 | 2 | 3
  }, [actionsUsed])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">Strike</h3>
        <button onClick={onBack} className="text-xs text-neutral-500 hover:text-neutral-300">
          Zurueck
        </button>
      </div>

      {attackNumber > 1 && (
        <div className="rounded bg-neutral-800 px-2 py-1 text-xs text-amber-400">
          {attackNumber}. Angriff (MAP)
        </div>
      )}

      <div className="space-y-1">
        {DEFAULT_WEAPONS.map((weapon) => {
          const map = multipleAttackPenalty(attackNumber, weapon.agile)
          const totalBonus = weapon.attackBonus + map

          return (
            <ActionButton
              key={weapon.name}
              label={weapon.name}
              description={`${weapon.damage} ${weapon.damageType} • ${weapon.traits.join(', ')}`}
              bonus={totalBonus}
              variant="strike"
              disabled={!turn || turn.actionsRemaining <= 0}
              onClick={() => onStrike(weapon, attackNumber)}
            />
          )
        })}
      </div>
    </div>
  )
}
