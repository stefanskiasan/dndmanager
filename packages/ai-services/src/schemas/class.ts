import { z } from 'zod'

export const ClassProficiencySchema = z.object({
  category: z.string().min(1),
  rank: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
})

export const ClassSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceId: z.string().min(1),
  hp: z.number().int().positive(),
  keyAbility: z.array(z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha'])).min(1),
  proficiencies: z.array(ClassProficiencySchema).default([]),
  skillTrainedCount: z.number().int().nonnegative(),
  attackProficiency: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
  defenseProficiency: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
  perception: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
  fortitude: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
  reflex: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
  will: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
  description: z.string().default(''),
  source: z.string().default('Pathfinder Core Rulebook'),
})

export type PF2eClass = z.infer<typeof ClassSchema>
