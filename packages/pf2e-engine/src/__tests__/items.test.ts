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
