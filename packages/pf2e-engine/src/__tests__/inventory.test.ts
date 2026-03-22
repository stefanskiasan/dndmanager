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
