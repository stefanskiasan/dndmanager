import { describe, it, expect } from 'vitest'
import {
  getConditionModifiers,
  addCondition,
  removeCondition,
  reduceCondition,
  hasCondition,
} from '../conditions.js'
import type { ActiveCondition, Modifier } from '../types.js'

describe('getConditionModifiers', () => {
  it('frightened applies status penalty to all checks', () => {
    const mods = getConditionModifiers({ id: 'frightened', value: 2, source: 'dragon-roar' })
    expect(mods).toContainEqual({
      type: 'status',
      value: -2,
      source: 'frightened',
    } satisfies Modifier)
  })

  it('flat-footed applies -2 circumstance to AC', () => {
    const mods = getConditionModifiers({ id: 'flat-footed', value: 0, source: 'flanking' })
    expect(mods).toContainEqual({
      type: 'circumstance',
      value: -2,
      source: 'flat-footed',
    } satisfies Modifier)
  })

  it('clumsy applies status penalty', () => {
    const mods = getConditionModifiers({ id: 'clumsy', value: 1, source: 'spell' })
    expect(mods).toContainEqual({
      type: 'status',
      value: -1,
      source: 'clumsy',
    } satisfies Modifier)
  })

  it('enfeebled applies status penalty', () => {
    const mods = getConditionModifiers({ id: 'enfeebled', value: 2, source: 'poison' })
    expect(mods).toContainEqual({
      type: 'status',
      value: -2,
      source: 'enfeebled',
    } satisfies Modifier)
  })

  it('sickened applies status penalty', () => {
    const mods = getConditionModifiers({ id: 'sickened', value: 1, source: 'stench' })
    expect(mods).toContainEqual({
      type: 'status',
      value: -1,
      source: 'sickened',
    } satisfies Modifier)
  })

  it('drained applies status penalty', () => {
    const mods = getConditionModifiers({ id: 'drained', value: 2, source: 'vampire' })
    expect(mods).toContainEqual({
      type: 'status',
      value: -2,
      source: 'drained',
    } satisfies Modifier)
  })

  it('stupefied applies status penalty', () => {
    const mods = getConditionModifiers({ id: 'stupefied', value: 1, source: 'curse' })
    expect(mods).toContainEqual({
      type: 'status',
      value: -1,
      source: 'stupefied',
    } satisfies Modifier)
  })

  it('prone applies -2 circumstance to attack', () => {
    const mods = getConditionModifiers({ id: 'prone', value: 0, source: 'tripped' })
    expect(mods).toContainEqual({
      type: 'circumstance',
      value: -2,
      source: 'prone',
    } satisfies Modifier)
  })

  it('condition with no modifiers returns empty array', () => {
    const mods = getConditionModifiers({ id: 'hidden', value: 0, source: 'stealth' })
    expect(mods).toEqual([])
  })
})

describe('condition management', () => {
  it('addCondition adds to list', () => {
    const conditions: ActiveCondition[] = []
    const result = addCondition(conditions, { id: 'frightened', value: 2, source: 'dragon' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('frightened')
  })

  it('addCondition replaces if already exists with higher value', () => {
    const conditions: ActiveCondition[] = [
      { id: 'frightened', value: 1, source: 'goblin' },
    ]
    const result = addCondition(conditions, { id: 'frightened', value: 3, source: 'dragon' })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(3)
  })

  it('addCondition keeps higher existing value', () => {
    const conditions: ActiveCondition[] = [
      { id: 'frightened', value: 3, source: 'dragon' },
    ]
    const result = addCondition(conditions, { id: 'frightened', value: 1, source: 'goblin' })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(3)
  })

  it('removeCondition removes by id', () => {
    const conditions: ActiveCondition[] = [
      { id: 'frightened', value: 2, source: 'dragon' },
      { id: 'prone', value: 0, source: 'trip' },
    ]
    const result = removeCondition(conditions, 'frightened')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('prone')
  })

  it('reduceCondition decreases value by 1', () => {
    const conditions: ActiveCondition[] = [
      { id: 'frightened', value: 2, source: 'dragon' },
    ]
    const result = reduceCondition(conditions, 'frightened')
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(1)
  })

  it('reduceCondition removes when value reaches 0', () => {
    const conditions: ActiveCondition[] = [
      { id: 'frightened', value: 1, source: 'dragon' },
    ]
    const result = reduceCondition(conditions, 'frightened')
    expect(result).toHaveLength(0)
  })

  it('hasCondition checks presence', () => {
    const conditions: ActiveCondition[] = [
      { id: 'frightened', value: 2, source: 'dragon' },
    ]
    expect(hasCondition(conditions, 'frightened')).toBe(true)
    expect(hasCondition(conditions, 'prone')).toBe(false)
  })
})
