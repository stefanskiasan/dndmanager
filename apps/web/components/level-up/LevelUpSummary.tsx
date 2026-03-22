'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LevelUpGains } from '@dndmanager/pf2e-engine'
import { useLevelUpStore } from '@/lib/stores/level-up-store'

interface LevelUpSummaryProps {
  gains: LevelUpGains
  characterId: string
  newLevel: number
  onBack: () => void
}

export function LevelUpSummary({ gains, characterId, newLevel, onBack }: LevelUpSummaryProps) {
  const router = useRouter()
  const {
    selectedAbilityBoosts,
    selectedSkillIncreases,
    selectedFeats,
    selectedSpells,
    reset,
  } = useLevelUpStore()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/characters/${characterId}/level-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newLevel,
          hpIncrease: gains.hpIncrease,
          abilityBoosts: selectedAbilityBoosts,
          skillIncreases: selectedSkillIncreases,
          feats: Object.entries(selectedFeats).map(([slot, name]) => ({ slot, name })),
          spells: selectedSpells.length > 0 ? selectedSpells : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save level-up')
      }

      reset()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Level-Up Summary</h3>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex justify-between">
          <span className="font-medium">New Level</span>
          <span>{newLevel}</span>
        </div>

        <div className="flex justify-between">
          <span className="font-medium">HP Increase</span>
          <span className="text-green-600">+{gains.hpIncrease}</span>
        </div>

        {selectedAbilityBoosts.length > 0 && (
          <div>
            <span className="font-medium">Ability Boosts: </span>
            <span className="uppercase">{selectedAbilityBoosts.join(', ')}</span>
          </div>
        )}

        {selectedSkillIncreases.length > 0 && (
          <div>
            <span className="font-medium">Skill Increases: </span>
            <span>{selectedSkillIncreases.join(', ')}</span>
          </div>
        )}

        {Object.keys(selectedFeats).length > 0 && (
          <div>
            <span className="font-medium">Feats: </span>
            <ul className="ml-4 list-disc text-sm">
              {Object.entries(selectedFeats).map(([slot, name]) => (
                <li key={slot}>
                  <span className="capitalize">{slot.replace('-', ' ')}</span>: {name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedSpells.length > 0 && (
          <div>
            <span className="font-medium">Spells: </span>
            <span>{selectedSpells.join(', ')}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded border px-4 py-2 hover:bg-muted">
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Confirm Level-Up'}
        </button>
      </div>
    </div>
  )
}
