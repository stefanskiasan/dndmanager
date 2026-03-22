import { describe, it, expect } from 'vitest'
import { REACTIONS, canUseReaction, resolveReaction } from '../reactions.js'

describe('REACTIONS', () => {
  it('has Reactive Strike defined', () => {
    expect(REACTIONS.reactive_strike).toBeDefined()
    expect(REACTIONS.reactive_strike.trigger).toBe('enemy_leaves_reach')
  })

  it('has Shield Block defined', () => {
    expect(REACTIONS.shield_block).toBeDefined()
    expect(REACTIONS.shield_block.trigger).toBe('damage_taken')
  })
})

describe('canUseReaction', () => {
  it('returns true when reaction available and trigger matches', () => {
    expect(canUseReaction('reactive_strike', {
      reactionAvailable: true,
      trigger: 'enemy_leaves_reach',
      conditions: [],
    })).toBe(true)
  })

  it('returns false when reaction already used', () => {
    expect(canUseReaction('reactive_strike', {
      reactionAvailable: false,
      trigger: 'enemy_leaves_reach',
      conditions: [],
    })).toBe(false)
  })

  it('returns false when trigger does not match', () => {
    expect(canUseReaction('reactive_strike', {
      reactionAvailable: true,
      trigger: 'damage_taken',
      conditions: [],
    })).toBe(false)
  })

  it('returns false when stunned', () => {
    expect(canUseReaction('reactive_strike', {
      reactionAvailable: true,
      trigger: 'enemy_leaves_reach',
      conditions: [{ id: 'stunned', value: 1, source: 'spell' }],
    })).toBe(false)
  })
})

describe('resolveReaction', () => {
  it('resolves Shield Block by reducing damage', () => {
    const result = resolveReaction('shield_block', {
      damage: 15,
      shieldHardness: 5,
      shieldHP: 20,
    })
    expect(result.damageReduced).toBe(5)
    expect(result.remainingDamage).toBe(10)
    expect(result.shieldDamage).toBe(10) // remaining damage goes to shield
  })

  it('shield breaks if damage exceeds shield HP', () => {
    const result = resolveReaction('shield_block', {
      damage: 30,
      shieldHardness: 5,
      shieldHP: 10,
    })
    expect(result.damageReduced).toBe(5)
    expect(result.shieldBroken).toBe(true)
  })

  it('resolves Reactive Strike as a normal attack', () => {
    const result = resolveReaction('reactive_strike', {
      naturalRoll: 15,
      attackBonus: 12,
      targetAC: 20,
    })
    expect(result.hit).toBeDefined()
  })
})
