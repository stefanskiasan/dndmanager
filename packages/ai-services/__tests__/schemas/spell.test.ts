import { describe, it, expect } from 'vitest'
import { SpellSchema } from '../../src/schemas/spell'

describe('SpellSchema', () => {
  const validSpell = {
    id: 'fireball',
    name: 'Fireball',
    sourceId: 'foundry-fireball',
    level: 3,
    traditions: ['arcane', 'primal'],
    components: ['somatic', 'verbal'],
    castActions: 2,
    range: 500,
    area: { type: 'burst', size: 20 },
    save: { type: 'reflex', basic: true },
    damage: { formula: '6d6', type: 'fire' },
  }

  it('accepts valid spell data', () => {
    const result = SpellSchema.safeParse(validSpell)
    expect(result.success).toBe(true)
  })

  it('rejects level above 10', () => {
    const result = SpellSchema.safeParse({ ...validSpell, level: 11 })
    expect(result.success).toBe(false)
  })

  it('rejects empty traditions', () => {
    const result = SpellSchema.safeParse({ ...validSpell, traditions: [] })
    expect(result.success).toBe(false)
  })

  it('accepts cantrips at level 0', () => {
    const cantrip = { ...validSpell, level: 0, id: 'daze', name: 'Daze' }
    const result = SpellSchema.safeParse(cantrip)
    expect(result.success).toBe(true)
  })
})
