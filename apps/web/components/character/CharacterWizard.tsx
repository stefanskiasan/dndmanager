'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConceptStep } from './steps/ConceptStep'
import { SuggestionsStep } from './steps/SuggestionsStep'
import { AbilitiesStep } from './steps/AbilitiesStep'
import { ReviewStep } from './steps/ReviewStep'
import type { CharacterSuggestion } from '@dndmanager/ai-services'
import type { AbilityId } from '@dndmanager/pf2e-engine'

type WizardStep = 'concept' | 'suggestions' | 'abilities' | 'review'

interface CharacterWizardProps {
  campaignId: string
}

export function CharacterWizard({ campaignId }: CharacterWizardProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<WizardStep>('concept')
  const [concept, setConcept] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI response
  const [suggestion, setSuggestion] = useState<CharacterSuggestion | null>(null)

  // Player picks
  const [picks, setPicks] = useState<{
    ancestry: string
    class_: string
    background: string
    skills: string[]
  } | null>(null)
  const [abilityScores, setAbilityScores] = useState<Record<AbilityId, number> | null>(null)

  async function handleConceptSubmit(text: string) {
    setConcept(text)
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/character-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: text, level: 1 }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Anfrage fehlgeschlagen')
      }

      const data: CharacterSuggestion = await res.json()
      setSuggestion(data)
      setStep('suggestions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  function handleSuggestionsConfirm(chosen: {
    ancestry: string
    class_: string
    background: string
    skills: string[]
  }) {
    setPicks(chosen)
    setStep('abilities')
  }

  function handleAbilitiesConfirm(scores: Record<AbilityId, number>) {
    setAbilityScores(scores)
    setStep('review')
  }

  async function handleSave(name: string) {
    if (!picks || !abilityScores) return

    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Nicht angemeldet')
      setSaving(false)
      return
    }

    const characterData = {
      concept,
      ancestry: picks.ancestry,
      class: picks.class_,
      background: picks.background,
      skills: picks.skills,
      abilityScores,
    }

    const { error: dbError } = await supabase.from('characters').insert({
      name,
      owner_id: user.id,
      campaign_id: campaignId,
      level: 1,
      xp: 0,
      data: characterData,
    })

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    router.push(`/campaigns/${campaignId}`)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress indicator */}
      <div className="mb-6 flex gap-1">
        {(['concept', 'suggestions', 'abilities', 'review'] as WizardStep[]).map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              i <= ['concept', 'suggestions', 'abilities', 'review'].indexOf(step)
                ? 'bg-amber-500'
                : 'bg-neutral-700'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {step === 'concept' && (
        <ConceptStep
          initialConcept={concept}
          loading={loading}
          onSubmit={handleConceptSubmit}
        />
      )}

      {step === 'suggestions' && suggestion && (
        <SuggestionsStep
          suggestion={suggestion}
          onConfirm={handleSuggestionsConfirm}
          onBack={() => setStep('concept')}
        />
      )}

      {step === 'abilities' && suggestion && (
        <AbilitiesStep
          suggestions={suggestion.abilityBoosts}
          onConfirm={handleAbilitiesConfirm}
          onBack={() => setStep('suggestions')}
        />
      )}

      {step === 'review' && picks && abilityScores && (
        <ReviewStep
          ancestry={picks.ancestry}
          class_={picks.class_}
          background={picks.background}
          skills={picks.skills}
          abilityScores={abilityScores}
          nameSuggestions={suggestion?.nameSuggestions}
          saving={saving}
          onSave={handleSave}
          onBack={() => setStep('abilities')}
        />
      )}
    </div>
  )
}
