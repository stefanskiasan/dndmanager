import { describe, it, expect } from 'vitest'
import { canAct, canMove, movementCost, validateStrike, validateMove, validateStep } from '../actions.js'
import type { ActionContext } from '../types.js'

function makeContext(overrides?: Partial<ActionContext>): ActionContext {
  return {
    actionsRemaining: 3,
    reactionAvailable: true,
    conditions: [],
    speed: 25,
    position: [0, 0],
    ...overrides,
  }
}

describe('canAct', () => {
  it('returns true with actions remaining', () => {
    expect(canAct(makeContext())).toBe(true)
  })

  it('returns false with no actions', () => {
    expect(canAct(makeContext({ actionsRemaining: 0 }))).toBe(false)
  })

  it('returns false when paralyzed', () => {
    expect(canAct(makeContext({
      conditions: [{ id: 'paralyzed', value: 0, source: 'spell' }],
    }))).toBe(false)
  })

  it('returns false when unconscious', () => {
    expect(canAct(makeContext({
      conditions: [{ id: 'unconscious', value: 0, source: 'dying' }],
    }))).toBe(false)
  })
})

describe('canMove', () => {
  it('returns true normally', () => {
    expect(canMove(makeContext())).toBe(true)
  })

  it('returns false when immobilized', () => {
    expect(canMove(makeContext({
      conditions: [{ id: 'immobilized', value: 0, source: 'web' }],
    }))).toBe(false)
  })

  it('returns false when grabbed', () => {
    expect(canMove(makeContext({
      conditions: [{ id: 'grabbed', value: 0, source: 'tentacle' }],
    }))).toBe(false)
  })

  it('returns false when restrained', () => {
    expect(canMove(makeContext({
      conditions: [{ id: 'restrained', value: 0, source: 'chains' }],
    }))).toBe(false)
  })
})

describe('movementCost', () => {
  it('normal terrain costs 5ft per square', () => {
    expect(movementCost(1, false)).toBe(5)
    expect(movementCost(3, false)).toBe(15)
  })

  it('difficult terrain costs 10ft per square', () => {
    expect(movementCost(1, true)).toBe(10)
    expect(movementCost(3, true)).toBe(30)
  })
})

describe('validateStrike', () => {
  it('valid with 1+ actions', () => {
    expect(validateStrike(makeContext()).valid).toBe(true)
  })

  it('invalid with 0 actions', () => {
    expect(validateStrike(makeContext({ actionsRemaining: 0 })).valid).toBe(false)
  })

  it('costs 1 action', () => {
    expect(validateStrike(makeContext()).cost).toBe(1)
  })
})

describe('validateMove (Stride)', () => {
  it('valid with 1+ actions and not immobilized', () => {
    expect(validateMove(makeContext(), 5).valid).toBe(true)
  })

  it('invalid if distance exceeds speed', () => {
    expect(validateMove(makeContext({ speed: 25 }), 30).valid).toBe(false)
  })

  it('valid if distance equals speed', () => {
    expect(validateMove(makeContext({ speed: 25 }), 25).valid).toBe(true)
  })

  it('invalid when immobilized', () => {
    expect(validateMove(makeContext({
      conditions: [{ id: 'immobilized', value: 0, source: 'web' }],
    }), 5).valid).toBe(false)
  })

  it('costs 1 action', () => {
    expect(validateMove(makeContext(), 5).cost).toBe(1)
  })
})

describe('validateStep', () => {
  it('valid with 1+ actions', () => {
    expect(validateStep(makeContext()).valid).toBe(true)
  })

  it('costs 1 action', () => {
    expect(validateStep(makeContext()).cost).toBe(1)
  })

  it('max distance is 5 feet (1 square)', () => {
    expect(validateStep(makeContext()).maxDistance).toBe(5)
  })

  it('invalid when immobilized', () => {
    expect(validateStep(makeContext({
      conditions: [{ id: 'immobilized', value: 0, source: 'web' }],
    })).valid).toBe(false)
  })
})
