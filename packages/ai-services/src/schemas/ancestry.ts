import { z } from 'zod'

export const AbilityBoostSchema = z.object({
  type: z.enum(['fixed', 'free']),
  ability: z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']).optional(),
})

export const AncestryFeatureSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
})

export const AncestrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceId: z.string().min(1),
  hp: z.number().int().positive(),
  size: z.enum(['tiny', 'small', 'medium', 'large']),
  speed: z.number().int().positive(),
  abilityBoosts: z.array(AbilityBoostSchema).min(1),
  abilityFlaws: z.array(AbilityBoostSchema).default([]),
  languages: z.array(z.string()).min(1),
  traits: z.array(z.string()).default([]),
  features: z.array(AncestryFeatureSchema).default([]),
  description: z.string().default(''),
  source: z.string().default('Pathfinder Core Rulebook'),
})

export type Ancestry = z.infer<typeof AncestrySchema>
export type AbilityBoost = z.infer<typeof AbilityBoostSchema>
