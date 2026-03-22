'use client'

import { ActionButton } from './ActionButton'
import { useGameStore } from '@/lib/stores/game-store'
import type { SpellDefinition } from '@dndmanager/pf2e-engine'

// Placeholder spells until data import
const PLACEHOLDER_SPELLS: (SpellDefinition & { slotLevel: number; slotsRemaining: number })[] = [
  {
    id: 'magic-missile',
    name: 'Magic Missile',
    level: 1,
    traditions: ['arcane', 'occult'],
    components: ['somatic', 'verbal'],
    castActions: 2,
    range: 120,
    damage: { formula: '1d4+1', type: 'force' },
    description: 'Unfehlbares Kraftgeschoss',
    slotLevel: 1,
    slotsRemaining: 2,
  },
  {
    id: 'fireball',
    name: 'Fireball',
    level: 3,
    traditions: ['arcane', 'primal'],
    components: ['somatic', 'verbal'],
    castActions: 2,
    range: 500,
    area: { type: 'burst', size: 20 },
    save: { type: 'reflex', basic: true },
    damage: { formula: '6d6', type: 'fire', heightenedPerLevel: '2d6' },
    description: 'Feuerexplosion',
    slotLevel: 3,
    slotsRemaining: 1,
  },
  {
    id: 'heal',
    name: 'Heal',
    level: 1,
    traditions: ['divine', 'primal'],
    components: ['somatic', 'verbal'],
    castActions: 2,
    range: 30,
    damage: { formula: '1d8', type: 'positive' },
    description: 'Heilt Verbundete',
    slotLevel: 1,
    slotsRemaining: 2,
  },
]

interface SpellMenuProps {
  onCast: (spell: SpellDefinition) => void
  onBack: () => void
}

export function SpellMenu({ onCast, onBack }: SpellMenuProps) {
  const turn = useGameStore((s) => s.turn)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">Zauber</h3>
        <button onClick={onBack} className="text-xs text-neutral-500 hover:text-neutral-300">
          Zurueck
        </button>
      </div>

      <div className="space-y-1">
        {PLACEHOLDER_SPELLS.map((spell) => (
          <ActionButton
            key={spell.id}
            label={spell.name}
            description={`Level ${spell.level} • ${spell.damage?.formula ?? ''} ${spell.damage?.type ?? ''} • ${spell.slotsRemaining} Slots`}
            cost={typeof spell.castActions === 'number' ? spell.castActions : 1}
            variant="spell"
            disabled={
              !turn ||
              turn.actionsRemaining < (typeof spell.castActions === 'number' ? spell.castActions : 1) ||
              spell.slotsRemaining <= 0
            }
            onClick={() => onCast(spell)}
          />
        ))}
      </div>
    </div>
  )
}
