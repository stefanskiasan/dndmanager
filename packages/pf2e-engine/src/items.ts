import type {
  BaseItem, WeaponItem, ArmorItem, ConsumableItem, WondrousItem,
  Item, ItemCategory, Rarity, Price, BulkValue, DamageType, WeaponGroup,
  ArmorCategory, ActionCost,
} from './types.js'

// ─── Defaults ────────────────────────────────

const BASE_DEFAULTS: Omit<BaseItem, 'id' | 'name' | 'category'> = {
  level: 0,
  rarity: 'common',
  price: { gp: 0 },
  bulk: 0,
  description: '',
  traits: [],
  quantity: 1,
}

// ─── Factory Functions ───────────────────────

export function createWeapon(
  overrides: Pick<WeaponItem, 'id' | 'name'> & Partial<Omit<WeaponItem, 'category'>>
): WeaponItem {
  return {
    ...BASE_DEFAULTS,
    category: 'weapon',
    weaponGroup: 'sword',
    damage: { dice: 1, sides: 6, type: 'slashing' },
    hands: 1,
    weaponTraits: [],
    potencyRune: 0,
    strikingRune: 0,
    propertyRunes: [],
    ...overrides,
  }
}

export function createArmor(
  overrides: Pick<ArmorItem, 'id' | 'name'> & Partial<Omit<ArmorItem, 'category'>>
): ArmorItem {
  return {
    ...BASE_DEFAULTS,
    category: 'armor',
    armorCategory: 'light',
    acBonus: 0,
    dexCap: null,
    checkPenalty: 0,
    speedPenalty: 0,
    strength: null,
    potencyRune: 0,
    resiliencyRune: 0,
    propertyRunes: [],
    ...overrides,
  }
}

export function createConsumable(
  overrides: Pick<ConsumableItem, 'id' | 'name'> & Partial<Omit<ConsumableItem, 'category'>>
): ConsumableItem {
  return {
    ...BASE_DEFAULTS,
    category: 'consumable',
    consumableType: 'potion',
    ...overrides,
  }
}

export function createWondrous(
  overrides: Pick<WondrousItem, 'id' | 'name'> & Partial<Omit<WondrousItem, 'category'>>
): WondrousItem {
  return {
    ...BASE_DEFAULTS,
    category: 'wondrous',
    ...overrides,
  }
}

// ─── Weapon Damage Helpers ───────────────────

/**
 * Returns the effective number of damage dice for a weapon,
 * accounting for the striking rune.
 * 0 = normal (1 die), 1 = striking (2 dice), 2 = greater striking (3 dice), 3 = major striking (4 dice)
 */
export function weaponDamageDice(weapon: WeaponItem): number {
  return weapon.damage.dice + weapon.strikingRune
}

/**
 * Returns the total potency bonus for attack rolls.
 */
export function weaponPotencyBonus(weapon: WeaponItem): number {
  return weapon.potencyRune
}

/**
 * Formats a weapon's damage string, e.g. "2d8+4 slashing"
 */
export function formatWeaponDamage(weapon: WeaponItem, abilityBonus: number): string {
  const dice = weaponDamageDice(weapon)
  const total = abilityBonus
  const sign = total >= 0 ? '+' : ''
  return `${dice}d${weapon.damage.sides}${total !== 0 ? sign + total : ''} ${weapon.damage.type}`
}

// ─── Bulk Display ────────────────────────────

/**
 * Formats bulk for display: 0 → "—", 0.1 → "L", 1 → "1", etc.
 */
export function formatBulk(bulk: BulkValue): string {
  if (bulk === 0) return '—'
  if (bulk === 0.1) return 'L'
  return String(bulk)
}

// ─── Price Display ───────────────────────────

/**
 * Formats a Price for display, e.g. "35 gp" or "2 gp 5 sp"
 */
export function formatPrice(price: Price): string {
  const parts: string[] = []
  if (price.pp && price.pp > 0) parts.push(`${price.pp} pp`)
  if (price.gp && price.gp > 0) parts.push(`${price.gp} gp`)
  if (price.sp && price.sp > 0) parts.push(`${price.sp} sp`)
  if (price.cp && price.cp > 0) parts.push(`${price.cp} cp`)
  return parts.length > 0 ? parts.join(' ') : '—'
}
