import { describe, it, expect } from 'vitest'
import { validateCharacterData } from '../pathbuilder/validator.js'
import type { CharacterData } from '../pathbuilder/mapper.js'

function createValidData(overrides?: Partial<CharacterData>): CharacterData {
  return {
    abilities: { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
    hitpoints: 73,
    level: 5,
    class: 'Fighter',
    ancestry: 'Human',
    heritage: 'Versatile Human',
    background: 'Gladiator',
    size: 'medium',
    keyAbility: 'str',
    languages: ['Common'],
    saves: { fortitude: 'expert', reflex: 'expert', will: 'trained' },
    perception: 'expert',
    skills: { athletics: 'expert', stealth: 'untrained' },
    lores: [],
    armorProficiencies: { unarmored: 'trained', light: 'trained', medium: 'trained', heavy: 'trained' },
    weaponProficiencies: { unarmed: 'expert', simple: 'expert', martial: 'expert', advanced: 'trained' },
    classDC: 'expert',
    weapons: [],
    armor: [],
    feats: [],
    specials: [],
    spellcasting: [],
    money: { pp: 0, gp: 0, sp: 0, cp: 0 },
    importSource: 'pathbuilder2e',
    importedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('validateCharacterData', () => {
  it('passes for valid character data', () => {
    const result = validateCharacterData(createValidData())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects ability score below minimum', () => {
    const result = validateCharacterData(createValidData({
      abilities: { str: 0, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
    }))
    expect(result.valid).toBe(false)
    expect(result.errors[0].field).toBe('abilities.str')
  })

  it('rejects ability score above maximum', () => {
    const result = validateCharacterData(createValidData({
      abilities: { str: 50, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
    }))
    expect(result.valid).toBe(false)
  })

  it('rejects level 0', () => {
    const result = validateCharacterData(createValidData({ level: 0 }))
    expect(result.valid).toBe(false)
    expect(result.errors[0].field).toBe('level')
  })

  it('rejects level above 20', () => {
    const result = validateCharacterData(createValidData({ level: 21 }))
    expect(result.valid).toBe(false)
  })

  it('rejects zero hitpoints', () => {
    const result = validateCharacterData(createValidData({ hitpoints: 0 }))
    expect(result.valid).toBe(false)
  })

  it('rejects empty class', () => {
    const result = validateCharacterData(createValidData({ class: '' }))
    expect(result.valid).toBe(false)
  })

  it('warns on unusual proficiency at low level', () => {
    const result = validateCharacterData(createValidData({
      level: 1,
      saves: { fortitude: 'master', reflex: 'trained', will: 'trained' },
    }))
    expect(result.valid).toBe(true) // warnings don't fail
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
