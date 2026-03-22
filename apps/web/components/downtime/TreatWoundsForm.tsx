'use client'

import { useState } from 'react'
import type { ProficiencyRank } from '@dndmanager/pf2e-engine'

interface TreatWoundsFormProps {
  onResult: (result: Record<string, unknown>) => void
}

const PROFICIENCY_OPTIONS: { value: ProficiencyRank; label: string }[] = [
  { value: 'trained', label: 'Trained (DC 15)' },
  { value: 'expert', label: 'Expert (DC 20)' },
  { value: 'master', label: 'Master (DC 30)' },
  { value: 'legendary', label: 'Legendary (DC 40)' },
]

export function TreatWoundsForm({ onResult }: TreatWoundsFormProps) {
  const [proficiency, setProficiency] = useState<ProficiencyRank>('trained')
  const [medicineBonus, setMedicineBonus] = useState(5)
  const [rolling, setRolling] = useState(false)

  async function handleRoll() {
    setRolling(true)
    const naturalRoll = Math.floor(Math.random() * 20) + 1

    try {
      const res = await fetch('/api/characters/placeholder/downtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity: 'treat-wounds',
          params: { naturalRoll, medicineBonus, proficiency },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onResult(data)
      }
    } catch {
      // Handle error silently
    } finally {
      setRolling(false)
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="font-semibold">Treat Wounds</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm">Proficiency</span>
          <select
            value={proficiency}
            onChange={(e) => setProficiency(e.target.value as ProficiencyRank)}
            className="w-full rounded border px-2 py-1.5 text-sm"
          >
            {PROFICIENCY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm">Medicine Bonus</span>
          <input
            type="number"
            value={medicineBonus}
            onChange={(e) => setMedicineBonus(Number(e.target.value))}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <button
        onClick={handleRoll}
        disabled={rolling}
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {rolling ? 'Rolling...' : 'Roll'}
      </button>
    </div>
  )
}
