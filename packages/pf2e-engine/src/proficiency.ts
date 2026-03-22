import type { ProficiencyRank } from './types.js'

const RANK_VALUES: Record<ProficiencyRank, number> = {
  untrained: 0,
  trained: 2,
  expert: 4,
  master: 6,
  legendary: 8,
}

const RANK_ORDER: ProficiencyRank[] = ['untrained', 'trained', 'expert', 'master', 'legendary']

export function proficiencyRankValue(rank: ProficiencyRank): number {
  return RANK_VALUES[rank]
}

/**
 * PF2e proficiency bonus:
 * - Untrained: 0 (no level added)
 * - Trained+: level + rank value
 */
export function proficiencyBonus(rank: ProficiencyRank, level: number): number {
  if (rank === 'untrained') return 0
  return level + RANK_VALUES[rank]
}

export function nextProficiencyRank(rank: ProficiencyRank): ProficiencyRank | null {
  const idx = RANK_ORDER.indexOf(rank)
  if (idx >= RANK_ORDER.length - 1) return null
  return RANK_ORDER[idx + 1]
}
