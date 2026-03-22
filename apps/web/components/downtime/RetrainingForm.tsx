'use client'

import { useState } from 'react'
import { getRetrainingDays } from '@dndmanager/pf2e-engine'

interface RetrainingFormProps {
  onResult: (result: Record<string, unknown>) => void
}

export function RetrainingForm({ onResult }: RetrainingFormProps) {
  const [retrainType, setRetrainType] = useState<'feat' | 'skill'>('feat')
  const [replacedItem, setReplacedItem] = useState('')
  const [newItem, setNewItem] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const daysRequired = getRetrainingDays(retrainType)

  async function handleConfirm() {
    if (!replacedItem.trim() || !newItem.trim()) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/characters/placeholder/downtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity: 'retrain',
          params: {
            replacedFeat: replacedItem.trim(),
            newFeat: newItem.trim(),
            daysRequired,
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onResult(data)
      }
    } catch {
      // Handle error silently
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="font-semibold">Retraining</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm">Type</span>
          <select
            value={retrainType}
            onChange={(e) => setRetrainType(e.target.value as 'feat' | 'skill')}
            className="w-full rounded border px-2 py-1.5 text-sm"
          >
            <option value="feat">Feat</option>
            <option value="skill">Skill</option>
          </select>
        </label>
        <div className="text-sm self-end pb-1.5">
          Requires <span className="font-semibold">{daysRequired} days</span>
        </div>
        <label className="space-y-1">
          <span className="text-sm">Replace</span>
          <input
            type="text"
            value={replacedItem}
            onChange={(e) => setReplacedItem(e.target.value)}
            placeholder={`Current ${retrainType}...`}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm">With</span>
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={`New ${retrainType}...`}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <button
        onClick={handleConfirm}
        disabled={submitting || !replacedItem.trim() || !newItem.trim()}
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? 'Processing...' : 'Confirm Retraining'}
      </button>
    </div>
  )
}
