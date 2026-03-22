'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ConceptStepProps {
  initialConcept: string
  loading: boolean
  onSubmit: (concept: string) => void
}

export function ConceptStep({ initialConcept, loading, onSubmit }: ConceptStepProps) {
  const [concept, setConcept] = useState(initialConcept)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Beschreibe deinen Charakter</h2>
        <p className="text-sm text-neutral-400">
          Beschreibe dein Charakterkonzept in eigenen Worten. Die KI schlaegt passende
          PF2e-Optionen vor.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept">Charakterkonzept</Label>
        <textarea
          id="concept"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="z.B. Ein hinterlistiger Elfenmagier, der sich auf Illusionsmagie spezialisiert hat und frueher als Strassendieb gelebt hat..."
          rows={4}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          minLength={10}
          maxLength={2000}
          required
        />
        <div className="text-xs text-neutral-500">{concept.length}/2000</div>
      </div>

      <Button
        onClick={() => onSubmit(concept)}
        disabled={concept.trim().length < 10 || loading}
        className="w-full"
      >
        {loading ? 'KI denkt nach...' : 'Vorschlaege generieren'}
      </Button>
    </div>
  )
}
