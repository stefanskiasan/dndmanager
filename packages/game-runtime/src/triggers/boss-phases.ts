import type { EncounterDef } from '@dndmanager/scene-framework'
import type { GameState, GameEvent } from '../types.js'
import type { TriggerEngineState, BossPhaseState, BossPhaseEntry } from './types.js'
import { createEvent } from '../events.js'

export function createBossPhaseTracker(encounter: EncounterDef, tokenId: string): BossPhaseState {
  const phases: BossPhaseEntry[] = (encounter.phases ?? [])
    .sort((a, b) => b.hp_threshold - a.hp_threshold) // highest threshold first
    .map((p, i) => ({
      id: `${encounter.id}-phase-${i}`,
      hpThreshold: p.hp_threshold,
      action: p.action,
      description: p.description,
      triggered: false,
    }))

  return {
    encounterId: encounter.id,
    tokenId,
    phases,
    currentPhaseIndex: -1,
  }
}

export interface BossPhaseResult {
  engineState: TriggerEngineState
  events: GameEvent[]
}

/**
 * Check all boss phase trackers against current token HP.
 * Returns events for newly triggered phases (in order, highest threshold first).
 */
export function checkBossPhases(
  state: GameState,
  engineState: TriggerEngineState,
): BossPhaseResult {
  const events: GameEvent[] = []
  const updatedBossPhases = engineState.bossPhases.map((tracker) => {
    const token = state.tokens.find((t) => t.id === tracker.tokenId)
    if (!token) return tracker

    const hpRatio = token.hp.current / token.hp.max
    let currentPhaseIndex = tracker.currentPhaseIndex
    const updatedPhases = tracker.phases.map((phase, idx) => {
      if (phase.triggered) return phase
      if (hpRatio > phase.hpThreshold) return phase

      // HP is at or below threshold — trigger this phase
      currentPhaseIndex = idx
      events.push(createEvent('boss_phase_entered', {
        encounterId: tracker.encounterId,
        tokenId: tracker.tokenId,
        phase: phase.action,
        description: phase.description,
        hpRatio,
      }))
      return { ...phase, triggered: true }
    })

    return { ...tracker, phases: updatedPhases, currentPhaseIndex }
  })

  return {
    engineState: { ...engineState, bossPhases: updatedBossPhases },
    events,
  }
}
