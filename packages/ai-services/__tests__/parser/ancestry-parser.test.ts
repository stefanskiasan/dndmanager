import { describe, it, expect } from 'vitest'
import { parseAncestry } from '../../src/parser/ancestry-parser'

describe('parseAncestry', () => {
  const foundryHuman = {
    _id: 'abc123',
    name: 'Human',
    type: 'ancestry',
    system: {
      hp: 8,
      size: 'med',
      speed: 25,
      boosts: {
        '0': { value: [] },
        '1': { value: [] },
      },
      flaws: {},
      languages: { value: ['common'] },
      traits: { value: ['human', 'humanoid'] },
      description: { value: '<p>Humans are <b>versatile</b></p>' },
      source: { value: 'Pathfinder Core Rulebook' },
    },
  }

  it('parses a Foundry ancestry into our schema', () => {
    const result = parseAncestry(foundryHuman)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Human')
    expect(result!.hp).toBe(8)
    expect(result!.size).toBe('medium')
    expect(result!.speed).toBe(25)
    expect(result!.traits).toEqual(['human', 'humanoid'])
  })

  it('strips HTML from description', () => {
    const result = parseAncestry(foundryHuman)
    expect(result!.description).not.toContain('<p>')
    expect(result!.description).not.toContain('<b>')
    expect(result!.description).toContain('versatile')
  })

  it('maps free boosts correctly', () => {
    const result = parseAncestry(foundryHuman)
    expect(result!.abilityBoosts).toEqual([
      { type: 'free' },
      { type: 'free' },
    ])
  })

  it('returns null for invalid data', () => {
    const result = parseAncestry({ name: 'Bad', system: null } as unknown as Record<string, unknown>)
    expect(result).toBeNull()
  })
})
