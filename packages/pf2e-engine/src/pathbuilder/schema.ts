/**
 * Types representing the Pathbuilder 2e JSON export format.
 * Only fields we consume are typed — the rest is ignored.
 * Reference: Pathbuilder 2e export via "Export JSON" button.
 */

export interface PathbuilderAbilities {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface PathbuilderProficiencies {
  classDC: number
  perception: number
  fortitude: number
  reflex: number
  will: number
  heavy: number
  medium: number
  light: number
  unarmored: number
  advanced: number
  martial: number
  simple: number
  unarmed: number
  castingArcane: number
  castingDivine: number
  castingOccult: number
  castingPrimal: number
}

export interface PathbuilderWeapon {
  name: string
  qty: number
  prof: string
  die: string
  pot: number       // potency rune (+1/+2/+3)
  str: string       // striking rune
  mat: string | null
  display: string
  rpieces: string | null
  damageType: string
  weight: string
  range: number | null
}

export interface PathbuilderArmor {
  name: string
  qty: number
  prof: string
  pot: number
  res: string
  mat: string | null
  display: string
  worn: boolean
  rpieces: string | null
}

export interface PathbuilderSpellcaster {
  name: string
  magicTradition: string
  spellcastingType: string       // 'prepared' | 'spontaneous'
  ability: string                // e.g. 'cha', 'int'
  proficiency: number
  focusPoints: number
  spells: PathbuilderSpellLevel[]
  perDay: number[]               // slots per level [cantrips, 1st, 2nd, ...]
}

export interface PathbuilderSpellLevel {
  spellLevel: number
  list: string[]                 // spell names
}

export interface PathbuilderFeat {
  name: string
  sourceId?: string
  displayName?: string
}

export interface PathbuilderLore {
  name: string
  proficiency: number
}

export interface PathbuilderBuild {
  name: string
  class: string
  dualClass: string | null
  level: number
  ancestry: string
  heritage: string
  background: string
  alignment: string
  gender: string
  age: string
  deity: string
  size: number                   // 0=tiny, 1=small, 2=medium, 3=large, 4=huge
  keyability: string
  languages: string[]
  rituals: string[]
  resistances: string[]
  inventorMods: string[]
  attributes: PathbuilderAbilities
  abilities: PathbuilderAbilities
  proficiencies: PathbuilderProficiencies
  feats: [string, string | null, string | null, number][]  // [name, source, note, level]
  specials: string[]
  lores: [string, number][]     // [loreName, proficiencyRank]
  equipment: [string, number][] // [itemName, quantity]
  specificProficiencies: {
    trained: string[]
    expert: string[]
    master: string[]
    legendary: string[]
  }
  weapons: PathbuilderWeapon[]
  money: { pp: number; gp: number; sp: number; cp: number }
  armor: PathbuilderArmor[]
  spellCasters: PathbuilderSpellcaster[]
  focusPoints: number
  focus: Record<string, { focusCantrips: string[]; focusSpells: string[] }>
  pets: unknown[]
  acTotal: {
    acProfBonus: number
    acAbilityBonus: number
    acItemBonus: number
    acTotal: number
    shieldBonus: number | null
  }
  skills: Record<string, number> // skill name → proficiency rank (0-4)
  hitpoints: number
  familiars: unknown[]
  formula: string[]
  bulk: number
}

/** Top-level Pathbuilder 2e JSON export shape */
export interface PathbuilderExport {
  success: boolean
  build: PathbuilderBuild
}
