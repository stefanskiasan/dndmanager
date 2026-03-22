import type { HitPoints, DyingState } from './types.js'

export function createHitPoints(max: number): HitPoints {
  return { current: max, max, temp: 0 }
}

export function applyDamage(hp: HitPoints, damage: number): HitPoints {
  let remaining = damage

  // Temp HP absorbs first
  const tempAbsorbed = Math.min(hp.temp, remaining)
  remaining -= tempAbsorbed

  return {
    current: hp.current - remaining,
    max: hp.max,
    temp: hp.temp - tempAbsorbed,
  }
}

export function applyHealing(hp: HitPoints, healing: number): HitPoints {
  return {
    current: Math.min(hp.max, hp.current + healing),
    max: hp.max,
    temp: hp.temp,
  }
}

export function addTempHP(hp: HitPoints, amount: number): HitPoints {
  return {
    ...hp,
    temp: Math.max(hp.temp, amount),
  }
}

export function createDyingState(): DyingState {
  return { dying: 0, wounded: 0, doomed: 0 }
}

export function incrementDying(state: DyingState): DyingState {
  return {
    ...state,
    dying: state.dying + 1 + state.wounded,
  }
}

export function checkDeath(state: DyingState): boolean {
  const maxDying = 4 - state.doomed
  return state.dying >= maxDying
}

export function applyWounded(state: DyingState): DyingState {
  return {
    ...state,
    wounded: state.wounded + 1,
  }
}
