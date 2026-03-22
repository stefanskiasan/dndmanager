'use client'

import type { LevelUpGains } from '@dndmanager/pf2e-engine'
import { useLevelUpStore } from '@/lib/stores/level-up-store'
import { useState } from 'react'

interface SpellStepProps {
  gains: LevelUpGains
  onNext: () => void
  onBack: () => void
}

export function SpellStep({ gains, onNext, onBack }: SpellStepProps) {
  const { selectedSpells, addSpell, removeSpell } = useLevelUpStore()
  const [spellInput, setSpellInput] = useState('')

  const spellSlots = gains.spellSlotGains ?? []

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Spell Selection</h3>

      {spellSlots.length > 0 ? (
        <div className="space-y-3">
          <div className="rounded-lg border p-3">
            <h4 className="font-medium mb-2">New Spell Slots</h4>
            {spellSlots.map((slot) => (
              <div key={slot.spellLevel} className="text-sm">
                Level {slot.spellLevel}: +{slot.count} slot{slot.count !== 1 ? 's' : ''}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No new spell slots at this level.</p>
      )}

      <div className="space-y-2">
        <h4 className="font-medium">Add Spells</h4>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter spell name..."
            value={spellInput}
            onChange={(e) => setSpellInput(e.target.value)}
            className="flex-1 rounded border px-2 py-1 text-sm"
          />
          <button
            onClick={() => {
              if (spellInput.trim()) {
                addSpell(spellInput.trim())
                setSpellInput('')
              }
            }}
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
          >
            Add
          </button>
        </div>

        {selectedSpells.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedSpells.map((spell) => (
              <span
                key={spell}
                className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
              >
                {spell}
                <button
                  onClick={() => removeSpell(spell)}
                  className="text-xs text-destructive hover:underline ml-1"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded border px-4 py-2 hover:bg-muted">
          Back
        </button>
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
