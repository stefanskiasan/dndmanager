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
