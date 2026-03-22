import { z } from 'zod'

export const WeaponStatsSchema = z.object({
  damage: z.string(),
  damageType: z.enum(['bludgeoning', 'piercing', 'slashing']),
  hands: z.enum(['1', '1+', '2']),
  range: z.number().int().nonnegative().optional(),
  reload: z.number().int().nonnegative().optional(),
  group: z.string(),
  category: z.enum(['simple', 'martial', 'advanced', 'unarmed']),
})

export const ArmorStatsSchema = z.object({
  acBonus: z.number().int().nonnegative(),
  dexCap: z.number().int().nonnegative().optional(),
  checkPenalty: z.number().int().nonpositive().default(0),
  speedPenalty: z.number().int().nonpositive().default(0),
  strength: z.number().int().nonnegative().optional(),
  group: z.string(),
  category: z.enum(['unarmored', 'light', 'medium', 'heavy']),
})

export const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceId: z.string().min(1),
  itemType: z.enum(['weapon', 'armor', 'shield', 'consumable', 'equipment', 'treasure']),
  level: z.number().int().nonnegative().default(0),
  price: z.object({
    gp: z.number().nonnegative().default(0),
    sp: z.number().nonnegative().default(0),
    cp: z.number().nonnegative().default(0),
  }).default({ gp: 0, sp: 0, cp: 0 }),
  bulk: z.union([z.number().nonnegative(), z.literal('L')]).default(0),
  traits: z.array(z.string()).default([]),
  weaponStats: WeaponStatsSchema.optional(),
  armorStats: ArmorStatsSchema.optional(),
  description: z.string().default(''),
  source: z.string().default('Pathfinder Core Rulebook'),
})

export type Item = z.infer<typeof ItemSchema>
