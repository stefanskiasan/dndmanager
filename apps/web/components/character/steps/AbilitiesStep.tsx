'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AbilityId } from '@dndmanager/pf2e-engine'
import type { AbilityBoostSuggestion } from '@dndmanager/ai-services'

const ABILITY_LABELS: Record<AbilityId, string> = {
  str: 'Staerke (STR)',
  dex: 'Geschicklichkeit (DEX)',
  con: 'Konstitution (CON)',
  int: 'Intelligenz (INT)',
  wis: 'Weisheit (WIS)',
  cha: 'Charisma (CHA)',
}

const BASE_SCORE = 10
const BOOST_VALUE = 2
const FREE_BOOSTS = 4

interface AbilitiesStepProps {
  suggestions: AbilityBoostSuggestion[]
  onConfirm: (scores: Record<AbilityId, number>) => void
  onBack: () => void
}

export function AbilitiesStep({ suggestions, onConfirm, onBack }: AbilitiesStepProps) {
  // Pre-select boosts based on AI suggestion priorities
  const initialBoosts = new Set<AbilityId>(
    suggestions
      .filter((s) => s.priority === 'key' || s.priority === 'high')
      .slice(0, FREE_BOOSTS)
      .map((s) => s.ability)
  )

  const [boosts, setBoosts] = useState<Set<AbilityId>>(initialBoosts)

  function toggleBoost(ability: AbilityId) {
    setBoosts((prev) => {
      const next = new Set(prev)
      if (next.has(ability)) {
        next.delete(ability)
      } else if (next.size < FREE_BOOSTS) {
        next.add(ability)
      }
      return next
    })
  }

  function getScore(ability: AbilityId): number {
    return BASE_SCORE + (boosts.has(ability) ? BOOST_VALUE : 0)
  }

  function getModifier(score: number): string {
    const mod = Math.floor((score - 10) / 2)
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  function handleConfirm() {
    const scores = {} as Record<AbilityId, number>
    for (const id of Object.keys(ABILITY_LABELS) as AbilityId[]) {
      scores[id] = getScore(id)
    }
    onConfirm(scores)
  }

  const priorityLabel: Record<string, string> = {
    key: 'Primaer',
    high: 'Hoch',
    medium: 'Mittel',
    low: 'Niedrig',
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Attributswerte</h2>
        <p className="text-sm text-neutral-400">
          Waehle {FREE_BOOSTS} Attribute fuer freie Boosts (+{BOOST_VALUE}).
          Die KI-Empfehlung ist vorausgewaehlt.
        </p>
      </div>

      <div className="space-y-2">
        {(Object.keys(ABILITY_LABELS) as AbilityId[]).map((ability) => {
          const aiSuggestion = suggestions.find((s) => s.ability === ability)
          const score = getScore(ability)
          const isSelected = boosts.has(ability)

          return (
            <button
              key={ability}
              type="button"
              onClick={() => toggleBoost(ability)}
              className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-neutral-700 bg-neutral-800 hover:border-neutral-500'
              }`}
            >
              <div>
                <span className="text-sm font-medium text-white">
                  {ABILITY_LABELS[ability]}
                </span>
                {aiSuggestion && (
                  <span className="ml-2 text-xs text-neutral-500">
                    KI: {priorityLabel[aiSuggestion.priority]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-neutral-300">{score}</span>
                <span className="text-xs font-mono text-neutral-500">
                  ({getModifier(score)})
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="text-xs text-neutral-500">
        {boosts.size}/{FREE_BOOSTS} Boosts gewaehlt
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Zurueck
        </Button>
        <Button onClick={handleConfirm} disabled={boosts.size !== FREE_BOOSTS} className="flex-1">
          Weiter
        </Button>
      </div>
    </div>
  )
}
