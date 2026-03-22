import { describe, it, expect } from 'vitest'
import {
  getTreasureByLevel, generateEncounterLoot,
  LootRollResult, EncounterDifficulty,
} from '../loot-tables.js'
import { toCopper } from '../currency.js'

describe('getTreasureByLevel', () => {
  it('returns treasure budget for party level 1', () => {
    const budget = getTreasureByLevel(1)
    expect(budget).toBeDefined()
    expect(budget.totalGp).toBeGreaterThan(0)
    expect(budget.permanentItems).toBeDefined()
    expect(budget.consumables).toBeDefined()
    expect(budget.currency).toBeDefined()
  })

  it('scales treasure with level', () => {
    const level1 = getTreasureByLevel(1)
    const level5 = getTreasureByLevel(5)
    expect(level5.totalGp).toBeGreaterThan(level1.totalGp)
  })

  it('clamps to valid level range 1-20', () => {
    expect(getTreasureByLevel(0).totalGp).toBe(getTreasureByLevel(1).totalGp)
    expect(getTreasureByLevel(25).totalGp).toBe(getTreasureByLevel(20).totalGp)
  })
})

describe('generateEncounterLoot', () => {
  it('generates loot for a moderate encounter', () => {
    const loot = generateEncounterLoot({
      partyLevel: 3,
      difficulty: 'moderate',
      partySize: 4,
      rng: () => 0.5, // deterministic
    })
    expect(loot.currency).toBeDefined()
    expect(loot.items.length).toBeGreaterThanOrEqual(0)
  })

  it('trivial encounters give less loot than severe', () => {
    const trivial = generateEncounterLoot({
      partyLevel: 5,
      difficulty: 'trivial',
      partySize: 4,
      rng: () => 0.5,
    })
    const severe = generateEncounterLoot({
      partyLevel: 5,
      difficulty: 'severe',
      partySize: 4,
      rng: () => 0.5,
    })
    const trivialValue = trivial.currency.gp + trivial.items.length * 10
    const severeValue = severe.currency.gp + severe.items.length * 10
    expect(severeValue).toBeGreaterThan(trivialValue)
  })

  it('scales loot for non-standard party sizes', () => {
    const party4 = generateEncounterLoot({
      partyLevel: 5,
      difficulty: 'moderate',
      partySize: 4,
      rng: () => 0.5,
    })
    const party6 = generateEncounterLoot({
      partyLevel: 5,
      difficulty: 'moderate',
      partySize: 6,
      rng: () => 0.5,
    })
    // 6-player party should get ~50% more than 4-player
    expect(toCopper(party6.currency)).toBeGreaterThan(toCopper(party4.currency))
  })

  it('uses custom rng for deterministic output', () => {
    const a = generateEncounterLoot({
      partyLevel: 3,
      difficulty: 'moderate',
      partySize: 4,
      rng: () => 0.3,
    })
    const b = generateEncounterLoot({
      partyLevel: 3,
      difficulty: 'moderate',
      partySize: 4,
      rng: () => 0.3,
    })
    expect(a).toEqual(b)
  })

  it('returns item stubs with name, level, and category', () => {
    const loot = generateEncounterLoot({
      partyLevel: 5,
      difficulty: 'moderate',
      partySize: 4,
      rng: () => 0.7,
    })
    for (const item of loot.items) {
      expect(item.name).toBeDefined()
      expect(item.level).toBeGreaterThanOrEqual(0)
      expect(item.category).toBeDefined()
    }
  })
})
