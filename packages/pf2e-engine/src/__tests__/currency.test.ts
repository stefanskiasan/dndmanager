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
