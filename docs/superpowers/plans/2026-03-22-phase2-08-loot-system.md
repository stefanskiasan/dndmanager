# Phase 2.8: Loot System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete inventory and loot system for PF2e — item type definitions, inventory management (add/remove, bulk tracking, encumbrance), gold/currency with denomination conversion, loot table resolution based on encounter difficulty and party level, an inventory UI for players, and a loot distribution UI for the GM.

**Architecture:** All item types, inventory logic, currency math, and loot table resolution live as pure functions in `packages/pf2e-engine/src/`. UI components live in `apps/web/`. Character inventory is stored in the `data` JSONB column on the character record. The engine never touches the database — it only computes.

**Tech Stack:** TypeScript strict, Vitest, React, Zustand, shadcn/ui, @dndmanager/pf2e-engine

---

## File Structure

```
packages/pf2e-engine/src/
├── items.ts                              → Item types, creation helpers, item properties
├── inventory.ts                          → Add/remove items, bulk calculation, encumbrance
├── currency.ts                           → Gold/currency management, denomination conversion
├── loot-tables.ts                        → Loot table resolution by difficulty + party level
├── __tests__/
│   ├── items.test.ts
│   ├── inventory.test.ts
│   ├── currency.test.ts
│   └── loot-tables.test.ts

apps/web/components/game/
├── inventory/
│   ├── InventoryPanel.tsx                → Main inventory container for players
│   ├── InventoryItemRow.tsx              → Single item row with actions
│   ├── CurrencyDisplay.tsx               → Gold/currency display with denominations
│   ├── BulkMeter.tsx                     → Visual bulk/encumbrance bar
│   └── LootDistribution.tsx              → GM loot distribution modal
```

---

### Task 1: Item Type Definitions

**Files:**
- Modify: `packages/pf2e-engine/src/types.ts`
- Create: `packages/pf2e-engine/src/items.ts`
- Test: `packages/pf2e-engine/src/__tests__/items.test.ts`

- [ ] **Step 1: Add item types to types.ts**

Add to `packages/pf2e-engine/src/types.ts`:
```typescript
// ─── Items ───────────────────────────────────
export type ItemCategory = 'weapon' | 'armor' | 'consumable' | 'wondrous'

export type WeaponGroup =
  | 'sword' | 'axe' | 'club' | 'flail' | 'hammer'
  | 'knife' | 'polearm' | 'spear' | 'bow' | 'crossbow'
  | 'sling' | 'dart' | 'brawling' | 'shield'

export type ArmorCategory = 'unarmored' | 'light' | 'medium' | 'heavy'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'unique'

export interface Price {
  pp?: number
  gp?: number
  sp?: number
  cp?: number
}

/**
 * Bulk in PF2e: whole numbers (1, 2, 3...) or L (light = 0.1 by convention).
 * We store as a number: 1 = 1 bulk, 0.1 = L, 0 = negligible.
 */
export type BulkValue = number

export interface BaseItem {
  id: string
  name: string
  level: number
  category: ItemCategory
  rarity: Rarity
  price: Price
  bulk: BulkValue
  description: string
  traits: string[]
  quantity: number
  invested?: boolean
}

export interface WeaponItem extends BaseItem {
  category: 'weapon'
  weaponGroup: WeaponGroup
  damage: { dice: number; sides: number; type: DamageType }
  range?: number           // ranged/thrown range in feet
  reload?: number          // 0, 1, 2
  hands: 1 | 2 | '1+'     // 1+: versatile grip
  weaponTraits: string[]   // agile, finesse, reach, etc.
  potencyRune: 0 | 1 | 2 | 3
  strikingRune: 0 | 1 | 2 | 3
  propertyRunes: string[]
}

export interface ArmorItem extends BaseItem {
  category: 'armor'
  armorCategory: ArmorCategory
  acBonus: number
  dexCap: number | null    // null = no cap (unarmored)
  checkPenalty: number
  speedPenalty: number
  strength: number | null  // STR required to ignore speed penalty
  potencyRune: 0 | 1 | 2 | 3
  resiliencyRune: 0 | 1 | 2 | 3
  propertyRunes: string[]
}

export interface ConsumableItem extends BaseItem {
  category: 'consumable'
  consumableType: 'potion' | 'elixir' | 'scroll' | 'talisman' | 'bomb' | 'poison' | 'ammunition' | 'oil' | 'snare' | 'other'
  activationActions?: ActionCost
  effect?: string
}

export interface WondrousItem extends BaseItem {
  category: 'wondrous'
  slot?: 'worn' | 'held' | 'affixed' | 'etched' | null
  activationActions?: ActionCost
  usesPerDay?: number
  usesRemaining?: number
}

export type Item = WeaponItem | ArmorItem | ConsumableItem | WondrousItem

// ─── Currency ────────────────────────────────
export interface Currency {
  pp: number  // platinum
  gp: number  // gold
  sp: number  // silver
  cp: number  // copper
}

// ─── Inventory ───────────────────────────────
export interface Inventory {
  items: Item[]
  currency: Currency
}
```

- [ ] **Step 2: Create items.ts with factory helpers**

`packages/pf2e-engine/src/items.ts`:
```typescript
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
```

- [ ] **Step 3: Write tests for items.ts**

