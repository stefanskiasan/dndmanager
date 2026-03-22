import { z } from 'zod'

export const FeatPrerequisiteSchema = z.object({
  type: z.enum(['skill', 'feat', 'ability', 'level', 'other']),
  value: z.string(),
})

export const FeatSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceId: z.string().min(1),
  level: z.number().int().nonnegative(),
  featType: z.enum(['ancestry', 'class', 'skill', 'general', 'archetype']),
  actionCost: z.enum(['free', 'reaction', '1', '2', '3', 'passive']).default('passive'),
  traits: z.array(z.string()).default([]),
  prerequisites: z.array(FeatPrerequisiteSchema).default([]),
  description: z.string().default(''),
  source: z.string().default('Pathfinder Core Rulebook'),
})

export type Feat = z.infer<typeof FeatSchema>
