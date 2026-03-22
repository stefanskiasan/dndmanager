'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AbilityId } from '@dndmanager/pf2e-engine'

const ABILITY_LABELS: Record<AbilityId, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
}

interface ReviewStepProps {
  ancestry: string
  class_: string
  background: string
  skills: string[]
  abilityScores: Record<AbilityId, number>
  nameSuggestions?: string[]
  saving: boolean
  onSave: (name: string) => void
  onBack: () => void
}

export function ReviewStep({
  ancestry,
  class_,
  background,
  skills,
  abilityScores,
  nameSuggestions,
  saving,
  onSave,
  onBack,
}: ReviewStepProps) {
  const [name, setName] = useState('')

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Zusammenfassung</h2>

      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Abstammung</span>
          <span className="text-white font-medium">{ancestry}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Klasse</span>
          <span className="text-white font-medium">{class_}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Hintergrund</span>
          <span className="text-white font-medium">{background}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Fertigkeiten</span>
          <span className="text-white font-medium">{skills.join(', ')}</span>
        </div>
        <div className="border-t border-neutral-700 pt-2">
          <div className="grid grid-cols-6 gap-2 text-center">
            {(Object.keys(ABILITY_LABELS) as AbilityId[]).map((id) => (
              <div key={id}>
                <div className="text-xs text-neutral-500">{ABILITY_LABELS[id]}</div>
                <div className="text-sm font-mono text-white">{abilityScores[id]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="charName">Charaktername</Label>
        <Input
          id="charName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Thorin Eisenschild"
          required
        />
        {nameSuggestions && nameSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-neutral-500">Vorschlaege:</span>
            {nameSuggestions.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setName(n)}
                className="rounded bg-neutral-700 px-2 py-0.5 text-xs text-neutral-300 hover:bg-neutral-600"
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Zurueck
        </Button>
        <Button
          onClick={() => onSave(name)}
          disabled={!name.trim() || saving}
          className="flex-1"
        >
          {saving ? 'Speichern...' : 'Charakter erstellen'}
        </Button>
      </div>
    </div>
  )
}