`packages/pf2e-engine/src/__tests__/items.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  createWeapon, createArmor, createConsumable, createWondrous,
  weaponDamageDice, weaponPotencyBonus, formatWeaponDamage,
  formatBulk, formatPrice,
} from '../items.js'

describe('createWeapon', () => {
  it('creates a weapon with defaults', () => {
    const sword = createWeapon({ id: 'longsword', name: 'Longsword' })
    expect(sword.category).toBe('weapon')
    expect(sword.weaponGroup).toBe('sword')
    expect(sword.damage).toEqual({ dice: 1, sides: 6, type: 'slashing' })
    expect(sword.quantity).toBe(1)
    expect(sword.rarity).toBe('common')
  })

  it('applies overrides', () => {
    const dagger = createWeapon({
      id: 'dagger',
      name: 'Dagger',
      damage: { dice: 1, sides: 4, type: 'piercing' },
      weaponTraits: ['agile', 'finesse', 'thrown 10'],
      bulk: 0.1,
    })
    expect(dagger.damage.sides).toBe(4)
    expect(dagger.weaponTraits).toContain('agile')
    expect(dagger.bulk).toBe(0.1)
  })
})

describe('createArmor', () => {
  it('creates armor with defaults', () => {
    const armor = createArmor({ id: 'leather', name: 'Leather Armor' })
    expect(armor.category).toBe('armor')
    expect(armor.armorCategory).toBe('light')
    expect(armor.acBonus).toBe(0)
  })

  it('applies armor overrides', () => {
    const plate = createArmor({
      id: 'full-plate',
      name: 'Full Plate',
      armorCategory: 'heavy',
      acBonus: 6,
      dexCap: 0,
      checkPenalty: -3,
      speedPenalty: -10,
      strength: 18,
      bulk: 4,
    })
    expect(plate.acBonus).toBe(6)
    expect(plate.dexCap).toBe(0)
    expect(plate.speedPenalty).toBe(-10)
  })
})

describe('createConsumable', () => {
  it('creates a consumable with defaults', () => {
    const potion = createConsumable({ id: 'healing-potion', name: 'Healing Potion' })
    expect(potion.category).toBe('consumable')
    expect(potion.consumableType).toBe('potion')
  })
})

describe('createWondrous', () => {
  it('creates a wondrous item with defaults', () => {
    const cloak = createWondrous({ id: 'cloak-resist', name: 'Cloak of Resistance' })
    expect(cloak.category).toBe('wondrous')
  })
})

describe('weaponDamageDice', () => {
  it('returns base dice with no rune', () => {
    const sword = createWeapon({ id: 's', name: 'S', damage: { dice: 1, sides: 8, type: 'slashing' } })
    expect(weaponDamageDice(sword)).toBe(1)
  })

  it('adds striking rune dice', () => {
    const sword = createWeapon({
      id: 's', name: 'S',
      damage: { dice: 1, sides: 8, type: 'slashing' },
      strikingRune: 2,
    })
    expect(weaponDamageDice(sword)).toBe(3) // 1 base + 2 greater striking
  })
})

describe('weaponPotencyBonus', () => {
  it('returns 0 with no rune', () => {
    const sword = createWeapon({ id: 's', name: 'S' })
    expect(weaponPotencyBonus(sword)).toBe(0)
  })

  it('returns rune value', () => {
    const sword = createWeapon({ id: 's', name: 'S', potencyRune: 2 })
    expect(weaponPotencyBonus(sword)).toBe(2)
  })
})

describe('formatWeaponDamage', () => {
  it('formats basic weapon damage', () => {
    const sword = createWeapon({
      id: 's', name: 'S',
      damage: { dice: 1, sides: 8, type: 'slashing' },
    })
    expect(formatWeaponDamage(sword, 4)).toBe('1d8+4 slashing')
  })

  it('formats striking weapon damage', () => {
    const sword = createWeapon({
      id: 's', name: 'S',
      damage: { dice: 1, sides: 8, type: 'slashing' },
      strikingRune: 1,
    })
    expect(formatWeaponDamage(sword, 4)).toBe('2d8+4 slashing')
  })

  it('omits bonus when zero', () => {
    const bow = createWeapon({
      id: 'b', name: 'B',
      damage: { dice: 1, sides: 6, type: 'piercing' },
    })
    expect(formatWeaponDamage(bow, 0)).toBe('1d6 piercing')
  })
})

describe('formatBulk', () => {
  it('formats negligible as dash', () => {
    expect(formatBulk(0)).toBe('—')
  })

  it('formats light as L', () => {
    expect(formatBulk(0.1)).toBe('L')
  })

  it('formats whole numbers', () => {
    expect(formatBulk(2)).toBe('2')
  })
})

describe('formatPrice', () => {
  it('formats gp only', () => {
    expect(formatPrice({ gp: 35 })).toBe('35 gp')
  })

  it('formats mixed denominations', () => {
    expect(formatPrice({ gp: 2, sp: 5 })).toBe('2 gp 5 sp')
  })

  it('formats empty as dash', () => {
    expect(formatPrice({})).toBe('—')
  })
})
```

- [ ] **Step 4: Make tests pass**

Run: `cd packages/pf2e-engine && pnpm vitest run src/__tests__/items.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/pf2e-engine/src/types.ts packages/pf2e-engine/src/items.ts packages/pf2e-engine/src/__tests__/items.test.ts
git commit -m "feat(pf2e-engine): add item type definitions and factory helpers"
```

---

### Task 2: Inventory Management

