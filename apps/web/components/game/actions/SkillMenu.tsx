'use client'

import { ActionButton } from './ActionButton'
import { useGameStore } from '@/lib/stores/game-store'
import { SKILL_ACTIONS } from '@dndmanager/pf2e-engine'

interface SkillMenuProps {
  onUseSkill: (actionId: string) => void
  onBack: () => void
}

// Placeholder skill bonuses until character system
const SKILL_BONUSES: Record<string, number> = {
  athletics: 10,
  intimidation: 8,
  perception: 7,
  varies: 6,
}

export function SkillMenu({ onUseSkill, onBack }: SkillMenuProps) {
  const turn = useGameStore((s) => s.turn)

  const actions = Object.values(SKILL_ACTIONS)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">Fertigkeiten</h3>
        <button onClick={onBack} className="text-xs text-neutral-500 hover:text-neutral-300">
          Zurueck
        </button>
      </div>

      <div className="space-y-1">
        {actions.map((action) => (
          <ActionButton
            key={action.id}
            label={action.name}
            description={`${action.skill} • ${action.traits.join(', ')}`}
            bonus={SKILL_BONUSES[action.skill] ?? 0}
            variant="skill"
            disabled={!turn || turn.actionsRemaining <= 0}
            onClick={() => onUseSkill(action.id)}
          />
        ))}
      </div>
    </div>
  )
}
