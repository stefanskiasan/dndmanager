import type { DiceRoll, RollResult } from './types.js'

type RandomFn = () => number

function defaultRandom(): number {
  return Math.random()
}

function rollSingleDie(sides: number, random: RandomFn): number {
  return Math.floor(random() * sides) + 1
}

export function rollDice(dice: DiceRoll, random: RandomFn = defaultRandom): RollResult {
  const rolls: number[] = []
  for (let i = 0; i < dice.count; i++) {
    rolls.push(rollSingleDie(dice.sides, random))
  }
  return {
    rolls,
    total: rolls.reduce((a, b) => a + b, 0),
    formula: `${dice.count}d${dice.sides}`,
  }
}

export function rollD20(random: RandomFn = defaultRandom): number {
  return rollSingleDie(20, random)
}

export function parseDiceNotation(notation: string): DiceRoll | null {
  const match = notation.match(/^(\d+)d(\d+)$/)
  if (!match) return null
  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
  }
}