**Files:**
- Create: `packages/pf2e-engine/src/inventory.ts`
- Test: `packages/pf2e-engine/src/__tests__/inventory.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/inventory.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  createInventory, addItem, removeItem, updateItemQuantity,
  calculateTotalBulk, getEncumbranceThreshold, getMaxBulk,
  isEncumbered, isOverloaded, findItemById,
} from '../inventory.js'
import { createWeapon, createConsumable } from '../items.js'

const longsword = createWeapon({
  id: 'longsword-1',
  name: 'Longsword',
  bulk: 1,
})

const dagger = createWeapon({
  id: 'dagger-1',
  name: 'Dagger',
  bulk: 0.1,
})

const potion = createConsumable({
  id: 'healing-potion-1',
  name: 'Healing Potion (Minor)',
  bulk: 0.1,
  quantity: 3,
})

describe('createInventory', () => {
  it('creates an empty inventory', () => {
    const inv = createInventory()
    expect(inv.items).toEqual([])
    expect(inv.currency).toEqual({ pp: 0, gp: 0, sp: 0, cp: 0 })
  })
})

describe('addItem', () => {
  it('adds an item to inventory', () => {
    const inv = addItem(createInventory(), longsword)
    expect(inv.items).toHaveLength(1)
    expect(inv.items[0].name).toBe('Longsword')
  })

  it('stacks consumables with same id', () => {
    let inv = addItem(createInventory(), { ...potion, quantity: 2 })
    inv = addItem(inv, { ...potion, quantity: 1 })
    expect(inv.items).toHaveLength(1)
    expect(inv.items[0].quantity).toBe(3)
  })

  it('does not stack weapons', () => {
    let inv = addItem(createInventory(), longsword)
    const secondSword = createWeapon({ id: 'longsword-2', name: 'Longsword', bulk: 1 })
    inv = addItem(inv, secondSword)
    expect(inv.items).toHaveLength(2)
  })
})

describe('removeItem', () => {
  it('removes an item by id', () => {
    const inv = addItem(createInventory(), longsword)
    const updated = removeItem(inv, 'longsword-1')
    expect(updated.items).toHaveLength(0)
  })

  it('returns unchanged inventory if id not found', () => {
    const inv = addItem(createInventory(), longsword)
    const updated = removeItem(inv, 'nonexistent')
    expect(updated.items).toHaveLength(1)
  })
})

describe('updateItemQuantity', () => {
  it('updates consumable quantity', () => {
    const inv = addItem(createInventory(), potion)
    const updated = updateItemQuantity(inv, 'healing-potion-1', 5)
    expect(updated.items[0].quantity).toBe(5)
  })

  it('removes item if quantity set to 0', () => {
    const inv = addItem(createInventory(), potion)
    const updated = updateItemQuantity(inv, 'healing-potion-1', 0)
    expect(updated.items).toHaveLength(0)
  })
})

describe('calculateTotalBulk', () => {
  it('sums bulk for all items', () => {
    let inv = addItem(createInventory(), longsword)
    inv = addItem(inv, longsword) // won't stack — different scenario
    // Actually same id would not add twice with stacking for weapons
    // Use second sword
    const sword2 = createWeapon({ id: 'longsword-2', name: 'Longsword', bulk: 1 })
    inv = addItem(inv, sword2)
    expect(calculateTotalBulk(inv.items)).toBe(2)
  })

  it('counts light items (10 L = 1 bulk)', () => {
    let inv = createInventory()
    for (let i = 0; i < 10; i++) {
      inv = addItem(inv, createConsumable({
        id: `potion-${i}`,
        name: `Potion ${i}`,
        bulk: 0.1,
        quantity: 1,
      }))
    }
    expect(calculateTotalBulk(inv.items)).toBe(1)
  })

  it('respects quantity for bulk calculation', () => {
    const inv = addItem(createInventory(), { ...potion, quantity: 10 })
    // 10 * 0.1 = 1 bulk
    expect(calculateTotalBulk(inv.items)).toBe(1)
  })
})

describe('encumbrance', () => {
  it('computes encumbered threshold as 5 + STR modifier', () => {
    expect(getEncumbranceThreshold(4)).toBe(9) // STR mod +4
    expect(getEncumbranceThreshold(0)).toBe(5)
    expect(getEncumbranceThreshold(-1)).toBe(4)
  })

  it('computes max bulk as 10 + STR modifier', () => {
    expect(getMaxBulk(4)).toBe(14)
    expect(getMaxBulk(0)).toBe(10)
  })

  it('detects encumbered state', () => {
    expect(isEncumbered(9, 4)).toBe(true)  // 9 >= 5+4=9
    expect(isEncumbered(8, 4)).toBe(false) // 8 < 9
  })

  it('detects overloaded state', () => {
    expect(isOverloaded(15, 4)).toBe(true)  // 15 > 10+4=14
    expect(isOverloaded(14, 4)).toBe(false) // 14 <= 14
  })
})

describe('findItemById', () => {
  it('finds an item by id', () => {
    const inv = addItem(createInventory(), longsword)
    const found = findItemById(inv, 'longsword-1')
    expect(found?.name).toBe('Longsword')
  })

  it('returns undefined for missing id', () => {
    const inv = createInventory()
    expect(findItemById(inv, 'nope')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Implement inventory.ts**

`packages/pf2e-engine/src/inventory.ts`:
```typescript
import type { Inventory, Item, Currency } from './types.js'

// ─── Create ──────────────────────────────────

export function createInventory(): Inventory {
  return {
    items: [],
    currency: { pp: 0, gp: 0, sp: 0, cp: 0 },
  }
}

// ─── Item Operations ─────────────────────────

/**
 * Adds an item to inventory. Consumables with the same id are stacked by
 * combining quantities. Weapons, armor, and wondrous items are always
 * added as separate entries.
 */
export function addItem(inventory: Inventory, item: Item): Inventory {
  if (item.category === 'consumable') {
    const existing = inventory.items.find(
      (i) => i.id === item.id && i.category === 'consumable'
    )
    if (existing) {
      return {
        ...inventory,
        items: inventory.items.map((i) =>
          i.id === item.id && i.category === 'consumable'
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        ),
      }
    }
  }

  return {
    ...inventory,
    items: [...inventory.items, { ...item }],
  }
}

/**
 * Removes an item by id. Returns the inventory unchanged if not found.
 */
export function removeItem(inventory: Inventory, itemId: string): Inventory {
  const filtered = inventory.items.filter((i) => i.id !== itemId)
  if (filtered.length === inventory.items.length) return inventory
  return { ...inventory, items: filtered }
}

