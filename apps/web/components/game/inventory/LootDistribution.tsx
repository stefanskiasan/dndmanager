'use client'

import { useState, useMemo } from 'react'
import type { Currency, ItemCategory } from '@dndmanager/pf2e-engine'
import {
  generateEncounterLoot, formatCurrency, fromCopper, toCopper,
  type EncounterDifficulty, type LootRollResult, type LootItemStub,
} from '@dndmanager/pf2e-engine'
import { CurrencyDisplay } from './CurrencyDisplay'

interface Character {
  id: string
  name: string
}

interface LootDistributionProps {
  partyLevel: number
  partyMembers: Character[]
  onDistribute: (assignments: LootAssignment[]) => void
  onClose: () => void
}

export interface LootAssignment {
  characterId: string
  items: LootItemStub[]
  currency: Currency
}

export function LootDistribution({
  partyLevel,
  partyMembers,
  onDistribute,
  onClose,
}: LootDistributionProps) {
  const [difficulty, setDifficulty] = useState<EncounterDifficulty>('moderate')
  const [loot, setLoot] = useState<LootRollResult | null>(null)
  const [itemAssignments, setItemAssignments] = useState<Record<number, string>>({})
  const [splitGold, setSplitGold] = useState(true)

  const handleGenerate = () => {
    const result = generateEncounterLoot({
      partyLevel,
      difficulty,
      partySize: partyMembers.length,
    })
    setLoot(result)
    setItemAssignments({})
  }

  const handleDistribute = () => {
    if (!loot) return

    const assignments: LootAssignment[] = partyMembers.map((char) => ({
      characterId: char.id,
      items: [],
      currency: { pp: 0, gp: 0, sp: 0, cp: 0 },
    }))

    // Assign items
    loot.items.forEach((item, idx) => {
      const charId = itemAssignments[idx]
      if (charId) {
        const assignment = assignments.find((a) => a.characterId === charId)
        if (assignment) assignment.items.push(item)
      }
    })

    // Split or assign currency
    if (splitGold) {
      const totalCp = toCopper(loot.currency)
      const perCharCp = Math.floor(totalCp / partyMembers.length)
      const remainder = totalCp - perCharCp * partyMembers.length

      assignments.forEach((a, idx) => {
        const extra = idx === 0 ? remainder : 0
        a.currency = fromCopper(perCharCp + extra)
      })
    }

    onDistribute(assignments)
  }

  const difficulties: EncounterDifficulty[] = ['trivial', 'low', 'moderate', 'severe', 'extreme']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl rounded-lg bg-neutral-900 p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-200">Beute verteilen</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300"
          >
            Schliessen
          </button>
        </div>

        {/* Difficulty Selector */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-neutral-400">Schwierigkeit:</span>
          {difficulties.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded px-3 py-1 text-xs capitalize ${
                difficulty === d
                  ? 'bg-amber-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          className="mb-4 rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
        >
          Beute wuerfeln (Level {partyLevel})
        </button>

        {/* Loot Results */}
        {loot && (
          <div className="space-y-4">
            {/* Currency */}
            <div className="flex items-center justify-between rounded bg-neutral-800 p-3">
              <div>
                <span className="text-sm text-neutral-300">Muenzen: </span>
                <CurrencyDisplay currency={loot.currency} />
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={splitGold}
                  onChange={(e) => setSplitGold(e.target.checked)}
                  className="rounded"
                />
                Gleichmaessig aufteilen
              </label>
            </div>

            {/* Items */}
            {loot.items.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-neutral-300">Gegenstaende</h3>
                {loot.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded bg-neutral-800 p-2"
                  >
                    <div>
                      <span className="text-sm text-neutral-200">{item.name}</span>
                      <span className="ml-2 text-xs text-neutral-500">
                        Lvl {item.level} • {item.category} • {item.valueGp} gp
                      </span>
                    </div>
                    <select
                      value={itemAssignments[idx] ?? ''}
                      onChange={(e) =>
                        setItemAssignments((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                      className="rounded bg-neutral-700 px-2 py-1 text-xs text-neutral-200"
                    >
                      <option value="">Nicht zugewiesen</option>
                      {partyMembers.map((char) => (
                        <option key={char.id} value={char.id}>
                          {char.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Distribute Button */}
            <button
              onClick={handleDistribute}
              className="w-full rounded bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-600"
            >
              Beute verteilen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
