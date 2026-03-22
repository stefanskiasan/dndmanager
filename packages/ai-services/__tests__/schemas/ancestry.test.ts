import { describe, it, expect } from 'vitest'
import { AncestrySchema } from '../../src/schemas/ancestry'

describe('AncestrySchema', () => {
  const validAncestry = {
    id: 'human',
    name: 'Human',
    sourceId: 'foundry-human',
    hp: 8,
    size: 'medium',
    speed: 25,
    abilityBoosts: [
      { type: 'free' },
      { type: 'free' },
    ],
    languages: ['Common'],
    traits: ['human', 'humanoid'],
  }

  it('accepts valid ancestry data', () => {
    const result = AncestrySchema.safeParse(validAncestry)
    expect(result.success).toBe(true)
  })

  it('rejects ancestry without name', () => {
    const result = AncestrySchema.safeParse({ ...validAncestry, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid size', () => {
    const result = AncestrySchema.safeParse({ ...validAncestry, size: 'colossal' })
    expect(result.success).toBe(false)
  })

  it('rejects negative hp', () => {
    const result = AncestrySchema.safeParse({ ...validAncestry, hp: -1 })
    expect(result.success).toBe(false)
  })

  it('applies defaults for optional fields', () => {
    const result = AncestrySchema.parse(validAncestry)
    expect(result.abilityFlaws).toEqual([])
    expect(result.features).toEqual([])
    expect(result.traits).toEqual(['human', 'humanoid'])
    expect(result.source).toBe('Pathfinder Core Rulebook')
  })
})
