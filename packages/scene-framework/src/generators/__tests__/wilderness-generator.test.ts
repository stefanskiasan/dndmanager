import { describe, it, expect } from 'vitest'
import { generateWilderness } from '../wilderness-generator.js'
import type { WildernessConfig } from '../types.js'

describe('generateWilderness', () => {
  const baseConfig: WildernessConfig = { seed: 42, template: 'forest', level: 3 }

  it('generates points of interest as rooms', () => {
    const result = generateWilderness(baseConfig)
    expect(result.rooms.length).toBeGreaterThanOrEqual(3) // default POI count
  })

  it('is deterministic', () => {
    const a = generateWilderness({ seed: 42, template: 'forest', level: 3 })
    const b = generateWilderness({ seed: 42, template: 'forest', level: 3 })
    expect(a.rooms.map((r) => r.id)).toEqual(b.rooms.map((r) => r.id))
  })

  it('uses template-specific lighting', () => {
    const cave = generateWilderness({ seed: 42, template: 'cave', level: 3 })
    const caveLighting = cave.rooms.map((r) => r.lighting)
    expect(caveLighting.some((l) => l === 'darkness' || l === 'dim')).toBe(true)
  })

  it('different templates produce different tile sets', () => {
    const forest = generateWilderness({ seed: 42, template: 'forest', level: 3 })
    const ruin = generateWilderness({ seed: 42, template: 'ruin', level: 3 })
    const forestScenario = forest.toScenario()
    const ruinScenario = ruin.toScenario()
    expect(forestScenario.maps[0].tiles).not.toBe(ruinScenario.maps[0].tiles)
  })

  it('respects custom pointsOfInterest count', () => {
    const result = generateWilderness({ seed: 42, template: 'forest', level: 3, pointsOfInterest: 6 })
    expect(result.rooms.length).toBeGreaterThanOrEqual(6)
  })

  it('returns a valid Scenario through toScenario()', () => {
    const result = generateWilderness(baseConfig)
    const scenario = result.toScenario()
    expect(scenario.name).toBeTruthy()
    expect(scenario.maps).toHaveLength(1)
    expect(scenario.encounters.length).toBeGreaterThan(0)
  })
})
