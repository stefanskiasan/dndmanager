import { describe, it, expect } from 'vitest'
import { validateScenario } from '../validator.js'
import { scenario, map, room, encounter, npc, trigger, loot } from '../builders.js'

function validScenario() {
  return scenario({
    name: 'Test',
    level: { min: 1, max: 3 },
    description: 'Valid test scenario',
    maps: [
      map('main', {
        tiles: 'stone',
        size: [10, 10],
        rooms: [
          room('hall', { position: [0, 0], size: [5, 5], lighting: 'bright', terrain: [] }),
        ],
        connections: [],
      }),
    ],
    npcs: [],
    encounters: [
      encounter('fight', {
        room: 'hall',
        trigger: 'on_enter',
        monsters: [{ type: 'pf2e:goblin', count: 2 }],
        difficulty: 'moderate',
      }),
    ],
    triggers: [],
    loot: [],
  })
}

describe('validateScenario', () => {
  it('returns valid for a correct scenario', () => {
    const result = validateScenario(validScenario())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('errors on empty name', () => {
    const s = { ...validScenario(), name: '' }
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('name'))).toBe(true)
  })

  it('errors on invalid level range', () => {
    const s = { ...validScenario(), level: { min: 5, max: 3 } }
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('level'))).toBe(true)
  })

  it('errors on empty maps', () => {
    const s = { ...validScenario(), maps: [] }
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('map'))).toBe(true)
  })

  it('errors on encounter referencing nonexistent room', () => {
    const s = scenario({
      ...validScenario(),
      encounters: [
        encounter('fight', {
          room: 'nonexistent',
          trigger: 'on_enter',
          monsters: [{ type: 'pf2e:goblin' }],
          difficulty: 'moderate',
        }),
      ],
    })
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('nonexistent'))).toBe(true)
  })

  it('errors on duplicate room IDs', () => {
    const s = scenario({
      ...validScenario(),
      maps: [
        map('main', {
          tiles: 'stone',
          size: [10, 10],
          rooms: [
            room('hall', { position: [0, 0], size: [5, 5], lighting: 'bright', terrain: [] }),
            room('hall', { position: [5, 0], size: [5, 5], lighting: 'dim', terrain: [] }),
          ],
          connections: [],
        }),
      ],
    })
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('duplicate') || e.includes('Duplicate'))).toBe(true)
  })

  it('warns on monster without pf2e: prefix', () => {
    const s = scenario({
      ...validScenario(),
      encounters: [
        encounter('fight', {
          room: 'hall',
          trigger: 'on_enter',
          monsters: [{ type: 'goblin' }],
          difficulty: 'moderate',
        }),
      ],
    })
    const result = validateScenario(s)
    expect(result.warnings.some((w) => w.includes('pf2e:'))).toBe(true)
  })

  it('errors on cyclic triggers', () => {
    const s = scenario({
      ...validScenario(),
      triggers: [
        trigger('a', { when: {}, effects: [{ type: 'trigger', target: 'b' }] }),
        trigger('b', { when: {}, effects: [{ type: 'trigger', target: 'a' }] }),
      ],
    })
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.toLowerCase().includes('cycl'))).toBe(true)
  })

  it('errors on trigger referencing nonexistent trigger', () => {
    const s = scenario({
      ...validScenario(),
      triggers: [
        trigger('a', { when: {}, effects: [{ type: 'trigger', target: 'nonexistent' }] }),
      ],
    })
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('nonexistent'))).toBe(true)
  })

  it('errors on loot referencing nonexistent encounter', () => {
    const s = scenario({
      ...validScenario(),
      loot: [
        loot('reward', { encounter: 'nonexistent', mode: 'fixed' }),
      ],
    })
    const result = validateScenario(s)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('nonexistent'))).toBe(true)
  })

  it('warns on room without lighting', () => {
    const s = scenario({
      ...validScenario(),
      maps: [
        map('main', {
          tiles: 'stone',
          size: [10, 10],
          rooms: [
            { id: 'hall', position: [0, 0], size: [5, 5], lighting: undefined as any, terrain: [] },
          ],
          connections: [],
        }),
      ],
    })
    const result = validateScenario(s)
    expect(result.warnings.length + result.errors.length).toBeGreaterThan(0)
  })
})
