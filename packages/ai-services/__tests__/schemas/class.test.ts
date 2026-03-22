import { describe, it, expect } from 'vitest'
import { ClassSchema } from '../../src/schemas/class'

describe('ClassSchema', () => {
  const validClass = {
    id: 'fighter',
    name: 'Fighter',
    sourceId: 'foundry-fighter',
    hp: 10,
    keyAbility: ['str', 'dex'],
    skillTrainedCount: 3,
    attackProficiency: 'expert',
    defenseProficiency: 'trained',
    perception: 'expert',
    fortitude: 'expert',
    reflex: 'expert',
    will: 'trained',
  }

  it('accepts valid class data', () => {
    const result = ClassSchema.safeParse(validClass)
    expect(result.success).toBe(true)
  })

  it('rejects class with zero hp', () => {
    const result = ClassSchema.safeParse({ ...validClass, hp: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects empty keyAbility', () => {
    const result = ClassSchema.safeParse({ ...validClass, keyAbility: [] })
    expect(result.success).toBe(false)
  })
})
