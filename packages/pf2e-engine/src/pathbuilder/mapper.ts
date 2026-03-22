import type { AbilityScores, ProficiencyRank, SpellcastingState, SpellTradition, AbilityId } from '../types.js'
import type { PathbuilderExport, PathbuilderSpellcaster } from './schema.js'

// ---- Our internal character data shape (stored in characters.data JSONB) ----

export interface CharacterData {
  abilities: AbilityScores
  hitpoints: number
  level: number
  class: string
  ancestry: string
  heritage: string
  background: string
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge'
  keyAbility: AbilityId
  languages: string[]
  saves: {
    fortitude: ProficiencyRank
    reflex: ProficiencyRank
    will: ProficiencyRank
  }
  perception: ProficiencyRank
  skills: Record<string, ProficiencyRank>
  lores: { name: string; rank: ProficiencyRank }[]
  armorProficiencies: {
    unarmored: ProficiencyRank
    light: ProficiencyRank
    medium: ProficiencyRank
    heavy: ProficiencyRank
  }
  weaponProficiencies: {
    unarmed: ProficiencyRank
    simple: ProficiencyRank
    martial: ProficiencyRank
    advanced: ProficiencyRank
  }
  classDC: ProficiencyRank
  weapons: {
    name: string
    display: string
    die: string
    damageType: string
    potency: number
    striking: string
    range: number | null
    proficiency: string
  }[]
  armor: {
    name: string
    display: string
    potency: number
    resilient: string
    worn: boolean
    proficiency: string
  }[]
  feats: { name: string; level: number }[]
  specials: string[]
  spellcasting: SpellcastingState[]
  money: { pp: number; gp: number; sp: number; cp: number }
  importSource: 'pathbuilder2e'
  importedAt: string
}

/** Pathbuilder uses 0-8 numeric proficiency -> our ProficiencyRank */
export function numericToRank(value: number): ProficiencyRank {
  if (value >= 8) return 'legendary'
  if (value >= 6) return 'master'
  if (value >= 4) return 'expert'
  if (value >= 2) return 'trained'
  return 'untrained'
}

const SIZE_MAP: Record<number, CharacterData['size']> = {
  0: 'tiny',
  1: 'small',
  2: 'medium',
  3: 'large',
  4: 'huge',
}

const ABILITY_KEYS: AbilityId[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function isAbilityId(s: string): s is AbilityId {
  return ABILITY_KEYS.includes(s as AbilityId)
}

function mapSpellTradition(tradition: string): SpellTradition {
  const t = tradition.toLowerCase()
  if (t === 'arcane' || t === 'divine' || t === 'occult' || t === 'primal') return t
  return 'arcane' // fallback
}

function mapSpellcaster(caster: PathbuilderSpellcaster): SpellcastingState {
  const tradition = mapSpellTradition(caster.magicTradition)
  const abilityId: AbilityId = isAbilityId(caster.ability) ? caster.ability : 'cha'

  const slots = caster.perDay
    .map((count, level) => ({ level, max: count, used: 0 }))
    .filter((s) => s.level > 0 && s.max > 0) // exclude cantrip row and empty

  const knownSpells = caster.spells.flatMap((sl) => sl.list)

  return {
    tradition,
    abilityId,
    slots,
    knownSpells,
    ...(caster.spellcastingType === 'prepared' ? { preparedSpells: knownSpells } : {}),
  }
}

const SKILL_NAMES = [
  'acrobatics', 'arcana', 'athletics', 'crafting', 'deception',
  'diplomacy', 'intimidation', 'medicine', 'nature', 'occultism',
  'performance', 'religion', 'society', 'stealth', 'survival', 'thievery',
] as const

export function mapPathbuilderToCharacter(input: PathbuilderExport): {
  name: string
  level: number
  data: CharacterData
} {
  const b = input.build

  const skills: Record<string, ProficiencyRank> = {}
  for (const skill of SKILL_NAMES) {
    skills[skill] = numericToRank(b.skills[skill] ?? 0)
  }

  const lores = b.lores.map(([name, rank]) => ({
    name,
    rank: numericToRank(rank),
  }))

  const weapons = b.weapons.map((w) => ({
    name: w.name,
    display: w.display,
    die: w.die,
    damageType: w.damageType,
    potency: w.pot,
    striking: w.str,
    range: w.range,
    proficiency: w.prof,
  }))

  const armor = b.armor.map((a) => ({
    name: a.name,
    display: a.display,
    potency: a.pot,
    resilient: a.res,
    worn: a.worn,
    proficiency: a.prof,
  }))

  const feats = b.feats.map(([name, , , level]) => ({ name, level }))

  const spellcasting = b.spellCasters.map(mapSpellcaster)

  const data: CharacterData = {
    abilities: { ...b.abilities },
    hitpoints: b.hitpoints,
    level: b.level,
    class: b.class,
    ancestry: b.ancestry,
    heritage: b.heritage,
    background: b.background,
    size: SIZE_MAP[b.size] ?? 'medium',
    keyAbility: isAbilityId(b.keyability) ? b.keyability : 'str',
    languages: [...b.languages],
    saves: {
      fortitude: numericToRank(b.proficiencies.fortitude),
      reflex: numericToRank(b.proficiencies.reflex),
      will: numericToRank(b.proficiencies.will),
    },
    perception: numericToRank(b.proficiencies.perception),
    skills,
    lores,
    armorProficiencies: {
      unarmored: numericToRank(b.proficiencies.unarmored),
      light: numericToRank(b.proficiencies.light),
      medium: numericToRank(b.proficiencies.medium),
      heavy: numericToRank(b.proficiencies.heavy),
    },
    weaponProficiencies: {
      unarmed: numericToRank(b.proficiencies.unarmed),
      simple: numericToRank(b.proficiencies.simple),
      martial: numericToRank(b.proficiencies.martial),
      advanced: numericToRank(b.proficiencies.advanced),
    },
    classDC: numericToRank(b.proficiencies.classDC),
    weapons,
    armor,
    feats,
    specials: [...b.specials],
    spellcasting,
    money: { ...b.money },
    importSource: 'pathbuilder2e',
    importedAt: new Date().toISOString(),
  }

  return { name: b.name, level: b.level, data }
}
