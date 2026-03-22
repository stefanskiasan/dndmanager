'use client'

import { useEffect, useState } from 'react'
import type { LevelUpGains } from '@dndmanager/pf2e-engine'
import { useLevelUpStore } from '@/lib/stores/level-up-store'
import { FeatSuggestionCard } from '../FeatSuggestionCard'

interface FeatStepProps {
  gains: LevelUpGains
  className: string
  onNext: () => void
  onBack: () => void
}

export function FeatStep({ gains, className, onNext, onBack }: FeatStepProps) {
  const {
    selectedFeats,
    selectFeat,
    featRecommendations,
    isLoadingRecommendations,
    setFeatRecommendations,
    setLoadingRecommendations,
  } = useLevelUpStore()

  const [featInput, setFeatInput] = useState('')

  // Fetch AI recommendations on mount
  useEffect(() => {
    if (featRecommendations.length > 0 || isLoadingRecommendations) return
    if (gains.featSlots.length === 0) return

    const firstSlot = gains.featSlots[0]

    setLoadingRecommendations(true)
    fetch('/api/ai/feat-recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        character: {
          name: 'Character',
          level: gains.level,
          className,
          ancestry: 'Human',
          background: 'Unknown',
          abilityScores: {},
          currentFeats: [],
          skills: [],
        },
        featType: firstSlot.type,
        maxFeatLevel: firstSlot.level,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.recommendations) {
          setFeatRecommendations(data.recommendations)
        }
      })
      .catch(() => {
        // AI recommendations are optional; fail silently
      })
      .finally(() => setLoadingRecommendations(false))
  }, [gains, className, featRecommendations.length, isLoadingRecommendations, setFeatRecommendations, setLoadingRecommendations])

  const allSlotsSelected = gains.featSlots.every(
    (slot) => selectedFeats[`${slot.type}-${slot.level}`]
  )

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Feat Selection</h3>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Feat slots */}
        <div className="space-y-3">
          {gains.featSlots.map((slot) => {
            const key = `${slot.type}-${slot.level}`
            const selected = selectedFeats[key]

            return (
              <div key={key} className="rounded-lg border p-3 space-y-2">
                <div className="font-medium capitalize">
                  {slot.type} Feat (max level {slot.level})
                </div>
                {selected ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{selected}</span>
                    <button
                      onClick={() => selectFeat(key, '')}
                      className="text-xs text-destructive hover:underline"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter feat name..."
                      value={featInput}
                      onChange={(e) => setFeatInput(e.target.value)}
                      className="flex-1 rounded border px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => {
                        if (featInput.trim()) {
                          selectFeat(key, featInput.trim())
                          setFeatInput('')
                        }
                      }}
                      className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
                    >
                      Set
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* AI Suggestions sidebar */}
        <div className="space-y-3">
          <h4 className="font-medium">AI Suggestions</h4>
          {isLoadingRecommendations && (
            <p className="text-sm text-muted-foreground">Loading recommendations...</p>
          )}
          {featRecommendations.map((rec) => (
            <FeatSuggestionCard
              key={rec.name}
              recommendation={rec}
              onSelect={(name) => {
                const emptySlot = gains.featSlots.find(
                  (s) => !selectedFeats[`${s.type}-${s.level}`] && s.type === rec.type
                )
                if (emptySlot) {
                  selectFeat(`${emptySlot.type}-${emptySlot.level}`, name)
                }
              }}
            />
          ))}
          {!isLoadingRecommendations && featRecommendations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No AI suggestions available. Enter feat names manually.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="rounded border px-4 py-2 hover:bg-muted">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!allSlotsSelected}
          className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
