import { describe, it, expect } from 'vitest'
import type { PathbuilderExport } from '../pathbuilder/schema.js'

// Minimal valid fixture matching the Pathbuilder export shape
const FIXTURE: PathbuilderExport = {
  success: true,
  build: {
    name: 'Valeros',
    class: 'Fighter',
    dualClass: null,
    level: 5,
    ancestry: 'Human',
    heritage: 'Versatile Human',
    background: 'Gladiator',
    alignment: 'NG',
    gender: 'Male',
    age: '28',
    deity: 'Gorum',
    size: 2,
    keyability: 'str',
    languages: ['Common', 'Orcish'],
    rituals: [],
    resistances: [],
    inventorMods: [],
    attributes: { str: 19, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
    abilities: { str: 19, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
    proficiencies: {
      classDC: 4, perception: 4,
      fortitude: 4, reflex: 4, will: 2,
      heavy: 2, medium: 2, light: 2, unarmored: 2,
      advanced: 2, martial: 4, simple: 4, unarmed: 4,
      castingArcane: 0, castingDivine: 0, castingOccult: 0, castingPrimal: 0,
    },
    feats: [['Power Attack', null, null, 1], ['Sudden Charge', null, null, 2]],
    specials: ['Attack of Opportunity', 'Shield Block'],
    lores: [['Gladiatorial Lore', 2]],
    equipment: [['Adventurers Pack', 1]],
    specificProficiencies: { trained: [], expert: [], master: [], legendary: [] },
    weapons: [{
      name: 'Longsword',
      qty: 1,
      prof: 'martial',
      die: 'd8',
      pot: 1,
      str: 'striking',
      mat: null,
      display: '+1 Striking Longsword',
      rpieces: null,
      damageType: 'S',
      weight: '1',
      range: null,
    }],
    money: { pp: 0, gp: 15, sp: 5, cp: 0 },
    armor: [{
      name: 'Full Plate',
      qty: 1,
      prof: 'heavy',
      pot: 1,
      res: '',
      mat: null,
      display: '+1 Full Plate',
      worn: true,
      rpieces: null,
    }],
    spellCasters: [],
    focusPoints: 0,
    focus: {},
    pets: [],
    acTotal: {
      acProfBonus: 7,
      acAbilityBonus: 1,
      acItemBonus: 6,
      acTotal: 24,
      shieldBonus: null,
    },
    skills: {
      acrobatics: 0,
      arcana: 0,
      athletics: 4,
      crafting: 0,
      deception: 0,
      diplomacy: 0,
      intimidation: 2,
      medicine: 0,
      nature: 0,
      occultism: 0,
      performance: 2,
      religion: 0,
      society: 0,
      stealth: 0,
      survival: 0,
      thievery: 0,
    },
    hitpoints: 73,
    familiars: [],
    formula: [],
    bulk: 5,
  },
}

describe('PathbuilderExport type', () => {
  it('fixture satisfies the type shape', () => {
    // Type assertion — if this compiles, the shape is correct
    const data: PathbuilderExport = FIXTURE
    expect(data.success).toBe(true)
    expect(data.build.name).toBe('Valeros')
    expect(data.build.level).toBe(5)
  })

  it('has valid ability scores', () => {
    const { abilities } = FIXTURE.build
    expect(abilities.str).toBeGreaterThanOrEqual(1)
    expect(abilities.dex).toBeGreaterThanOrEqual(1)
    expect(abilities.con).toBeGreaterThanOrEqual(1)
    expect(abilities.int).toBeGreaterThanOrEqual(1)
    expect(abilities.wis).toBeGreaterThanOrEqual(1)
    expect(abilities.cha).toBeGreaterThanOrEqual(1)
  })

  it('has proficiency values in 0-8 range', () => {
    const { proficiencies } = FIXTURE.build
    for (const val of Object.values(proficiencies)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(8)
    }
  })
})
