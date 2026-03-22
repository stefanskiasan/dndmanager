'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SuggestionCard } from '../SuggestionCard'
import type { CharacterSuggestion } from '@dndmanager/ai-services'

interface SuggestionsStepProps {
  suggestion: CharacterSuggestion
  onConfirm: (picks: { ancestry: string; class_: string; background: string; skills: string[] }) => void
  onBack: () => void
}

export function SuggestionsStep({ suggestion, onConfirm, onBack }: SuggestionsStepProps) {
  const [selectedAncestry, setSelectedAncestry] = useState(suggestion.ancestries[0]?.name ?? '')
  const [selectedClass, setSelectedClass] = useState(suggestion.classes[0]?.name ?? '')
  const [selectedBackground, setSelectedBackground] = useState(suggestion.backgrounds[0]?.name ?? '')
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    suggestion.skills.slice(0, 3).map((s) => s.name)
  )

  function toggleSkill(name: string) {
    setSelectedSkills((prev) =>
      prev.includes(name)
        ? prev.filter((s) => s !== name)
        : prev.length < 5
          ? [...prev, name]
          : prev
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">KI-Vorschlaege</h2>
        <p className="text-sm text-neutral-400">{suggestion.conceptSummary}</p>
      </div>

      {/* Ancestry */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-300">Abstammung (Ancestry)</h3>
        <div className="grid gap-2">
          {suggestion.ancestries.map((a) => (
            <SuggestionCard
              key={a.name}
              name={a.name}
              description={a.description}
              reasoning={a.reasoning}
              selected={selectedAncestry === a.name}
              onSelect={() => setSelectedAncestry(a.name)}
            />
          ))}
        </div>
      </div>

      {/* Class */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-300">Klasse (Class)</h3>
        <div className="grid gap-2">
          {suggestion.classes.map((c) => (
            <SuggestionCard
              key={c.name}
              name={c.name}
              description={c.description}
              reasoning={c.reasoning}
              selected={selectedClass === c.name}
              onSelect={() => setSelectedClass(c.name)}
            />
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-300">Hintergrund (Background)</h3>
        <div className="grid gap-2">
          {suggestion.backgrounds.map((b) => (
            <SuggestionCard
              key={b.name}
              name={b.name}
              description={b.description}
              reasoning={b.reasoning}
              selected={selectedBackground === b.name}
              onSelect={() => setSelectedBackground(b.name)}
            />
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-300">
          Fertigkeiten (max. 5 auswaehlen)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {suggestion.skills.map((s) => (
            <SuggestionCard
              key={s.name}
              name={s.name}
              description={s.description}
              reasoning={s.reasoning}
              selected={selectedSkills.includes(s.name)}
              onSelect={() => toggleSkill(s.name)}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Zurueck
        </Button>
        <Button
          onClick={() =>
            onConfirm({
              ancestry: selectedAncestry,
              class_: selectedClass,
              background: selectedBackground,
              skills: selectedSkills,
            })
          }
          className="flex-1"
        >
          Weiter
        </Button>
      </div>
    </div>
  )
}
