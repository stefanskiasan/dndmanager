import { describe, it, expect } from 'vitest'
import { createBossPhaseTracker, checkBossPhases } from '../triggers/boss-phases.js'
import type { GameState, Token } from '../types.js'
import type { EncounterDef } from '@dndmanager/scene-framework'
import type { TriggerEngineState } from '../triggers/types.js'

function bossToken(hpCurrent: number, hpMax: number): Token {
  return {
    id: 'boss-token',
    name: 'Dragon',
    type: 'monster',
    ownerId: 'gm',
    position: { x: 5, y: 5 },
    speed: 30,
    conditions: [],
    hp: { current: hpCurrent, max: hpMax, temp: 0 },
    ac: 22,
    visible: true,
  }
}

function mockState(tokens: Token[]): GameState {
  return {
    id: 'gs1', sessionId: 's1', mode: 'encounter',
    tokens, initiative: [], turnOrder: [],
    currentTurnIndex: -1, turn: null, round: 1, actionLog: [],
  }
}

describe('createBossPhaseTracker', () => {
  it('creates phase tracker from encounter definition', () => {
    const enc: EncounterDef = {
      id: 'dragon-fight',
      room: 'lair',
      trigger: 'manual',
      monsters: [{ type: 'pf2e:ancient-dragon' }],
      difficulty: 'extreme',
      phases: [
        { hp_threshold: 0.75, action: 'rage', description: 'Dragon enters a rage' },
        { hp_threshold: 0.5, action: 'call-minions', description: 'Dragon calls minions' },
        { hp_threshold: 0.25, action: 'flee', description: 'Dragon attempts to flee' },
      ],
    }
    const tracker = createBossPhaseTracker(enc, 'boss-token')
    expect(tracker.phases).toHaveLength(3)
    expect(tracker.currentPhaseIndex).toBe(-1)
    expect(tracker.phases[0].triggered).toBe(false)
  })
})

describe('checkBossPhases', () => {
  it('triggers phase when HP drops below threshold', () => {
    const enc: EncounterDef = {
      id: 'dragon-fight', room: 'lair', trigger: 'manual',
      monsters: [{ type: 'pf2e:ancient-dragon' }], difficulty: 'extreme',
      phases: [
        { hp_threshold: 0.5, action: 'rage', description: 'Dragon enters a rage' },
      ],
    }
    const tracker = createBossPhaseTracker(enc, 'boss-token')
    const engineState: TriggerEngineState = {
      triggers: [], bossPhases: [tracker], roomEventLinks: [],
    }

    // Boss at 40% HP (below 0.5 threshold)
    const state = mockState([bossToken(40, 100)])
    const result = checkBossPhases(state, engineState)

    expect(result.events).toContainEqual(
      expect.objectContaining({ type: 'boss_phase_entered', data: expect.objectContaining({ phase: 'rage' }) })
    )
    expect(result.engineState.bossPhases[0].phases[0].triggered).toBe(true)
    expect(result.engineState.bossPhases[0].currentPhaseIndex).toBe(0)
  })

  it('does not re-trigger already triggered phase', () => {
    const enc: EncounterDef = {
      id: 'dragon-fight', room: 'lair', trigger: 'manual',
      monsters: [{ type: 'pf2e:ancient-dragon' }], difficulty: 'extreme',
      phases: [
        { hp_threshold: 0.5, action: 'rage', description: 'Dragon enters a rage' },
      ],
    }
    const tracker = createBossPhaseTracker(enc, 'boss-token')
    tracker.phases[0].triggered = true
    tracker.currentPhaseIndex = 0
    const engineState: TriggerEngineState = {
      triggers: [], bossPhases: [tracker], roomEventLinks: [],
    }
    const state = mockState([bossToken(40, 100)])
    const result = checkBossPhases(state, engineState)
    expect(result.events.filter((e) => e.type === 'boss_phase_entered')).toHaveLength(0)
  })

  it('triggers multiple phases in order when HP drops significantly', () => {
    const enc: EncounterDef = {
      id: 'dragon-fight', room: 'lair', trigger: 'manual',
      monsters: [{ type: 'pf2e:ancient-dragon' }], difficulty: 'extreme',
      phases: [
        { hp_threshold: 0.75, action: 'rage', description: 'Rage' },
        { hp_threshold: 0.5, action: 'call-minions', description: 'Call minions' },
        { hp_threshold: 0.25, action: 'flee', description: 'Flee' },
      ],
    }
    const tracker = createBossPhaseTracker(enc, 'boss-token')
    const engineState: TriggerEngineState = {
      triggers: [], bossPhases: [tracker], roomEventLinks: [],
    }

    // Boss at 20% HP — should trigger all 3 phases
    const state = mockState([bossToken(20, 100)])
    const result = checkBossPhases(state, engineState)

    const phaseEvents = result.events.filter((e) => e.type === 'boss_phase_entered')
    expect(phaseEvents).toHaveLength(3)
    expect(phaseEvents[0].data.phase).toBe('rage')
    expect(phaseEvents[1].data.phase).toBe('call-minions')
    expect(phaseEvents[2].data.phase).toBe('flee')
  })

  it('returns empty events when no phases need triggering', () => {
    const enc: EncounterDef = {
      id: 'dragon-fight', room: 'lair', trigger: 'manual',
      monsters: [{ type: 'pf2e:ancient-dragon' }], difficulty: 'extreme',
      phases: [
        { hp_threshold: 0.5, action: 'rage', description: 'Rage' },
      ],
    }
    const tracker = createBossPhaseTracker(enc, 'boss-token')
    const engineState: TriggerEngineState = {
      triggers: [], bossPhases: [tracker], roomEventLinks: [],
    }

    // Boss at 80% HP — above threshold
    const state = mockState([bossToken(80, 100)])
    const result = checkBossPhases(state, engineState)
    expect(result.events).toHaveLength(0)
  })
})
