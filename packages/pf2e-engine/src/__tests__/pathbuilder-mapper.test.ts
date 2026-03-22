import { describe, it, expect } from 'vitest'
import { mapPathbuilderToCharacter, numericToRank } from '../pathbuilder/mapper.js'
import type { PathbuilderExport } from '../pathbuilder/schema.js'

function createFixture(overrides?: Partial<PathbuilderExport['build']>): PathbuilderExport {
  return {
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
      specials: ['Attack of Opportunity'],
      lores: [['Gladiatorial Lore', 2]],
      equipment: [['Adventurers Pack', 1]],
      specificProficiencies: { trained: [], expert: [], master: [], legendary: [] },
      weapons: [{
        name: 'Longsword', qty: 1, prof: 'martial', die: 'd8', pot: 1,
        str: 'striking', mat: null, display: '+1 Striking Longsword',
        rpieces: null, damageType: 'S', weight: '1', range: null,
      }],
      money: { pp: 0, gp: 15, sp: 5, cp: 0 },
      armor: [{
        name: 'Full Plate', qty: 1, prof: 'heavy', pot: 1, res: '',
        mat: null, display: '+1 Full Plate', worn: true, rpieces: null,
      }],
      spellCasters: [],
      focusPoints: 0,
      focus: {},
      pets: [],
      acTotal: { acProfBonus: 7, acAbilityBonus: 1, acItemBonus: 6, acTotal: 24, shieldBonus: null },
      skills: {
        acrobatics: 0, arcana: 0, athletics: 4, crafting: 0, deception: 0,
        diplomacy: 0, intimidation: 2, medicine: 0, nature: 0, occultism: 0,
        performance: 2, religion: 0, society: 0, stealth: 0, survival: 0, thievery: 0,
      },
      hitpoints: 73,
      familiars: [],
      formula: [],
      bulk: 5,
      ...overrides,
    },
  }
}

describe('numericToRank', () => {
  it('maps 0 to untrained', () => expect(numericToRank(0)).toBe('untrained'))
  it('maps 2 to trained', () => expect(numericToRank(2)).toBe('trained'))
  it('maps 4 to expert', () => expect(numericToRank(4)).toBe('expert'))
  it('maps 6 to master', () => expect(numericToRank(6)).toBe('master'))
  it('maps 8 to legendary', () => expect(numericToRank(8)).toBe('legendary'))
  it('maps 3 to trained (rounds down)', () => expect(numericToRank(3)).toBe('trained'))
})

describe('mapPathbuilderToCharacter', () => {
  it('maps basic character info', () => {
    const result = mapPathbuilderToCharacter(createFixture())
    expect(result.name).toBe('Valeros')
    expect(result.level).toBe(5)
    expect(result.data.class).toBe('Fighter')
    expect(result.data.ancestry).toBe('Human')
    expect(result.data.heritage).toBe('Versatile Human')
    expect(result.data.background).toBe('Gladiator')
  })

  it('maps ability scores correctly', () => {
    const { data } = mapPathbuilderToCharacter(createFixture())
    expect(data.abilities).toEqual({ str: 19, dex: 14, con: 16, int: 10, wis: 12, cha: 10 })
  })

  it('maps proficiency ranks for saves', () => {
    const { data } = mapPathbuilderToCharacter(createFixture())
    expect(data.saves.fortitude).toBe('expert')
    expect(data.saves.reflex).toBe('expert')
    expect(data.saves.will).toBe('trained')
  })

  it('maps skill proficiencies', () => {
    const { data } = mapPathbuilderToCharacter(createFixture())
    expect(data.skills.athletics).toBe('expert')
    expect(data.skills.intimidation).toBe('trained')
    expect(data.skills.arcana).toBe('untrained')
  })

  it('maps weapons', () => {
    const { data } = mapPathbuilderToCharacter(createFixture())
    expect(data.weapons).toHaveLength(1)
    expect(data.weapons[0].name).toBe('Longsword')
    expect(data.weapons[0].potency).toBe(1)
  })

  it('maps feats with levels', () => {
    const { data } = mapPathbuilderToCharacter(createFixture())
    expect(data.feats).toEqual([
      { name: 'Power Attack', level: 1 },
      { name: 'Sudden Charge', level: 2 },
    ])
  })

  it('maps size correctly', () => {
    const { data } = mapPathbuilderToCharacter(createFixture({ size: 1 }))
    expect(data.size).toBe('small')
  })

  it('sets import metadata', () => {
    const { data } = mapPathbuilderToCharacter(createFixture())
    expect(data.importSource).toBe('pathbuilder2e')
    expect(data.importedAt).toBeTruthy()
  })

  it('maps spellcasters when present', () => {
    const fixture = createFixture({
      spellCasters: [{
        name: 'Sorcerer',
        magicTradition: 'arcane',
        spellcastingType: 'spontaneous',
        ability: 'cha',
        proficiency: 4,
        focusPoints: 1,
        spells: [
          { spellLevel: 0, list: ['Electric Arc', 'Shield'] },
          { spellLevel: 1, list: ['Magic Missile', 'Fear'] },
        ],
        perDay: [5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      }],
    })
    const { data } = mapPathbuilderToCharacter(fixture)
    expect(data.spellcasting).toHaveLength(1)
    expect(data.spellcasting[0].tradition).toBe('arcane')
    expect(data.spellcasting[0].abilityId).toBe('cha')
    expect(data.spellcasting[0].slots).toEqual([{ level: 1, max: 3, used: 0 }])
    expect(data.spellcasting[0].knownSpells).toEqual([
      'Electric Arc', 'Shield', 'Magic Missile', 'Fear',
    ])
  })
})
