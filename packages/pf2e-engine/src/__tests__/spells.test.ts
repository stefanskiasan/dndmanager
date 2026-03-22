import { describe, it, expect } from 'vitest'
import {
  createSpellSlots,
  canCastSpell,
  useSpellSlot,
  restoreAllSlots,
  heightenDamage,
  getAvailableSlotLevels,
} from '../spells.js'
import type { SpellSlot, SpellDefinition } from '../types.js'

describe('createSpellSlots', () => {
  it('creates slots for given levels', () => {
    const slots = createSpellSlots([
      { level: 1, count: 3 },
      { level: 2, count: 2 },
    ])
    expect(slots).toHaveLength(2)
    expect(slots[0]).toEqual({ level: 1, max: 3, used: 0 })
    expect(slots[1]).toEqual({ level: 2, max: 2, used: 0 })
  })
})

describe('canCastSpell', () => {
  it('returns true if slot available at spell level', () => {
    const slots: SpellSlot[] = [{ level: 1, max: 3, used: 0 }]
    expect(canCastSpell(slots, 1)).toBe(true)
  })

  it('returns false if all slots used', () => {
    const slots: SpellSlot[] = [{ level: 1, max: 3, used: 3 }]
    expect(canCastSpell(slots, 1)).toBe(false)
  })

  it('returns true if higher slot available (heightening)', () => {
    const slots: SpellSlot[] = [
      { level: 1, max: 3, used: 3 },
      { level: 2, max: 2, used: 0 },
    ]
    expect(canCastSpell(slots, 1)).toBe(true)
  })

  it('returns false if no slots at or above level', () => {
    const slots: SpellSlot[] = [{ level: 1, max: 3, used: 0 }]
    expect(canCastSpell(slots, 2)).toBe(false)
  })
})

describe('useSpellSlot', () => {
  it('uses a slot at the given level', () => {
    const slots: SpellSlot[] = [{ level: 1, max: 3, used: 0 }]
    const result = useSpellSlot(slots, 1)
    expect(result[0].used).toBe(1)
  })

  it('uses lowest available slot at or above level', () => {
    const slots: SpellSlot[] = [
      { level: 1, max: 3, used: 3 },
      { level: 2, max: 2, used: 0 },
    ]
    const result = useSpellSlot(slots, 1)
    expect(result[0].used).toBe(3) // level 1 unchanged
    expect(result[1].used).toBe(1) // level 2 used
  })

  it('throws if no slot available', () => {
    const slots: SpellSlot[] = [{ level: 1, max: 3, used: 3 }]
    expect(() => useSpellSlot(slots, 1)).toThrow()
  })
})

describe('restoreAllSlots', () => {
  it('resets all used to 0', () => {
    const slots: SpellSlot[] = [
      { level: 1, max: 3, used: 2 },
      { level: 2, max: 2, used: 1 },
    ]
    const result = restoreAllSlots(slots)
    expect(result[0].used).toBe(0)
    expect(result[1].used).toBe(0)
  })
})

describe('heightenDamage', () => {
  it('increases damage dice for heightened spell', () => {
    const spell: SpellDefinition = {
      id: 'fireball',
      name: 'Fireball',
      level: 3,
      traditions: ['arcane', 'primal'],
      components: ['somatic', 'verbal'],
      castActions: 2,
      range: 500,
      area: { type: 'burst', size: 20 },
      save: { type: 'reflex', basic: true },
      damage: { formula: '6d6', type: 'fire', heightenedPerLevel: '2d6' },
      description: '',
    }
    // Cast at level 5 (2 levels above base 3)
    const result = heightenDamage(spell, 5)
    expect(result).toBe('10d6') // 6d6 + 2*2d6
  })

  it('returns base formula at spell level', () => {
    const spell: SpellDefinition = {
      id: 'fireball',
      name: 'Fireball',
      level: 3,
      traditions: ['arcane'],
      components: ['somatic', 'verbal'],
      castActions: 2,
      damage: { formula: '6d6', type: 'fire', heightenedPerLevel: '2d6' },
      description: '',
    }
    expect(heightenDamage(spell, 3)).toBe('6d6')
  })

  it('returns base formula if no heightening defined', () => {
    const spell: SpellDefinition = {
      id: 'magic-missile',
      name: 'Magic Missile',
      level: 1,
      traditions: ['arcane', 'occult'],
      components: ['somatic', 'verbal'],
      castActions: 2,
      damage: { formula: '1d4+1', type: 'force' },
      description: '',
    }
    expect(heightenDamage(spell, 3)).toBe('1d4+1')
  })
})

describe('getAvailableSlotLevels', () => {
  it('returns levels with available slots', () => {
    const slots: SpellSlot[] = [
      { level: 1, max: 3, used: 3 },
      { level: 2, max: 2, used: 1 },
      { level: 3, max: 1, used: 0 },
    ]
    expect(getAvailableSlotLevels(slots)).toEqual([2, 3])
  })
})
