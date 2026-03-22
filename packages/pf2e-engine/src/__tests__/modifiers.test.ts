import { describe, it, expect } from 'vitest'
import { collectModifiers, totalBonus, totalPenalty, netModifier } from '../modifiers.js'
import type { Modifier } from '../types.js'

describe('collectModifiers', () => {
  it('returns empty for no modifiers', () => {
    expect(collectModifiers([])).toEqual({ bonuses: [], penalties: [] })
  })

  it('separates bonuses and penalties', () => {
    const mods: Modifier[] = [
      { type: 'circumstance', value: 2, source: 'flanking' },
      { type: 'status', value: -1, source: 'frightened' },
    ]
    const result = collectModifiers(mods)
    expect(result.bonuses).toHaveLength(1)
    expect(result.penalties).toHaveLength(1)
  })

  it('filters out disabled modifiers', () => {
    const mods: Modifier[] = [
      { type: 'circumstance', value: 2, source: 'flanking', enabled: false },
      { type: 'status', value: 1, source: 'bless' },
    ]
    const result = collectModifiers(mods)
    expect(result.bonuses).toHaveLength(1)
    expect(result.bonuses[0].source).toBe('bless')
  })
})

describe('totalBonus (stacking rules)', () => {
  it('same typed bonuses do not stack — highest wins', () => {
    const mods: Modifier[] = [
      { type: 'circumstance', value: 2, source: 'flanking' },
      { type: 'circumstance', value: 1, source: 'aid' },
    ]
    expect(totalBonus(mods)).toBe(2)
  })

  it('different typed bonuses stack', () => {
    const mods: Modifier[] = [
      { type: 'circumstance', value: 2, source: 'flanking' },
      { type: 'status', value: 1, source: 'bless' },
      { type: 'item', value: 1, source: 'weapon-potency' },
    ]
    expect(totalBonus(mods)).toBe(4)
  })

  it('untyped bonuses always stack', () => {
    const mods: Modifier[] = [
      { type: 'untyped', value: 2, source: 'special-a' },
      { type: 'untyped', value: 1, source: 'special-b' },
    ]
    expect(totalBonus(mods)).toBe(3)
  })

  it('ability modifier stacks with everything', () => {
    const mods: Modifier[] = [
      { type: 'ability', value: 4, source: 'str' },
      { type: 'proficiency', value: 7, source: 'trained+level' },
      { type: 'item', value: 1, source: 'weapon-potency' },
    ]
    expect(totalBonus(mods)).toBe(12)
  })
})

describe('totalPenalty (stacking rules)', () => {
  it('same typed penalties do not stack — worst wins', () => {
    const mods: Modifier[] = [
      { type: 'circumstance', value: -2, source: 'cover' },
      { type: 'circumstance', value: -4, source: 'greater-cover' },
    ]
    expect(totalPenalty(mods)).toBe(-4)
  })

  it('different typed penalties stack', () => {
    const mods: Modifier[] = [
      { type: 'circumstance', value: -2, source: 'cover' },
      { type: 'status', value: -1, source: 'frightened' },
    ]
    expect(totalPenalty(mods)).toBe(-3)
  })

  it('untyped penalties always stack', () => {
    const mods: Modifier[] = [
      { type: 'untyped', value: -5, source: 'map-2' },
      { type: 'untyped', value: -1, source: 'range' },
    ]
    expect(totalPenalty(mods)).toBe(-6)
  })
})

describe('netModifier', () => {
  it('combines bonuses and penalties', () => {
    const mods: Modifier[] = [
      { type: 'ability', value: 4, source: 'str' },
      { type: 'proficiency', value: 7, source: 'trained' },
      { type: 'circumstance', value: 2, source: 'flanking' },
      { type: 'status', value: -2, source: 'frightened' },
      { type: 'untyped', value: -5, source: 'map' },
    ]
    expect(netModifier(mods)).toBe(6) // 4+7+2-2-5 = 6
  })
})