/**
 * Updates quantity of an item. If quantity <= 0, removes the item.
 */
export function updateItemQuantity(
  inventory: Inventory,
  itemId: string,
  quantity: number,
): Inventory {
  if (quantity <= 0) return removeItem(inventory, itemId)
  return {
    ...inventory,
    items: inventory.items.map((i) =>
      i.id === itemId ? { ...i, quantity } : i
    ),
  }
}

/**
 * Find an item in the inventory by its id.
 */
export function findItemById(inventory: Inventory, itemId: string): Item | undefined {
  return inventory.items.find((i) => i.id === itemId)
}

// ─── Bulk Calculation ────────────────────────

/**
 * Calculates total bulk for a list of items.
 * Light items (bulk 0.1) accumulate: every 10 light items = 1 bulk.
 * Negligible items (bulk 0) contribute nothing.
 * Quantity is multiplied in.
 */
export function calculateTotalBulk(items: Item[]): number {
  let totalLightItems = 0
  let totalBulk = 0

  for (const item of items) {
    const itemBulk = item.bulk * item.quantity
    if (item.bulk === 0.1) {
      totalLightItems += item.quantity
    } else {
      totalBulk += itemBulk
    }
  }

  // Every 10 light items = 1 bulk
  totalBulk += Math.floor(totalLightItems / 10)

  return totalBulk
}

// ─── Encumbrance ─────────────────────────────

/**
 * PF2e encumbered threshold: 5 + STR modifier.
 */
export function getEncumbranceThreshold(strModifier: number): number {
  return 5 + strModifier
}

/**
 * PF2e max bulk: 10 + STR modifier.
 */
export function getMaxBulk(strModifier: number): number {
  return 10 + strModifier
}

/**
 * A character is encumbered if their total bulk >= encumbrance threshold.
 */
export function isEncumbered(totalBulk: number, strModifier: number): boolean {
  return totalBulk >= getEncumbranceThreshold(strModifier)
}

/**
 * A character is overloaded (cannot move) if their total bulk > max bulk.
 */
export function isOverloaded(totalBulk: number, strModifier: number): boolean {
  return totalBulk > getMaxBulk(strModifier)
}
```

- [ ] **Step 3: Make tests pass**

Run: `cd packages/pf2e-engine && pnpm vitest run src/__tests__/inventory.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/pf2e-engine/src/inventory.ts packages/pf2e-engine/src/__tests__/inventory.test.ts
git commit -m "feat(pf2e-engine): add inventory management with bulk and encumbrance"
```

---

### Task 3: Currency Management

**Files:**
- Create: `packages/pf2e-engine/src/currency.ts`
- Test: `packages/pf2e-engine/src/__tests__/currency.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/currency.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  createCurrency, addCurrency, subtractCurrency, canAfford,
  toCopper, fromCopper, normalizeCurrency, formatCurrency,
  addCurrencyToInventory, subtractCurrencyFromInventory,
} from '../currency.js'
import { createInventory } from '../inventory.js'

describe('createCurrency', () => {
  it('creates zero currency', () => {
    const c = createCurrency()
    expect(c).toEqual({ pp: 0, gp: 0, sp: 0, cp: 0 })
  })

  it('creates with partial values', () => {
    const c = createCurrency({ gp: 50, sp: 5 })
    expect(c).toEqual({ pp: 0, gp: 50, sp: 5, cp: 0 })
  })
})

describe('toCopper / fromCopper', () => {
  it('converts to copper total', () => {
    // 1 pp = 1000 cp, 1 gp = 100 cp, 1 sp = 10 cp
    expect(toCopper({ pp: 1, gp: 0, sp: 0, cp: 0 })).toBe(1000)
    expect(toCopper({ pp: 0, gp: 1, sp: 0, cp: 0 })).toBe(100)
    expect(toCopper({ pp: 0, gp: 0, sp: 1, cp: 0 })).toBe(10)
    expect(toCopper({ pp: 0, gp: 2, sp: 5, cp: 3 })).toBe(253)
  })

  it('converts from copper to normalized currency', () => {
    expect(fromCopper(1253)).toEqual({ pp: 1, gp: 2, sp: 5, cp: 3 })
    expect(fromCopper(0)).toEqual({ pp: 0, gp: 0, sp: 0, cp: 0 })
    expect(fromCopper(99)).toEqual({ pp: 0, gp: 0, sp: 9, cp: 9 })
  })
})

describe('normalizeCurrency', () => {
  it('normalizes overflow denominations', () => {
    const result = normalizeCurrency({ pp: 0, gp: 0, sp: 0, cp: 1253 })
    expect(result).toEqual({ pp: 1, gp: 2, sp: 5, cp: 3 })
  })
})

describe('addCurrency', () => {
  it('adds two currencies', () => {
    const a = { pp: 1, gp: 5, sp: 3, cp: 2 }
    const b = { pp: 0, gp: 10, sp: 7, cp: 8 }
    expect(addCurrency(a, b)).toEqual({ pp: 1, gp: 15, sp: 10, cp: 10 })
  })
})

describe('subtractCurrency', () => {
  it('subtracts converting as needed', () => {
    const wallet = { pp: 0, gp: 5, sp: 0, cp: 0 } // 500 cp
    const cost = { pp: 0, gp: 2, sp: 5, cp: 0 }   // 250 cp
    const result = subtractCurrency(wallet, cost)
    // 500 - 250 = 250 cp = 2 gp 5 sp
    expect(toCopper(result)).toBe(250)
  })

  it('returns zero currency if exact amount', () => {
    const wallet = { pp: 0, gp: 5, sp: 0, cp: 0 }
    const cost = { pp: 0, gp: 5, sp: 0, cp: 0 }
    const result = subtractCurrency(wallet, cost)
    expect(toCopper(result)).toBe(0)
  })

  it('throws if insufficient funds', () => {
    const wallet = { pp: 0, gp: 1, sp: 0, cp: 0 }
    const cost = { pp: 0, gp: 5, sp: 0, cp: 0 }
    expect(() => subtractCurrency(wallet, cost)).toThrow('Insufficient funds')
  })
})

