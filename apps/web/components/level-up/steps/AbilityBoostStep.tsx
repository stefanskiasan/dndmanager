'use client'

import type { LevelUpGains, AbilityId } from '@dndmanager/pf2e-engine'
import { applyBoost, abilityModifier } from '@dndmanager/pf2e-engine'
import { useLevelUpStore } from '@/lib/stores/level-up-store'

const ABILITIES: { id: AbilityId; label: string }[] = [
  { id: 'str', label: 'Strength' },
  { id: 'dex', label: 'Dexterity' },
  { id: 'con', label: 'Constitution' },
  { id: 'int', label: 'Intelligence' },
  { id: 'wis', label: 'Wisdom' },
  { id: 'cha', label: 'Charisma' },
]

interface AbilityBoostStepProps {
  gains: LevelUpGains
  onNext: () => void
  onBack: () => void
}

export function AbilityBoostStep({ gains, onNext, onBack }: AbilityBoostStepProps) {
  const { selectedAbilityBoosts, addAbilityBoost, removeAbilityBoost } = useLevelUpStore()

  const maxBoosts = gains.abilityBoosts
  const canSelectMore = selectedAbilityBoosts.length < maxBoosts

  function toggleBoost(ability: AbilityId) {
    if (selectedAbilityBoosts.includes(ability)) {
      removeAbilityBoost(ability)
    } else if (canSelectMore) {
      addAbilityBoost(ability)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Ability Boosts</h3>
      <p className="text-sm text-muted-foreground">
        Select {maxBoosts} ability scores to boost. You cannot boost the same ability twice.
      </p>
      <p className="text-sm font-medium">
        {selectedAbilityBoosts.length} / {maxBoosts} selected
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ABILITIES.map(({ id, label }) => {
          const isSelected = selectedAbilityBoosts.includes(id)
          // Placeholder: current score would come from character data
          const currentScore = 10
          const newScore = isSelected ? applyBoost(currentScore) : currentScore
          const currentMod = abilityModifier(currentScore)
          const newMod = abilityModifier(newScore)

          return (
            <button
              key={id}
              onClick={() => toggleBoost(id)}
              disabled={!isSelected && !canSelectMore}
              className={`rounded-lg border p-3 text-left transition ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-muted hover:border-primary/50'
              } disabled:opacity-50`}
            >
              <div className="font-semibold">{label}</div>
              <div className="text-sm text-muted-foreground">
                {currentScore} {isSelected && `-> ${newScore}`}
              </div>
              <div className="text-xs text-muted-foreground">
                Mod: {currentMod >= 0 ? '+' : ''}{currentMod}
                {isSelected && ` -> ${newMod >= 0 ? '+' : ''}${newMod}`}
              </div>
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
          disabled={selectedAbilityBoosts.length !== maxBoosts}
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
