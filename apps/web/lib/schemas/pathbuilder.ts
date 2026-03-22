import { z } from 'zod'

const abilitiesSchema = z.object({
  str: z.number(),
  dex: z.number(),
  con: z.number(),
  int: z.number(),
  wis: z.number(),
  cha: z.number(),
})

const proficienciesSchema = z.object({
  classDC: z.number(),
  perception: z.number(),
  fortitude: z.number(),
  reflex: z.number(),
  will: z.number(),
  heavy: z.number(),
  medium: z.number(),
  light: z.number(),
  unarmored: z.number(),
  advanced: z.number(),
  martial: z.number(),
  simple: z.number(),
  unarmed: z.number(),
  castingArcane: z.number(),
  castingDivine: z.number(),
  castingOccult: z.number(),
  castingPrimal: z.number(),
})

const weaponSchema = z.object({
  name: z.string(),
  qty: z.number(),
  prof: z.string(),
  die: z.string(),
  pot: z.number(),
  str: z.string(),
  mat: z.string().nullable(),
  display: z.string(),
  rpieces: z.string().nullable(),
  damageType: z.string(),
  weight: z.string(),
  range: z.number().nullable(),
})

const armorSchema = z.object({
  name: z.string(),
  qty: z.number(),
  prof: z.string(),
  pot: z.number(),
  res: z.string(),
  mat: z.string().nullable(),
  display: z.string(),
  worn: z.boolean(),
  rpieces: z.string().nullable(),
})

const spellLevelSchema = z.object({
  spellLevel: z.number(),
  list: z.array(z.string()),
})

const spellCasterSchema = z.object({
  name: z.string(),
  magicTradition: z.string(),
  spellcastingType: z.string(),
  ability: z.string(),
  proficiency: z.number(),
  focusPoints: z.number(),
  spells: z.array(spellLevelSchema),
  perDay: z.array(z.number()),
})

const buildSchema = z.object({
  name: z.string().min(1, 'Character name is required'),
  class: z.string().min(1),
  dualClass: z.string().nullable(),
  level: z.number().int().min(1).max(20),
  ancestry: z.string().min(1),
  heritage: z.string(),
  background: z.string(),
  alignment: z.string(),
  gender: z.string(),
  age: z.string(),
  deity: z.string(),
  size: z.number().int().min(0).max(4),
  keyability: z.string(),
  languages: z.array(z.string()),
  attributes: abilitiesSchema,
  abilities: abilitiesSchema,
  proficiencies: proficienciesSchema,
  feats: z.array(z.tuple([z.string(), z.string().nullable(), z.string().nullable(), z.number()])),
  specials: z.array(z.string()),
  lores: z.array(z.tuple([z.string(), z.number()])),
  weapons: z.array(weaponSchema),
  money: z.object({ pp: z.number(), gp: z.number(), sp: z.number(), cp: z.number() }),
  armor: z.array(armorSchema),
  spellCasters: z.array(spellCasterSchema),
  skills: z.record(z.string(), z.number()),
  hitpoints: z.number().int().min(1),
  // Required fields with relaxed inner types:
  equipment: z.array(z.tuple([z.string(), z.number()])).default([]),
  specificProficiencies: z.object({
    trained: z.array(z.string()),
    expert: z.array(z.string()),
    master: z.array(z.string()),
    legendary: z.array(z.string()),
  }).default({ trained: [], expert: [], master: [], legendary: [] }),
  focusPoints: z.number().default(0),
  focus: z.record(z.string(), z.object({
    focusCantrips: z.array(z.string()),
    focusSpells: z.array(z.string()),
  })).default({}),
  pets: z.array(z.unknown()).default([]),
  acTotal: z.object({
    acProfBonus: z.number(),
    acAbilityBonus: z.number(),
    acItemBonus: z.number(),
    acTotal: z.number(),
    shieldBonus: z.number().nullable(),
  }).default({ acProfBonus: 0, acAbilityBonus: 0, acItemBonus: 0, acTotal: 10, shieldBonus: null }),
  familiars: z.array(z.unknown()).default([]),
  formula: z.array(z.string()).default([]),
  bulk: z.number().default(0),
  rituals: z.array(z.string()).default([]),
  resistances: z.array(z.string()).default([]),
  inventorMods: z.array(z.string()).default([]),
})

export const pathbuilderExportSchema = z.object({
  success: z.boolean(),
  build: buildSchema,
})

export type PathbuilderExportInput = z.infer<typeof pathbuilderExportSchema>
