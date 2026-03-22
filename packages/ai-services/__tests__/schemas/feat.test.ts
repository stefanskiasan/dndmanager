import { describe, it, expect } from 'vitest'
import { FeatSchema } from '../../src/schemas/feat'

describe('FeatSchema', () => {
  const validFeat = {
    id: 'power-attack',
    name: 'Power Attack',
    sourceId: 'foundry-power-attack',
    level: 1,
    featType: 'class',
    actionCost: '2',
    traits: ['fighter', 'flourish'],
    description: 'Make a mighty strike',
  }

  it('accepts valid feat data', () => {
    const result = FeatSchema.safeParse(validFeat)
    expect(result.success).toBe(true)
  })

  it('rejects negative level', () => {
    const result = FeatSchema.safeParse({ ...validFeat, level: -1 })
    expect(result.success).toBe(false)
  })

  it('defaults to passive if no actionCost', () => {
    const { actionCost, ...noAction } = validFeat
    const result = FeatSchema.parse(noAction)
    expect(result.actionCost).toBe('passive')
  })
})
