import { z } from 'zod'

export const MonsterAbilityScoresSchema = z.object({
  str: z.number().int(),
  dex: z.number().int(),
  con: z.number().int(),
  int: z.number().int(),
  wis: z.number().int(),
  cha: z.number().int(),
})

export const MonsterStrikeSchema = z.object({
  name: z.string().min(1),
  attackBonus: z.number().int(),
  damage: z.string(),
  damageType: z.string(),
  traits: z.array(z.string()).default([]),
})

export const MonsterSpellcastingSchema = z.object({
  tradition: z.enum(['arcane', 'divine', 'occult', 'primal']),
  dc: z.number().int(),
  attack: z.number().int().optional(),
  spells: z.record(z.string(), z.array(z.string())),
})

export const MonsterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceId: z.string().min(1),
  level: z.number().int(),
  traits: z.array(z.string()).default([]),
  size: z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']),
  alignment: z.string().optional(),
  hp: z.number().int().positive(),
  ac: z.number().int().positive(),
  fortitude: z.number().int(),
  reflex: z.number().int(),
  will: z.number().int(),
  perception: z.number().int(),
  speed: z.number().int().nonnegative(),
  abilities: MonsterAbilityScoresSchema,
  immunities: z.array(z.string()).default([]),
  resistances: z.record(z.string(), z.number()).default({}),
  weaknesses: z.record(z.string(), z.number()).default({}),
  strikes: z.array(MonsterStrikeSchema).default([]),
  spellcasting: MonsterSpellcastingSchema.optional(),
  specialAbilities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    actionCost: z.enum(['free', 'reaction', '1', '2', '3', 'passive']).default('passive'),
  })).default([]),
  description: z.string().default(''),
  source: z.string().default('Pathfinder Bestiary'),
})

export type Monster = z.infer<typeof MonsterSchema>
