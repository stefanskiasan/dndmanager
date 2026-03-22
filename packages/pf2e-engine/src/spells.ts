import type { SpellSlot, SpellDefinition } from './types.js'
import { parseDiceNotation } from './dice.js'

export function createSpellSlots(
  config: { level: number; count: number }[]
): SpellSlot[] {
  return config.map(({ level, count }) => ({
    level,
    max: count,
    used: 0,
  }))
}

export function canCastSpell(slots: SpellSlot[], spellLevel: number): boolean {
  return slots.some((s) => s.level >= spellLevel && s.used < s.max)
}

export function useSpellSlot(slots: SpellSlot[], spellLevel: number): SpellSlot[] {
  const targetIdx = slots.findIndex((s) => s.level >= spellLevel && s.used < s.max)
  if (targetIdx === -1) {
    throw new Error(`No available spell slot at level ${spellLevel} or above`)
  }
  return slots.map((s, i) =>
    i === targetIdx ? { ...s, used: s.used + 1 } : s
  )
}

export function restoreAllSlots(slots: SpellSlot[]): SpellSlot[] {
  return slots.map((s) => ({ ...s, used: 0 }))
}

export function heightenDamage(spell: SpellDefinition, castLevel: number): string {
  if (!spell.damage) return ''
  if (!spell.damage.heightenedPerLevel || castLevel <= spell.level) {
    return spell.damage.formula
  }

  const levelsAbove = castLevel - spell.level
  const baseDice = parseDiceNotation(spell.damage.formula)
  const addDice = parseDiceNotation(spell.damage.heightenedPerLevel)

  if (!baseDice || !addDice) return spell.damage.formula

  const totalCount = baseDice.count + addDice.count * levelsAbove
  return `${totalCount}d${baseDice.sides}`
}

export function getAvailableSlotLevels(slots: SpellSlot[]): number[] {
  return slots.filter((s) => s.used < s.max).map((s) => s.level)
}
