import type { Currency, ItemCategory } from './types.js'
import { fromCopper } from './currency.js'

// ─── Types ───────────────────────────────────

export type EncounterDifficulty = 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme'

export interface TreasureBudget {
  totalGp: number
  permanentItems: { level: number; count: number }[]
  consumables: { level: number; count: number }[]
  currency: number // in gp
}

export interface LootItemStub {
  name: string
  level: number
  category: ItemCategory
  valueGp: number
}

export interface LootRollResult {
  currency: Currency
  items: LootItemStub[]
}

export interface GenerateLootParams {
  partyLevel: number
  difficulty: EncounterDifficulty
  partySize: number
  rng?: () => number // injectable RNG, defaults to Math.random
}

// ─── PF2e Treasure by Level (CRB Table 10-9) ─

/**
 * Total party treasure per level in gp (for 4 players over a full level).
 * Source: PF2e Core Rulebook Table 10-9.
 */
const TREASURE_PER_LEVEL_GP: Record<number, number> = {
  1: 175,
  2: 300,
  3: 500,
  4: 850,
  5: 1350,
  6: 2000,
  7: 2900,
  8: 4000,
  9: 5700,
  10: 8000,
  11: 11500,
  12: 16500,
  13: 25000,
  14: 36500,
  15: 54500,
  16: 82500,
  17: 128000,
  18: 208000,
  19: 355000,
  20: 490000,
}

/**
 * Permanent item levels available at each party level.
 * Simplified: party level -1 to party level +1.
 */
function permanentItemLevels(partyLevel: number): { level: number; count: number }[] {
  return [
    { level: Math.max(1, partyLevel + 1), count: 2 },
    { level: Math.max(1, partyLevel), count: 2 },
    { level: Math.max(1, partyLevel - 1), count: 2 },
  ]
}

/**
 * Consumable item levels available at each party level.
 */
function consumableItemLevels(partyLevel: number): { level: number; count: number }[] {
  return [
    { level: Math.max(1, partyLevel + 1), count: 2 },
    { level: Math.max(1, partyLevel), count: 2 },
    { level: Math.max(1, partyLevel - 1), count: 4 },
  ]
}

// ─── Difficulty Multipliers ──────────────────

/**
 * Fraction of a level's total treasure budget that a single encounter
 * of this difficulty represents. A full level has ~8-12 encounters,
 * so these fractions approximate 1 encounter's share.
 */
const DIFFICULTY_MULTIPLIER: Record<EncounterDifficulty, number> = {
  trivial: 0.04,
  low: 0.07,
  moderate: 0.10,
  severe: 0.14,
  extreme: 0.19,
}

// ─── Public API ──────────────────────────────

/**
 * Returns the full-level treasure budget for a given party level.
 */
export function getTreasureByLevel(level: number): TreasureBudget {
  const clamped = Math.max(1, Math.min(20, level))
  const totalGp = TREASURE_PER_LEVEL_GP[clamped]
  return {
    totalGp,
    permanentItems: permanentItemLevels(clamped),
    consumables: consumableItemLevels(clamped),
    currency: Math.round(totalGp * 0.1), // ~10% as loose coin
  }
}

// ─── Generic Consumable / Permanent Names ────

const CONSUMABLE_NAMES: Record<string, string[]> = {
  potion: ['Healing Potion (Minor)', 'Healing Potion (Lesser)', 'Healing Potion (Moderate)', 'Antidote', 'Antiplague', 'Darkvision Elixir', 'Eagle Eye Elixir'],
  scroll: ['Scroll of Fear', 'Scroll of Heal', 'Scroll of Magic Missile', 'Scroll of Fireball'],
  talisman: ['Potency Crystal', 'Jade Bauble', 'Savior Spike', 'Mesmerizing Opal'],
}

const PERMANENT_NAMES: Record<ItemCategory, string[]> = {
  weapon: ['+1 Longsword', '+1 Striking Shortbow', 'Flaming Scimitar', 'Ghost Touch Rapier', 'Frost Warhammer', 'Thundering Mace'],
  armor: ['+1 Leather Armor', '+1 Chain Mail', '+1 Resilient Full Plate', 'Glamered Studded Leather', 'Armor of Speed'],
  wondrous: ['Cloak of Elvenkind', 'Boots of Speed', 'Ring of Protection', 'Bag of Holding', 'Hat of Disguise', 'Goggles of Night'],
  consumable: ['Healing Potion (Lesser)'],
}

/**
 * Generates encounter loot based on difficulty and party level using PF2e
 * treasure distribution guidelines.
 *
 * Uses an injectable RNG for deterministic testing.
 */
export function generateEncounterLoot(params: GenerateLootParams): LootRollResult {
  const { partyLevel, difficulty, partySize, rng = Math.random } = params
  const clamped = Math.max(1, Math.min(20, partyLevel))

  const totalBudgetGp = TREASURE_PER_LEVEL_GP[clamped]
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty]
  const sizeScale = partySize / 4 // PF2e assumes 4 players

  const encounterBudgetGp = Math.round(totalBudgetGp * multiplier * sizeScale)

  // Split budget: ~40% permanent items, ~20% consumables, ~40% currency
  const permanentBudget = Math.round(encounterBudgetGp * 0.4)
  const consumableBudget = Math.round(encounterBudgetGp * 0.2)
  const currencyBudget = encounterBudgetGp - permanentBudget - consumableBudget

  const items: LootItemStub[] = []

  // Generate permanent items
  if (permanentBudget > 0 && rng() > 0.3) {
    const itemLevel = Math.max(1, clamped + Math.floor(rng() * 3) - 1)
    const category = pickFromArray(['weapon', 'armor', 'wondrous'] as ItemCategory[], rng)
    const names = PERMANENT_NAMES[category]
    const name = pickFromArray(names, rng)
    items.push({
      name,
      level: itemLevel,
      category,
      valueGp: permanentBudget,
    })
  }

  // Generate consumables
  if (consumableBudget > 0) {
    const numConsumables = Math.max(1, Math.floor(rng() * 3) + 1)
    const valueEach = Math.round(consumableBudget / numConsumables)
    const consumableType = pickFromArray(Object.keys(CONSUMABLE_NAMES), rng)
    const names = CONSUMABLE_NAMES[consumableType]

    for (let i = 0; i < numConsumables; i++) {
      const name = pickFromArray(names, rng)
      items.push({
        name,
        level: Math.max(1, clamped - 1),
        category: 'consumable',
        valueGp: valueEach,
      })
    }
  }

  // Convert remaining budget to coin
  const currencyCopper = currencyBudget * 100
  const currency = fromCopper(Math.max(0, currencyCopper))

  return { currency, items }
}

// ─── Helpers ─────────────────────────────────

function pickFromArray<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}