describe('canAfford', () => {
  it('returns true if wallet covers cost', () => {
    expect(canAfford({ pp: 0, gp: 10, sp: 0, cp: 0 }, { pp: 0, gp: 5, sp: 0, cp: 0 })).toBe(true)
  })

  it('returns false if wallet does not cover cost', () => {
    expect(canAfford({ pp: 0, gp: 1, sp: 0, cp: 0 }, { pp: 0, gp: 5, sp: 0, cp: 0 })).toBe(false)
  })

  it('converts across denominations', () => {
    // 1 pp = 10 gp = 1000 cp
    expect(canAfford({ pp: 1, gp: 0, sp: 0, cp: 0 }, { pp: 0, gp: 9, sp: 0, cp: 0 })).toBe(true)
  })
})

describe('formatCurrency', () => {
  it('formats currency for display', () => {
    expect(formatCurrency({ pp: 0, gp: 15, sp: 3, cp: 0 })).toBe('15 gp 3 sp')
  })

  it('shows only non-zero denominations', () => {
    expect(formatCurrency({ pp: 0, gp: 0, sp: 0, cp: 42 })).toBe('42 cp')
  })

  it('shows dash for zero', () => {
    expect(formatCurrency({ pp: 0, gp: 0, sp: 0, cp: 0 })).toBe('—')
  })
})

describe('inventory currency operations', () => {
  it('adds currency to inventory', () => {
    const inv = createInventory()
    const updated = addCurrencyToInventory(inv, { pp: 0, gp: 50, sp: 0, cp: 0 })
    expect(updated.currency.gp).toBe(50)
  })

  it('subtracts currency from inventory', () => {
    let inv = createInventory()
    inv = addCurrencyToInventory(inv, { pp: 0, gp: 50, sp: 0, cp: 0 })
    const updated = subtractCurrencyFromInventory(inv, { pp: 0, gp: 20, sp: 0, cp: 0 })
    expect(toCopper(updated.currency)).toBe(3000) // 30 gp
  })
})
```

- [ ] **Step 2: Implement currency.ts**

`packages/pf2e-engine/src/currency.ts`:
```typescript
import type { Currency, Inventory } from './types.js'

// ─── PF2e Conversion Rates (to copper) ───────
const PP_TO_CP = 1000  // 1 pp = 10 gp = 100 sp = 1000 cp
const GP_TO_CP = 100
const SP_TO_CP = 10

// ─── Create ──────────────────────────────────

export function createCurrency(partial?: Partial<Currency>): Currency {
  return {
    pp: partial?.pp ?? 0,
    gp: partial?.gp ?? 0,
    sp: partial?.sp ?? 0,
    cp: partial?.cp ?? 0,
  }
}

// ─── Conversion ──────────────────────────────

/**
 * Converts a Currency to its total copper piece value.
 */
export function toCopper(c: Currency): number {
  return c.pp * PP_TO_CP + c.gp * GP_TO_CP + c.sp * SP_TO_CP + c.cp
}

/**
 * Converts a copper total back to normalized Currency (largest denominations first).
 */
export function fromCopper(cp: number): Currency {
  const pp = Math.floor(cp / PP_TO_CP)
  cp %= PP_TO_CP
  const gp = Math.floor(cp / GP_TO_CP)
  cp %= GP_TO_CP
  const sp = Math.floor(cp / SP_TO_CP)
  cp %= SP_TO_CP
  return { pp, gp, sp, cp }
}

/**
 * Normalizes a Currency so that each denomination doesn't overflow.
 */
export function normalizeCurrency(c: Currency): Currency {
  return fromCopper(toCopper(c))
}

// ─── Arithmetic ──────────────────────────────

/**
 * Adds two currencies. Does NOT normalize — preserves denomination structure.
 */
export function addCurrency(a: Currency, b: Currency): Currency {
  return {
    pp: a.pp + b.pp,
    gp: a.gp + b.gp,
    sp: a.sp + b.sp,
    cp: a.cp + b.cp,
  }
}

/**
 * Subtracts cost from wallet. Converts across denominations as needed.
 * Returns the remaining currency (normalized).
 * Throws if wallet does not have enough funds.
 */
export function subtractCurrency(wallet: Currency, cost: Currency): Currency {
  const remaining = toCopper(wallet) - toCopper(cost)
  if (remaining < 0) {
    throw new Error('Insufficient funds')
  }
  return fromCopper(remaining)
}

/**
 * Returns true if the wallet has at least enough to cover the cost,
 * converting across denominations.
 */
export function canAfford(wallet: Currency, cost: Currency): boolean {
  return toCopper(wallet) >= toCopper(cost)
}

// ─── Display ─────────────────────────────────

/**
 * Formats a Currency for display, showing only non-zero denominations.
 */
export function formatCurrency(c: Currency): string {
  const parts: string[] = []
  if (c.pp > 0) parts.push(`${c.pp} pp`)
  if (c.gp > 0) parts.push(`${c.gp} gp`)
  if (c.sp > 0) parts.push(`${c.sp} sp`)
  if (c.cp > 0) parts.push(`${c.cp} cp`)
  return parts.length > 0 ? parts.join(' ') : '—'
}

// ─── Inventory Integration ───────────────────

/**
 * Adds currency to an inventory (immutable).
 */
export function addCurrencyToInventory(inventory: Inventory, amount: Currency): Inventory {
  return {
    ...inventory,
    currency: addCurrency(inventory.currency, amount),
  }
}

/**
 * Subtracts currency from an inventory (immutable).
 * Throws if the inventory doesn't have enough.
 */
