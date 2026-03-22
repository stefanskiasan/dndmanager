'use client'

import { useEffect, useMemo } from 'react'
import { useLevelUpStore } from '@/lib/stores/level-up-store'
import { getLevelUpGains, ABILITY_BOOST_LEVELS } from '@dndmanager/pf2e-engine'
import { HpStep } from './steps/HpStep'
import { AbilityBoostStep } from './steps/AbilityBoostStep'
import { SkillIncreaseStep } from './steps/SkillIncreaseStep'
import { FeatStep } from './steps/FeatStep'
import { SpellStep } from './steps/SpellStep'
import { LevelUpSummary } from './LevelUpSummary'

interface LevelUpWizardProps {
  characterId: string
  currentLevel: number
  className: string
  classHitPoints: number
  conScore: number
  isCaster: boolean
}

const STEP_LABELS: Record<string, string> = {
  hp: 'HP Increase',
  'ability-boosts': 'Ability Boosts',
  'skill-increases': 'Skill Increases',
  feats: 'Feats',
  spells: 'Spells',
  review: 'Review',
}

export function LevelUpWizard({
  characterId,
  currentLevel,
  className,
  classHitPoints,
  conScore,
  isCaster,
}: LevelUpWizardProps) {
  const { currentStep, setCharacter, gains } = useLevelUpStore()

  const newLevel = currentLevel + 1

  useEffect(() => {
    const g = getLevelUpGains(newLevel, className, classHitPoints, conScore)
    setCharacter(characterId, g)
  }, [characterId, newLevel, className, classHitPoints, conScore, setCharacter])

  const steps = useMemo(() => {
    const s: string[] = ['hp']
    if ((ABILITY_BOOST_LEVELS as readonly number[]).includes(newLevel)) {
      s.push('ability-boosts')
    }
    if (gains && gains.skillIncreases > 0) {
      s.push('skill-increases')
    }
    if (gains && gains.featSlots.length > 0) {
      s.push('feats')
    }
    if (isCaster) {
      s.push('spells')
    }
    s.push('review')
    return s
  }, [newLevel, gains, isCaster])

  const currentStepIndex = steps.indexOf(currentStep)

  if (!gains) return <div className="p-4">Loading level-up data...</div>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Level Up to {newLevel}</h2>

      {/* Progress indicator */}
      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex-1 rounded-full h-2 ${
              i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>
      <div className="text-sm text-muted-foreground">
        Step {currentStepIndex + 1} of {steps.length}: {STEP_LABELS[currentStep]}
      </div>

      {/* Step content */}
      {currentStep === 'hp' && (
        <HpStep
          gains={gains}
          classHitPoints={classHitPoints}
          conScore={conScore}
          onNext={() => useLevelUpStore.getState().setStep(steps[1] as any)}
        />
      )}
      {currentStep === 'ability-boosts' && (
        <AbilityBoostStep
          gains={gains}
          onNext={() =>
            useLevelUpStore.getState().setStep(steps[steps.indexOf('ability-boosts') + 1] as any)
          }
          onBack={() =>
            useLevelUpStore.getState().setStep(steps[steps.indexOf('ability-boosts') - 1] as any)
          }
        />
      )}
      {currentStep === 'skill-increases' && (
        <SkillIncreaseStep
          gains={gains}
          onNext={() =>
            useLevelUpStore.getState().setStep(steps[steps.indexOf('skill-increases') + 1] as any)
          }
          onBack={() =>
            useLevelUpStore.getState().setStep(steps[steps.indexOf('skill-increases') - 1] as any)
          }
        />
      )}
      {currentStep === 'feats' && (
        <FeatStep
          gains={gains}
          className={className}
          onNext={() =>
            useLevelUpStore.getState().setStep(steps[steps.indexOf('feats') + 1] as any)
          }
          onBack={() =>
            useLevelUpStore.getState().setStep(steps[steps.indexOf('feats') - 1] as any)
          }
        />
      )}
      {currentStep === 'spells' && (
        <SpellStep
          gains={gains}
          onNext={() =>
            useLevelUpStore.getState().setStep(steps[steps.indexOf('spells') + 1] as any)
          }
          onBack={() =>
            useLevelUpStore.getState().setStep(steps[steps.indexOf('spells') - 1] as any)
          }
        />
      )}
      {currentStep === 'review' && (
        <LevelUpSummary
          gains={gains}
          characterId={characterId}
          newLevel={newLevel}
          onBack={() =>
            useLevelUpStore.getState().setStep(steps[steps.indexOf('review') - 1] as any)
          }
        />
      )}
    </div>
  )
}
