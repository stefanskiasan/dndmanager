import { describe, it, expect } from 'vitest'
import { createTriggerEngine, TriggerEngine } from '../triggers/trigger-engine.js'
import type { GameState, GameEvent } from '../types.js'
import type { TriggerDef } from '@dndmanager/scene-framework'

function mockState(overrides?: Partial<GameState>): GameState {
  return {
    id: 'gs1', sessionId: 's1', mode: 'encounter',
    tokens: [], initiative: [], turnOrder: [],
    currentTurnIndex: -1, turn: null, round: 1, actionLog: [],
    ...overrides,
  }
}

describe('TriggerEngine', () => {
  it('creates engine from trigger definitions', () => {
    const defs: TriggerDef[] = [
      { id: 'alarm', when: { room_entered: 'vault' }, effects: [{ type: 'narrative', text: 'An alarm sounds!' }] },
    ]
    const engine = createTriggerEngine(defs)
    expect(engine.getState().triggers).toHaveLength(1)
    expect(engine.getState().triggers[0].status).toBe('armed')
  })

  it('fires a one-shot trigger on matching event', () => {
    const defs: TriggerDef[] = [
      { id: 'alarm', when: { room_entered: 'vault' }, effects: [{ type: 'narrative', text: 'An alarm sounds!' }] },
    ]
    const engine = createTriggerEngine(defs)
    const event: GameEvent = { type: 'token_moved', timestamp: 1, data: { tokenId: 't1', roomId: 'vault' } }
    const result = engine.processEvent(event, mockState())

    expect(result.events.some((e) => e.type === 'trigger_fired')).toBe(true)
    expect(result.events.some((e) => e.type === 'narrative_displayed')).toBe(true)
    expect(engine.getState().triggers[0].status).toBe('fired')
  })

  it('does not fire an already-fired one-shot trigger', () => {
    const defs: TriggerDef[] = [
      { id: 'alarm', when: { room_entered: 'vault' }, effects: [{ type: 'narrative', text: 'An alarm sounds!' }] },
    ]
    const engine = createTriggerEngine(defs)
    const event: GameEvent = { type: 'token_moved', timestamp: 1, data: { tokenId: 't1', roomId: 'vault' } }

    engine.processEvent(event, mockState())
    const result2 = engine.processEvent(event, mockState())
    expect(result2.events.filter((e) => e.type === 'narrative_displayed')).toHaveLength(0)
  })

  it('processes trigger chains', () => {
    const defs: TriggerDef[] = [
      { id: 'trap', when: { room_entered: 'hallway' }, effects: [{ type: 'trigger', target: 'collapse' }] },
      { id: 'collapse', when: {}, effects: [{ type: 'narrative', text: 'The ceiling collapses!' }] },
    ]
    const engine = createTriggerEngine(defs)
    const event: GameEvent = { type: 'token_moved', timestamp: 1, data: { tokenId: 't1', roomId: 'hallway' } }
    const result = engine.processEvent(event, mockState())

    expect(result.events.some((e) => e.type === 'narrative_displayed' && e.data.text === 'The ceiling collapses!')).toBe(true)
  })

  it('can disable a trigger', () => {
    const defs: TriggerDef[] = [
      { id: 'alarm', when: { room_entered: 'vault' }, effects: [{ type: 'narrative', text: 'Alarm!' }] },
    ]
    const engine = createTriggerEngine(defs)
    engine.disableTrigger('alarm')
    expect(engine.getState().triggers[0].status).toBe('disabled')

    const event: GameEvent = { type: 'token_moved', timestamp: 1, data: { tokenId: 't1', roomId: 'vault' } }
    const result = engine.processEvent(event, mockState())
    expect(result.events.filter((e) => e.type === 'narrative_displayed')).toHaveLength(0)
  })

  it('can re-arm a trigger', () => {
    const defs: TriggerDef[] = [
      { id: 'alarm', when: { room_entered: 'vault' }, effects: [{ type: 'narrative', text: 'Alarm!' }] },
    ]
    const engine = createTriggerEngine(defs)
    engine.disableTrigger('alarm')
    engine.rearmTrigger('alarm')
    expect(engine.getState().triggers[0].status).toBe('armed')
  })
})
