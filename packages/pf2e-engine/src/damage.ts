import type { DamageRoll, DamageResult } from './types.js'
import { rollDice } from './dice.js'

type RandomFn = () => number

export function rollDamage(damage: DamageRoll, random?: RandomFn): DamageResult {
  const diceResult = damage.dice.count > 0
    ? rollDice(damage.dice, random)
    : { rolls: [] as number[], total: 0, formula: '0' }

  const total = Math.max(1, diceResult.total + damage.bonus)

  return {
    rolls: diceResult.rolls,
    bonus: damage.bonus,
    total,
    type: damage.type,
  }
}

export function applyCriticalDamage(damage: number): number {
  return damage * 2
}

export function applyResistance(damage: number, resistance: number): number {
  return Math.max(0, damage - resistance)
}

export function applyWeakness(damage: number, weakness: number): number {
  return damage + weakness
}
