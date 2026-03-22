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
