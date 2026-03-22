import { describe, it, expect } from 'vitest'
import {
  createHitPoints,
  applyDamage,
  applyHealing,
  addTempHP,
  createDyingState,
  incrementDying,
  checkDeath,
  applyWounded,
} from '../hp.js'

describe('createHitPoints', () => {
  it('creates HP with max and current equal', () => {
    const hp = createHitPoints(45)
    expect(hp.current).toBe(45)
    expect(hp.max).toBe(45)
    expect(hp.temp).toBe(0)
  })
})

describe('applyDamage', () => {
  it('reduces current HP', () => {
    const hp = createHitPoints(45)
    const result = applyDamage(hp, 10)
    expect(result.current).toBe(35)
  })

  it('temp HP absorbs damage first', () => {
    const hp = { current: 45, max: 45, temp: 10 }
    const result = applyDamage(hp, 15)
    expect(result.temp).toBe(0)
    expect(result.current).toBe(40)
  })

  it('temp HP partially absorbs damage', () => {
    const hp = { current: 45, max: 45, temp: 5 }
    const result = applyDamage(hp, 3)
    expect(result.temp).toBe(2)
    expect(result.current).toBe(45)
  })

  it('HP can go below 0', () => {
    const hp = createHitPoints(10)
    const result = applyDamage(hp, 25)
    expect(result.current).toBe(-15)
  })

  it('does not modify max HP', () => {
    const hp = createHitPoints(45)
    const result = applyDamage(hp, 10)
    expect(result.max).toBe(45)
  })
})

describe('applyHealing', () => {
  it('increases current HP', () => {
    const hp = { current: 20, max: 45, temp: 0 }
    const result = applyHealing(hp, 10)
    expect(result.current).toBe(30)
  })

  it('cannot exceed max HP', () => {
    const hp = { current: 40, max: 45, temp: 0 }
    const result = applyHealing(hp, 20)
    expect(result.current).toBe(45)
  })
})

describe('addTempHP', () => {
  it('sets temp HP', () => {
    const hp = createHitPoints(45)
    const result = addTempHP(hp, 10)
    expect(result.temp).toBe(10)
  })

  it('does not stack — uses higher value', () => {
    const hp = { current: 45, max: 45, temp: 8 }
    const result = addTempHP(hp, 5)
    expect(result.temp).toBe(8)
  })

  it('replaces if new is higher', () => {
    const hp = { current: 45, max: 45, temp: 5 }
    const result = addTempHP(hp, 10)
    expect(result.temp).toBe(10)
  })
})

describe('dying state', () => {
  it('creates default dying state', () => {
    const state = createDyingState()
    expect(state.dying).toBe(0)
    expect(state.wounded).toBe(0)
    expect(state.doomed).toBe(0)
  })

  it('increments dying value', () => {
    const state = createDyingState()
    const result = incrementDying(state)
    expect(result.dying).toBe(1)
  })

  it('wounded adds to dying value', () => {
    const state = { dying: 0, wounded: 2, doomed: 0 }
    const result = incrementDying(state)
    expect(result.dying).toBe(3) // 1 base + 2 wounded
  })

  it('checkDeath returns false when dying < max', () => {
    expect(checkDeath({ dying: 3, wounded: 0, doomed: 0 })).toBe(false)
  })

  it('checkDeath returns true when dying >= 4', () => {
    expect(checkDeath({ dying: 4, wounded: 0, doomed: 0 })).toBe(true)
  })

  it('doomed reduces max dying', () => {
    expect(checkDeath({ dying: 3, wounded: 0, doomed: 1 })).toBe(true) // max = 4-1 = 3
  })

  it('applyWounded increments wounded by 1', () => {
    const state = { dying: 0, wounded: 0, doomed: 0 }
    expect(applyWounded(state).wounded).toBe(1)
  })
})