export function subtractCurrencyFromInventory(inventory: Inventory, cost: Currency): Inventory {
  return {
    ...inventory,
    currency: subtractCurrency(inventory.currency, cost),
  }
}
```

- [ ] **Step 3: Make tests pass**

Run: `cd packages/pf2e-engine && pnpm vitest run src/__tests__/currency.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/pf2e-engine/src/currency.ts packages/pf2e-engine/src/__tests__/currency.test.ts
git commit -m "feat(pf2e-engine): add currency management with denomination conversion"
```

---

### Task 4: Loot Table Resolution

**Files:**
- Create: `packages/pf2e-engine/src/loot-tables.ts`
- Test: `packages/pf2e-engine/src/__tests__/loot-tables.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/pf2e-engine/src/__tests__/loot-tables.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import {
  getTreasureByLevel, generateEncounterLoot,
  LootRollResult, EncounterDifficulty,
} from '../loot-tables.js'

describe('getTreasureByLevel', () => {
  it('returns treasure budget for party level 1', () => {
    const budget = getTreasureByLevel(1)
    expect(budget).toBeDefined()
    expect(budget.totalGp).toBeGreaterThan(0)
    expect(budget.permanentItems).toBeDefined()
    expect(budget.consumables).toBeDefined()
    expect(budget.currency).toBeDefined()
  })

  it('scales treasure with level', () => {
    const level1 = getTreasureByLevel(1)
    const level5 = getTreasureByLevel(5)
    expect(level5.totalGp).toBeGreaterThan(level1.totalGp)
  })

  it('clamps to valid level range 1-20', () => {
    expect(getTreasureByLevel(0).totalGp).toBe(getTreasureByLevel(1).totalGp)
    expect(getTreasureByLevel(25).totalGp).toBe(getTreasureByLevel(20).totalGp)
  })
})

describe('generateEncounterLoot', () => {
  it('generates loot for a moderate encounter', () => {
    const loot = generateEncounterLoot({
      partyLevel: 3,
      difficulty: 'moderate',
      partySize: 4,
      rng: () => 0.5, // deterministic
    })
    expect(loot.currency).toBeDefined()
    expect(loot.items.length).toBeGreaterThanOrEqual(0)
  })

  it('trivial encounters give less loot than severe', () => {
    const trivial = generateEncounterLoot({
      partyLevel: 5,
      difficulty: 'trivial',
      partySize: 4,
      rng: () => 0.5,
    })
    const severe = generateEncounterLoot({
      partyLevel: 5,
      difficulty: 'severe',
      partySize: 4,
      rng: () => 0.5,
    })
    const trivialValue = trivial.currency.gp + trivial.items.length * 10
    const severeValue = severe.currency.gp + severe.items.length * 10
    expect(severeValue).toBeGreaterThan(trivialValue)
  })

  it('scales loot for non-standard party sizes', () => {
    const party4 = generateEncounterLoot({
      partyLevel: 5,
      difficulty: 'moderate',
      partySize: 4,
      rng: () => 0.5,
    })
    const party6 = generateEncounterLoot({
      partyLevel: 5,
      difficulty: 'moderate',
      partySize: 6,
      rng: () => 0.5,
    })
    // 6-player party should get ~50% more than 4-player
    expect(party6.currency.gp).toBeGreaterThan(party4.currency.gp)
  })

  it('uses custom rng for deterministic output', () => {
    const a = generateEncounterLoot({
      partyLevel: 3,
      difficulty: 'moderate',
      partySize: 4,
      rng: () => 0.3,
    })
    const b = generateEncounterLoot({
      partyLevel: 3,
      difficulty: 'moderate',
      partySize: 4,
      rng: () => 0.3,
    })
    expect(a).toEqual(b)
  })

  it('returns item stubs with name, level, and category', () => {
    const loot = generateEncounterLoot({
      partyLevel: 5,
      difficulty: 'moderate',
      partySize: 4,
      rng: () => 0.7,
    })
    for (const item of loot.items) {
      expect(item.name).toBeDefined()
      expect(item.level).toBeGreaterThanOrEqual(0)
      expect(item.category).toBeDefined()
    }
  })
})
```

- [ ] **Step 2: Implement loot-tables.ts**

`packages/pf2e-engine/src/loot-tables.ts`:
```typescript
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
```

- [ ] **Step 3: Make tests pass**

Run: `cd packages/pf2e-engine && pnpm vitest run src/__tests__/loot-tables.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/pf2e-engine/src/loot-tables.ts packages/pf2e-engine/src/__tests__/loot-tables.test.ts
git commit -m "feat(pf2e-engine): add loot table resolution by encounter difficulty"
```

---

### Task 5: Export New Modules

**Files:**
- Modify: `packages/pf2e-engine/src/index.ts`

- [ ] **Step 1: Add exports**

Add to `packages/pf2e-engine/src/index.ts`:
```typescript
export * from './items.js'
export * from './inventory.js'
export * from './currency.js'
export * from './loot-tables.js'
```

- [ ] **Step 2: Verify build**

Run: `cd packages/pf2e-engine && pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/pf2e-engine/src/index.ts
git commit -m "feat(pf2e-engine): export items, inventory, currency, and loot-tables modules"
```

---

### Task 6: Inventory UI Components

**Files:**
- Create: `apps/web/components/game/inventory/CurrencyDisplay.tsx`
- Create: `apps/web/components/game/inventory/BulkMeter.tsx`
- Create: `apps/web/components/game/inventory/InventoryItemRow.tsx`
- Create: `apps/web/components/game/inventory/InventoryPanel.tsx`

- [ ] **Step 1: Create CurrencyDisplay**

`apps/web/components/game/inventory/CurrencyDisplay.tsx`:
```tsx
'use client'

