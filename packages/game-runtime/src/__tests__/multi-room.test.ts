import { describe, it, expect } from 'vitest'
import { createRoomEventLinks, propagateRoomEvent } from '../triggers/multi-room.js'
import type { TriggerDef } from '@dndmanager/scene-framework'
import type { GameState } from '../types.js'
import type { TriggerEngineState, RoomEventLink } from '../triggers/types.js'

function mockState(): GameState {
  return {
    id: 'gs1', sessionId: 's1', mode: 'encounter',
    tokens: [], initiative: [], turnOrder: [],
    currentTurnIndex: -1, turn: null, round: 1, actionLog: [],
  }
}

describe('createRoomEventLinks', () => {
  it('extracts room event links from trigger definitions', () => {
    const defs: TriggerDef[] = [
      {
        id: 'alarm-chain',
        when: { room_entered: 'vault' },
        effects: [
          { type: 'lighting', room: 'corridor', to: 'bright' },
          { type: 'spawn', room: 'guard-room', monsters: [{ type: 'pf2e:guard', count: 2 }] },
        ],
      },
    ]
    const links = createRoomEventLinks(defs)
    // Trigger in vault produces effects in corridor and guard-room
    expect(links).toHaveLength(2)
    expect(links.some((l) => l.sourceRoom === 'vault' && l.targetRoom === 'corridor')).toBe(true)
    expect(links.some((l) => l.sourceRoom === 'vault' && l.targetRoom === 'guard-room')).toBe(true)
  })

  it('returns empty array when no cross-room effects exist', () => {
    const defs: TriggerDef[] = [
      { id: 'local', when: { room_entered: 'vault' }, effects: [{ type: 'narrative', text: 'You see gold' }] },
    ]
    const links = createRoomEventLinks(defs)
    expect(links).toHaveLength(0)
  })
})

describe('propagateRoomEvent', () => {
  it('generates events for linked rooms when source trigger fires', () => {
    const link: RoomEventLink = {
      id: 'alarm-to-guard',
      sourceRoom: 'vault',
      sourceTriggerId: 'alarm-chain',
      targetRoom: 'guard-room',
      targetEffects: [{ type: 'spawn', room: 'guard-room', monsters: [{ type: 'pf2e:guard', count: 2 }] }],
    }
    const engineState: TriggerEngineState = {
      triggers: [], bossPhases: [], roomEventLinks: [link],
    }

    const result = propagateRoomEvent('alarm-chain', 'vault', mockState(), engineState)
    expect(result.events.some((e) => e.type === 'room_event_propagated')).toBe(true)
    expect(result.events.some((e) => e.type === 'spawn_executed')).toBe(true)
  })

  it('does not propagate when source room does not match', () => {
    const link: RoomEventLink = {
      id: 'alarm-to-guard',
      sourceRoom: 'vault',
      sourceTriggerId: 'alarm-chain',
      targetRoom: 'guard-room',
      targetEffects: [{ type: 'narrative', text: 'Guards alert!' }],
    }
    const engineState: TriggerEngineState = {
      triggers: [], bossPhases: [], roomEventLinks: [link],
    }

    const result = propagateRoomEvent('alarm-chain', 'hallway', mockState(), engineState)
    expect(result.events).toHaveLength(0)
  })
})
