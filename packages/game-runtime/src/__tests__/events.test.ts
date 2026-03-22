import { describe, it, expect } from 'vitest'
import { createEvent, filterEvents, getEventsSince, formatEventAsText } from '../events.js'
import type { GameEvent, GameEventType } from '../types.js'

describe('createEvent', () => {
  it('creates event with timestamp', () => {
    const event = createEvent('damage_dealt', { tokenId: 'goblin', damage: 12 })
    expect(event.type).toBe('damage_dealt')
    expect(event.timestamp).toBeGreaterThan(0)
    expect(event.data.damage).toBe(12)
  })
})

describe('filterEvents', () => {
  it('filters by event type', () => {
    const events: GameEvent[] = [
      { type: 'turn_start', timestamp: 1, data: {} },
      { type: 'damage_dealt', timestamp: 2, data: {} },
      { type: 'turn_end', timestamp: 3, data: {} },
      { type: 'damage_dealt', timestamp: 4, data: {} },
    ]
    expect(filterEvents(events, 'damage_dealt')).toHaveLength(2)
  })
})

describe('getEventsSince', () => {
  it('returns events after timestamp', () => {
    const events: GameEvent[] = [
      { type: 'turn_start', timestamp: 100, data: {} },
      { type: 'damage_dealt', timestamp: 200, data: {} },
      { type: 'turn_end', timestamp: 300, data: {} },
    ]
    expect(getEventsSince(events, 150)).toHaveLength(2)
  })
})

describe('formatEventAsText', () => {
  it('formats damage event', () => {
    const event: GameEvent = {
      type: 'damage_dealt',
      timestamp: Date.now(),
      data: { source: 'Thorin', target: 'Goblin', damage: 12, type: 'slashing' },
    }
    const text = formatEventAsText(event)
    expect(text).toContain('Thorin')
    expect(text).toContain('Goblin')
    expect(text).toContain('12')
  })

  it('formats turn start event', () => {
    const event: GameEvent = {
      type: 'turn_start',
      timestamp: Date.now(),
      data: { tokenId: 'thorin' },
    }
    const text = formatEventAsText(event)
    expect(text).toContain('thorin')
  })

  it('formats mode change event', () => {
    const event: GameEvent = {
      type: 'mode_change',
      timestamp: Date.now(),
      data: { from: 'exploration', to: 'encounter' },
    }
    const text = formatEventAsText(event)
    expect(text).toContain('encounter')
  })

  it('handles unknown event gracefully', () => {
    const event: GameEvent = {
      type: 'token_added',
      timestamp: Date.now(),
      data: { tokenId: 'npc-1' },
    }
    const text = formatEventAsText(event)
    expect(text).toBeTruthy()
  })
})
