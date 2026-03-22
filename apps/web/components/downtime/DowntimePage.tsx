'use client'

import { useState } from 'react'
import type { DowntimeActivity } from '@dndmanager/pf2e-engine'
import { EarnIncomeForm } from './EarnIncomeForm'
import { TreatWoundsForm } from './TreatWoundsForm'
import { CraftingForm } from './CraftingForm'
import { RetrainingForm } from './RetrainingForm'

const ACTIVITIES: { id: DowntimeActivity; label: string; description: string }[] = [
  { id: 'earn-income', label: 'Earn Income', description: 'Use a trained skill to earn money during downtime.' },
  { id: 'treat-wounds', label: 'Treat Wounds', description: 'Use Medicine to restore HP to a party member.' },
  { id: 'craft', label: 'Craft', description: 'Use Crafting to create or repair an item.' },
  { id: 'retrain', label: 'Retrain', description: 'Replace a feat or skill with a new one.' },
]

export function DowntimePage() {
  const [selectedActivity, setSelectedActivity] = useState<DowntimeActivity | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  function handleResult(res: Record<string, unknown>) {
    setResult(res)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <h2 className="text-2xl font-bold">Downtime Activities</h2>

      {/* Activity selector */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACTIVITIES.map(({ id, label, description }) => (
          <button
            key={id}
            onClick={() => {
              setSelectedActivity(id)
              setResult(null)
            }}
            className={`rounded-lg border p-3 text-left transition ${
              selectedActivity === id
                ? 'border-primary bg-primary/10'
                : 'border-muted hover:border-primary/50'
            }`}
          >
            <div className="font-semibold text-sm">{label}</div>
            <div className="text-xs text-muted-foreground mt-1">{description}</div>
          </button>
        ))}
      </div>

      {/* Activity form */}
      {selectedActivity === 'earn-income' && <EarnIncomeForm onResult={handleResult} />}
      {selectedActivity === 'treat-wounds' && <TreatWoundsForm onResult={handleResult} />}
      {selectedActivity === 'craft' && <CraftingForm onResult={handleResult} />}
      {selectedActivity === 'retrain' && <RetrainingForm onResult={handleResult} />}

      {/* Result display */}
      {result && (
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold">Result</h3>
          {'degree' in result && (
            <div className={`text-sm font-medium capitalize ${
              result.degree === 'critical-success' ? 'text-green-600' :
              result.degree === 'success' ? 'text-blue-600' :
              result.degree === 'failure' ? 'text-amber-600' :
              'text-red-600'
            }`}>
              {(result.degree as string).replace('-', ' ')}
            </div>
          )}
          {'earned' in result && (
            <div className="text-sm">
              Earned: {(result.earned as any).gp ?? 0} gp, {(result.earned as any).sp ?? 0} sp
            </div>
          )}
          {'hpRestored' in result && (
            <div className="text-sm">
              {(result.hpRestored as number) >= 0
                ? `HP Restored: ${result.hpRestored}`
                : `Damage Dealt: ${Math.abs(result.hpRestored as number)}`}
            </div>
          )}
          {'completed' in result && (
            <div className="text-sm">
              {result.completed ? 'Item crafted successfully!' : 'Crafting incomplete.'}
            </div>
          )}
          {'daysRequired' in result && (
            <div className="text-sm">
              Retraining requires {String(result.daysRequired)} days.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