import type { Currency } from '@dndmanager/pf2e-engine'

interface CurrencyDisplayProps {
  currency: Currency
}

const DENOMINATION_STYLES = {
  pp: 'bg-gray-300 text-gray-800',
  gp: 'bg-yellow-500 text-yellow-900',
  sp: 'bg-gray-400 text-gray-800',
  cp: 'bg-orange-600 text-orange-100',
}

const DENOMINATION_LABELS = { pp: 'PP', gp: 'GP', sp: 'SP', cp: 'CP' }

export function CurrencyDisplay({ currency }: CurrencyDisplayProps) {
  const denominations = (['pp', 'gp', 'sp', 'cp'] as const).filter(
    (d) => currency[d] > 0
  )

  if (denominations.length === 0) {
    return <span className="text-xs text-neutral-500">Kein Gold</span>
  }

  return (
    <div className="flex items-center gap-2">
      {denominations.map((d) => (
        <span
          key={d}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${DENOMINATION_STYLES[d]}`}
        >
          {currency[d]} {DENOMINATION_LABELS[d]}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create BulkMeter**

`apps/web/components/game/inventory/BulkMeter.tsx`:
```tsx
'use client'

interface BulkMeterProps {
  currentBulk: number
  encumbranceThreshold: number
  maxBulk: number
}

export function BulkMeter({ currentBulk, encumbranceThreshold, maxBulk }: BulkMeterProps) {
  const percentage = Math.min((currentBulk / maxBulk) * 100, 100)
  const isEncumbered = currentBulk >= encumbranceThreshold
  const isOverloaded = currentBulk > maxBulk

  let barColor = 'bg-green-500'
  if (isOverloaded) barColor = 'bg-red-600'
  else if (isEncumbered) barColor = 'bg-yellow-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-neutral-400">
        <span>
          Traglast: {currentBulk} / {maxBulk}
          {isEncumbered && !isOverloaded && ' (Belastet)'}
          {isOverloaded && ' (Ueberladen!)'}
        </span>
        <span>Grenze: {encumbranceThreshold}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-neutral-700">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create InventoryItemRow**

`apps/web/components/game/inventory/InventoryItemRow.tsx`:
```tsx
'use client'

import type { Item } from '@dndmanager/pf2e-engine'
import { formatBulk, formatPrice } from '@dndmanager/pf2e-engine'

interface InventoryItemRowProps {
  item: Item
  onRemove?: (itemId: string) => void
  onUse?: (itemId: string) => void
}

const CATEGORY_COLORS = {
  weapon: 'border-red-700',
  armor: 'border-blue-700',
  consumable: 'border-green-700',
  wondrous: 'border-purple-700',
}

const RARITY_COLORS = {
  common: '',
  uncommon: 'text-orange-400',
  rare: 'text-blue-400',
  unique: 'text-purple-400',
}

export function InventoryItemRow({ item, onRemove, onUse }: InventoryItemRowProps) {
  return (
    <div
      className={`flex items-center justify-between rounded border-l-2 bg-neutral-800 px-3 py-2 ${CATEGORY_COLORS[item.category]}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${RARITY_COLORS[item.rarity]}`}>
            {item.name}
          </span>
          {item.quantity > 1 && (
            <span className="rounded bg-neutral-700 px-1.5 text-xs text-neutral-300">
              x{item.quantity}
            </span>
          )}
          <span className="text-xs text-neutral-500">Lvl {item.level}</span>
        </div>
        <div className="flex gap-3 text-xs text-neutral-500">
          <span>Bulk: {formatBulk(item.bulk)}</span>
          <span>{formatPrice(item.price)}</span>
          {item.traits.length > 0 && (
            <span>{item.traits.join(', ')}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {item.category === 'consumable' && onUse && (
          <button
            onClick={() => onUse(item.id)}
            className="rounded bg-green-700 px-2 py-1 text-xs text-white hover:bg-green-600"
          >
            Benutzen
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            className="rounded bg-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-600"
          >
            Ablegen
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create InventoryPanel**

`apps/web/components/game/inventory/InventoryPanel.tsx`:
```tsx
'use client'

import { useMemo, useState } from 'react'
import type { Inventory, ItemCategory } from '@dndmanager/pf2e-engine'
import {
  calculateTotalBulk, getEncumbranceThreshold, getMaxBulk,
} from '@dndmanager/pf2e-engine'
import { CurrencyDisplay } from './CurrencyDisplay'
import { BulkMeter } from './BulkMeter'
import { InventoryItemRow } from './InventoryItemRow'

interface InventoryPanelProps {
  inventory: Inventory
  strModifier: number
  onRemoveItem?: (itemId: string) => void
  onUseItem?: (itemId: string) => void
}

const CATEGORY_TABS: { key: ItemCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'weapon', label: 'Waffen' },
  { key: 'armor', label: 'Ruestung' },
  { key: 'consumable', label: 'Verbrauchbar' },
  { key: 'wondrous', label: 'Magisch' },
]

export function InventoryPanel({
  inventory,
  strModifier,
  onRemoveItem,
  onUseItem,
}: InventoryPanelProps) {
  const [filter, setFilter] = useState<ItemCategory | 'all'>('all')

  const totalBulk = useMemo(
    () => calculateTotalBulk(inventory.items),
    [inventory.items]
  )

  const filteredItems = useMemo(
    () =>
      filter === 'all'
        ? inventory.items
        : inventory.items.filter((i) => i.category === filter),
    [inventory.items, filter]
  )

  return (
    <div className="flex h-full flex-col space-y-3 rounded-lg bg-neutral-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-200">Inventar</h2>
        <CurrencyDisplay currency={inventory.currency} />
      </div>

      {/* Bulk Meter */}
      <BulkMeter
        currentBulk={totalBulk}
        encumbranceThreshold={getEncumbranceThreshold(strModifier)}
        maxBulk={getMaxBulk(strModifier)}
      />

      {/* Category Tabs */}
      <div className="flex gap-1">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              filter === tab.key
                ? 'bg-neutral-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Item List */}
      <div className="flex-1 space-y-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-600">
            Keine Gegenstaende
          </div>
        ) : (
          filteredItems.map((item) => (
            <InventoryItemRow
              key={item.id}
              item={item}
              onRemove={onRemoveItem}
              onUse={item.category === 'consumable' ? onUseItem : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/game/inventory/
git commit -m "feat(web): add inventory UI with bulk meter, currency display, and item list"
```

---

### Task 7: Loot Distribution UI for GM

**Files:**
- Create: `apps/web/components/game/inventory/LootDistribution.tsx`

- [ ] **Step 1: Create LootDistribution component**

`apps/web/components/game/inventory/LootDistribution.tsx`:
```tsx
'use client'

import { useState, useMemo } from 'react'
import type { Currency, ItemCategory } from '@dndmanager/pf2e-engine'
import {
  generateEncounterLoot, formatCurrency, fromCopper, toCopper,
  type EncounterDifficulty, type LootRollResult, type LootItemStub,
} from '@dndmanager/pf2e-engine'
import { CurrencyDisplay } from './CurrencyDisplay'

interface Character {
  id: string
  name: string
}

interface LootDistributionProps {
  partyLevel: number
  partyMembers: Character[]
  onDistribute: (assignments: LootAssignment[]) => void
  onClose: () => void
}

export interface LootAssignment {
  characterId: string
  items: LootItemStub[]
  currency: Currency
}

export function LootDistribution({
  partyLevel,
  partyMembers,
  onDistribute,
  onClose,
}: LootDistributionProps) {
  const [difficulty, setDifficulty] = useState<EncounterDifficulty>('moderate')
  const [loot, setLoot] = useState<LootRollResult | null>(null)
  const [itemAssignments, setItemAssignments] = useState<Record<number, string>>({})
  const [splitGold, setSplitGold] = useState(true)

  const handleGenerate = () => {
    const result = generateEncounterLoot({
      partyLevel,
      difficulty,
      partySize: partyMembers.length,
    })
    setLoot(result)
    setItemAssignments({})
  }

  const handleDistribute = () => {
    if (!loot) return

    const assignments: LootAssignment[] = partyMembers.map((char) => ({
      characterId: char.id,
      items: [],
      currency: { pp: 0, gp: 0, sp: 0, cp: 0 },
    }))

    // Assign items
    loot.items.forEach((item, idx) => {
      const charId = itemAssignments[idx]
      if (charId) {
        const assignment = assignments.find((a) => a.characterId === charId)
        if (assignment) assignment.items.push(item)
      }
    })

    // Split or assign currency
    if (splitGold) {
      const totalCp = toCopper(loot.currency)
      const perCharCp = Math.floor(totalCp / partyMembers.length)
      const remainder = totalCp - perCharCp * partyMembers.length

      assignments.forEach((a, idx) => {
        const extra = idx === 0 ? remainder : 0
        a.currency = fromCopper(perCharCp + extra)
      })
    }

    onDistribute(assignments)
  }

  const difficulties: EncounterDifficulty[] = ['trivial', 'low', 'moderate', 'severe', 'extreme']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl rounded-lg bg-neutral-900 p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-200">Beute verteilen</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300"
          >
            Schliessen
          </button>
        </div>

        {/* Difficulty Selector */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-neutral-400">Schwierigkeit:</span>
          {difficulties.map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded px-3 py-1 text-xs capitalize ${
                difficulty === d
                  ? 'bg-amber-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          className="mb-4 rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
        >
          Beute wuerfeln (Level {partyLevel})
        </button>

        {/* Loot Results */}
        {loot && (
          <div className="space-y-4">
            {/* Currency */}
            <div className="flex items-center justify-between rounded bg-neutral-800 p-3">
              <div>
                <span className="text-sm text-neutral-300">Muenzen: </span>
                <CurrencyDisplay currency={loot.currency} />
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-400">
                <input
                  type="checkbox"
                  checked={splitGold}
                  onChange={(e) => setSplitGold(e.target.checked)}
                  className="rounded"
                />
                Gleichmaessig aufteilen
              </label>
            </div>

            {/* Items */}
            {loot.items.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-neutral-300">Gegenstaende</h3>
                {loot.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded bg-neutral-800 p-2"
                  >
                    <div>
                      <span className="text-sm text-neutral-200">{item.name}</span>
                      <span className="ml-2 text-xs text-neutral-500">
                        Lvl {item.level} • {item.category} • {item.valueGp} gp
                      </span>
                    </div>
                    <select
                      value={itemAssignments[idx] ?? ''}
                      onChange={(e) =>
                        setItemAssignments((prev) => ({ ...prev, [idx]: e.target.value }))
                      }
                      className="rounded bg-neutral-700 px-2 py-1 text-xs text-neutral-200"
                    >
                      <option value="">Nicht zugewiesen</option>
                      {partyMembers.map((char) => (
                        <option key={char.id} value={char.id}>
                          {char.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Distribute Button */}
            <button
              onClick={handleDistribute}
              className="w-full rounded bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-600"
            >
              Beute verteilen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/inventory/LootDistribution.tsx
git commit -m "feat(web): add GM loot distribution modal with encounter-based generation"
```

---

### Task 8: Full Integration Verification

- [ ] **Step 1: Run all engine tests**

```bash
cd packages/pf2e-engine && pnpm vitest run
```

Expected: All tests pass including new items, inventory, currency, and loot-tables tests.

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: Full monorepo build succeeds.

- [ ] **Step 3: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix(pf2e-engine): integration fixes for loot system"
```
