'use client'

import type { LevelUpGains } from '@dndmanager/pf2e-engine'
import { useLevelUpStore } from '@/lib/stores/level-up-store'

const PF2E_SKILLS = [
  'Acrobatics', 'Arcana', 'Athletics', 'Crafting', 'Deception',
  'Diplomacy', 'Intimidation', 'Lore', 'Medicine', 'Nature',
  'Occultism', 'Performance', 'Religion', 'Society', 'Stealth',
  'Survival', 'Thievery',
]

interface SkillIncreaseStepProps {
  gains: LevelUpGains
  onNext: () => void
  onBack: () => void
}

export function SkillIncreaseStep({ gains, onNext, onBack }: SkillIncreaseStepProps) {
  const { selectedSkillIncreases, addSkillIncrease, removeSkillIncrease } = useLevelUpStore()

  const maxIncreases = gains.skillIncreases
  const canSelectMore = selectedSkillIncreases.length < maxIncreases

  function toggleSkill(skill: string) {
    if (selectedSkillIncreases.includes(skill)) {
      removeSkillIncrease(skill)
    } else if (canSelectMore) {
      addSkillIncrease(skill)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Skill Increases</h3>
      <p className="text-sm text-muted-foreground">
        Select {maxIncreases} skill{maxIncreases !== 1 ? 's' : ''} to increase in proficiency rank.
      </p>
      <p className="text-sm font-medium">
        {selectedSkillIncreases.length} / {maxIncreases} selected
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PF2E_SKILLS.map((skill) => {
          const isSelected = selectedSkillIncreases.includes(skill)
          return (
            <button
              key={skill}
              onClick={() => toggleSkill(skill)}
              disabled={!isSelected && !canSelectMore}
              className={`rounded border px-3 py-2 text-sm text-left transition ${
                isSelected
                  ? 'border-primary bg-primary/10 font-medium'
                  : 'border-muted hover:border-primary/50'
              } disabled:opacity-50`}
            >
              {skill}
            </button>
          )
        })}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="rounded border px-4 py-2 hover:bg-muted"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={selectedSkillIncreases.length !== maxIncreases}
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
