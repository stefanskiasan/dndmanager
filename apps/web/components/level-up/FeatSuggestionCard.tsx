'use client'

import type { FeatRecommendation } from '@dndmanager/ai-services'

interface FeatSuggestionCardProps {
  recommendation: FeatRecommendation
  onSelect: (featName: string) => void
}

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  'top-pick': { label: 'Top Pick', className: 'bg-green-100 text-green-800' },
  strong: { label: 'Strong', className: 'bg-blue-100 text-blue-800' },
  situational: { label: 'Situational', className: 'bg-amber-100 text-amber-800' },
}

export function FeatSuggestionCard({ recommendation, onSelect }: FeatSuggestionCardProps) {
  const badge = PRIORITY_BADGE[recommendation.priority] ?? PRIORITY_BADGE.situational

  return (
    <div className="rounded-lg border p-3 space-y-2 hover:border-primary/50 transition">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{recommendation.name}</h4>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Level {recommendation.level} {recommendation.type} feat
      </p>
      <p className="text-sm">{recommendation.description}</p>
      <div className="text-sm italic text-muted-foreground">{recommendation.reasoning}</div>
      {recommendation.synergies.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Synergies: {recommendation.synergies.join(', ')}
        </div>
      )}
      <button
        onClick={() => onSelect(recommendation.name)}
        className="w-full rounded border px-3 py-1.5 text-sm hover:bg-primary/10 transition"
      >
        Select this feat
      </button>
    </div>
  )
}
