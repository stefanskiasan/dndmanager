import type { DegreeOfSuccess, CheckResult } from './types.js'

const DEGREE_ORDER: DegreeOfSuccess[] = [
  'critical-failure',
  'failure',
  'success',
  'critical-success',
]

function adjustDegree(degree: DegreeOfSuccess, steps: number): DegreeOfSuccess {
  const idx = DEGREE_ORDER.indexOf(degree)
  const newIdx = Math.max(0, Math.min(DEGREE_ORDER.length - 1, idx + steps))
  return DEGREE_ORDER[newIdx]
}

/**
 * PF2e degree of success:
 * 1. Calculate base degree from total vs DC
 * 2. Natural 20 upgrades by one step
 * 3. Natural 1 downgrades by one step
 */
export function degreeOfSuccess(
  naturalRoll: number,
  modifier: number,
  dc: number
): DegreeOfSuccess {
  const total = naturalRoll + modifier

  // Base degree
  let degree: DegreeOfSuccess
  if (total >= dc + 10) {
    degree = 'critical-success'
  } else if (total >= dc) {
    degree = 'success'
  } else if (total <= dc - 10) {
    degree = 'critical-failure'
  } else {
    degree = 'failure'
  }

  // Natural 20: upgrade one step
  if (naturalRoll === 20) {
    degree = adjustDegree(degree, 1)
  }

  // Natural 1: downgrade one step
  if (naturalRoll === 1) {
    degree = adjustDegree(degree, -1)
  }

  return degree
}

export interface ResolveCheckParams {
  naturalRoll: number
  modifier: number
  dc: number
}

export function resolveCheck(params: ResolveCheckParams): CheckResult {
  const { naturalRoll, modifier, dc } = params
  const total = naturalRoll + modifier
  const degree = degreeOfSuccess(naturalRoll, modifier, dc)

  return {
    naturalRoll,
    totalModifier: modifier,
    total,
    dc,
    degree,
  }
}
