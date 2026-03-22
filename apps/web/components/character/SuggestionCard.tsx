'use client'

import { cn } from '@/lib/utils'

interface SuggestionCardProps {
  name: string
  description: string
  reasoning: string
  selected: boolean
  onSelect: () => void
}

export function SuggestionCard({
  name,
  description,
  reasoning,
  selected,
  onSelect,
}: SuggestionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border p-4 text-left transition-colors',
        selected
          ? 'border-amber-500 bg-amber-500/10 text-white'
          : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-500'
      )}
    >
      <div className="mb-1 text-sm font-semibold">{name}</div>
      <div className="mb-2 text-xs text-neutral-400">{description}</div>
      <div className="text-xs italic text-neutral-500">{reasoning}</div>
    </button>
  )
}
