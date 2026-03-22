/**
 * Seedable PRNG based on Mulberry32.
 * Pure — no side effects, fully deterministic from seed.
 */
export interface Rng {
  /** Returns a float in [0, 1) */
  next(): number
  /** Returns an integer in [min, max] inclusive */
  intRange(min: number, max: number): number
  /** Pick a random element from a non-empty array */
  pick<T>(arr: readonly T[]): T
  /** Fisher-Yates shuffle (mutates and returns the array) */
  shuffle<T>(arr: T[]): T[]
}

export function createRng(seed: number): Rng {
  let state = seed | 0

  function next(): number {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  function intRange(min: number, max: number): number {
    return min + Math.floor(next() * (max - min + 1))
  }

  function pick<T>(arr: readonly T[]): T {
    return arr[intRange(0, arr.length - 1)]
  }

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = intRange(0, i)
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  return { next, intRange, pick, shuffle }
}
