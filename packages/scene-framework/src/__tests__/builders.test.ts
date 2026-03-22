import { describe, it, expect } from 'vitest'
import { scenario, map, room, encounter, npc, trigger, loot } from '../builders.js'

describe('room', () => {
  it('creates a room definition', () => {
    const r = room('hall', {
      position: [0, 0],
      size: [6, 6],
      lighting: 'bright',
      terrain: [],
    })
    expect(r.id).toBe('hall')
    expect(r.lighting).toBe('bright')
  })

  it('includes features when provided', () => {
    const r = room('altar-room', {
      position: [0, 0],
      size: [10, 10],
      lighting: 'dim',
      terrain: [],
      features: ['altar', 'statue'],
    })
    expect(r.features).toEqual(['altar', 'statue'])
  })
})

describe('map', () => {
  it('creates a map definition', () => {
    const m = map('dungeon', {
      tiles: 'stone',
      size: [20, 15],
      rooms: [
        room('entry', { position: [0, 0], size: [5, 5], lighting: 'bright', terrain: [] }),
      ],
      connections: [],
    })
    expect(m.id).toBe('dungeon')
    expect(m.rooms).toHaveLength(1)
    expect(m.size).toEqual([20, 15])
  })
})

describe('npc', () => {
  it('creates an NPC definition', () => {
    const n = npc('bartender', {
      personality: 'Friendly and talkative',
      knowledge: ['Knows about the dungeon', 'Heard rumors'],
      dialogue_style: 'Casual, uses slang',
    })
    expect(n.id).toBe('bartender')
    expect(n.knowledge).toHaveLength(2)
  })

  it('includes monster reference when provided', () => {
    const n = npc('boss', {
      monster: 'pf2e:shadow-priestess',
      personality: 'Arrogant',
      knowledge: [],
      dialogue_style: 'Formal',
    })
    expect(n.monster).toBe('pf2e:shadow-priestess')
  })
})

describe('encounter', () => {
  it('creates an encounter definition', () => {
    const e = encounter('guard-patrol', {
      room: 'entry',
      trigger: 'on_enter',
      monsters: [{ type: 'pf2e:skeleton-guard', count: 4, positions: 'spread' }],
      difficulty: 'moderate',
    })
    expect(e.id).toBe('guard-patrol')
    expect(e.monsters).toHaveLength(1)
    expect(e.difficulty).toBe('moderate')
  })

  it('includes tactics and phases', () => {
    const e = encounter('boss', {
      room: 'throne',
      trigger: 'manual',
      monsters: [{ type: 'pf2e:dragon', position: [10, 10] }],
      difficulty: 'severe',
      tactics: 'Breath weapon first, then melee',
      phases: [{ hp_threshold: 0.5, action: 'flee', description: 'Dragon tries to flee' }],
    })
    expect(e.tactics).toBeDefined()
    expect(e.phases).toHaveLength(1)
  })
})

describe('trigger', () => {
  it('creates a trigger definition', () => {
    const t = trigger('portal-open', {
      when: { encounter: 'boss', phase: 'activate' },
      effects: [
        { type: 'spawn', monsters: [{ type: 'pf2e:shadow', count: 2 }] },
        { type: 'lighting', room: 'throne', to: 'darkness' },
      ],
    })
    expect(t.id).toBe('portal-open')
    expect(t.effects).toHaveLength(2)
  })
})

describe('loot', () => {
  it('creates a loot definition', () => {
    const l = loot('boss-reward', {
      encounter: 'boss',
      mode: 'ai-generated',
      guaranteed: ['pf2e:flame-sword'],
      context: 'Fire temple, party level 5',
    })
    expect(l.id).toBe('boss-reward')
    expect(l.mode).toBe('ai-generated')
    expect(l.guaranteed).toContain('pf2e:flame-sword')
  })
})

describe('scenario', () => {
  it('creates a complete scenario', () => {
    const s = scenario({
      name: 'Test Dungeon',
      level: { min: 1, max: 3 },
      description: 'A simple test dungeon',
      maps: [
        map('main', {
          tiles: 'stone',
          size: [10, 10],
          rooms: [room('start', { position: [0, 0], size: [5, 5], lighting: 'bright', terrain: [] })],
          connections: [],
        }),
      ],
      npcs: [],
      encounters: [],
      triggers: [],
      loot: [],
    })
    expect(s.name).toBe('Test Dungeon')
    expect(s.maps).toHaveLength(1)
    expect(s.level.min).toBe(1)
  })

  it('includes all sections', () => {
    const s = scenario({
      name: 'Full Scenario',
      level: { min: 3, max: 5 },
      description: 'A complete scenario',
      maps: [
        map('m1', { tiles: 'stone', size: [10, 10], rooms: [], connections: [] }),
      ],
      npcs: [
        npc('n1', { personality: 'x', knowledge: [], dialogue_style: 'x' }),
      ],
      encounters: [
        encounter('e1', { room: 'r1', trigger: 'on_enter', monsters: [], difficulty: 'moderate' }),
      ],
      triggers: [
        trigger('t1', { when: {}, effects: [] }),
      ],
      loot: [
        loot('l1', { mode: 'fixed' }),
      ],
    })
    expect(s.npcs).toHaveLength(1)
    expect(s.encounters).toHaveLength(1)
    expect(s.triggers).toHaveLength(1)
    expect(s.loot).toHaveLength(1)
  })
})
