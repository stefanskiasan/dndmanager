import { z } from 'zod'

export const SpellDamageSchema = z.object({
  formula: z.string(),
  type: z.string(),
}).optional()

export const SpellAreaSchema = z.object({
  type: z.enum(['burst', 'cone', 'emanation', 'line', 'wall']),
  size: z.number().int().positive(),
}).optional()

export const SpellSaveSchema = z.object({
  type: z.enum(['fortitude', 'reflex', 'will']),
  basic: z.boolean().default(false),
}).optional()

export const SpellSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceId: z.string().min(1),
  level: z.number().int().min(0).max(10),
  traditions: z.array(z.enum(['arcane', 'divine', 'occult', 'primal'])).min(1),
  school: z.string().optional(),
  components: z.array(z.enum(['focus', 'material', 'somatic', 'verbal'])).default([]),
  castActions: z.union([z.enum(['free', 'reaction']), z.number().int().min(1).max(3)]),
  range: z.number().int().nonnegative().optional(),
  area: SpellAreaSchema,
  save: SpellSaveSchema,
  damage: SpellDamageSchema,
  duration: z.string().optional(),
  sustained: z.boolean().default(false),
  traits: z.array(z.string()).default([]),
  description: z.string().default(''),
  heightening: z.record(z.string(), z.string()).optional(),
  source: z.string().default('Pathfinder Core Rulebook'),
})

export type Spell = z.infer<typeof SpellSchema>
