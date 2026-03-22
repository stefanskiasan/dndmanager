'use client'

import { useState } from 'react'

interface CraftingFormProps {
  onResult: (result: Record<string, unknown>) => void
}

export function CraftingForm({ onResult }: CraftingFormProps) {
  const [itemName, setItemName] = useState('')
  const [itemLevel, setItemLevel] = useState(1)
  const [craftingBonus, setCraftingBonus] = useState(5)
  const [daysSpent, setDaysSpent] = useState(4)
  const [rolling, setRolling] = useState(false)

  async function handleRoll() {
    if (!itemName.trim()) return
    setRolling(true)
    const naturalRoll = Math.floor(Math.random() * 20) + 1

    try {
      const res = await fetch('/api/characters/placeholder/downtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity: 'craft',
          params: { itemName: itemName.trim(), itemLevel, naturalRoll, craftingBonus, daysSpent },
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
      <h3 className="font-semibold">Crafting</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm">Item Name</span>
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Longsword"
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm">Item Level</span>
          <select
            value={itemLevel}
            onChange={(e) => setItemLevel(Number(e.target.value))}
            className="w-full rounded border px-2 py-1.5 text-sm"
          >
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={i}>Level {i}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm">Crafting Bonus</span>
          <input
            type="number"
            value={craftingBonus}
            onChange={(e) => setCraftingBonus(Number(e.target.value))}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm">Days Spent</span>
          <input
            type="number"
            min={1}
            value={daysSpent}
            onChange={(e) => setDaysSpent(Number(e.target.value))}
            className="w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <button
        onClick={handleRoll}
        disabled={rolling || !itemName.trim()}
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {rolling ? 'Rolling...' : 'Roll'}
      </button>
    </div>
  )
}
