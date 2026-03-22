import type { GridPosition } from '../types.js'
import type { LightSource, LightLevel } from './types.js'
import { gridDistance } from '../grid.js'

export const COMMON_LIGHT_SOURCES = {
  torch: { brightRadius: 20, dimRadius: 40 },
  lantern: { brightRadius: 30, dimRadius: 60 },
  candle: { brightRadius: 5, dimRadius: 10 },
  light_spell: { brightRadius: 20, dimRadius: 40 },
  dancing_lights: { brightRadius: 10, dimRadius: 20 },
} as const

const LIGHT_PRIORITY: Record<LightLevel, number> = {
  bright: 2,
  dim: 1,
  darkness: 0,
}

export function getLightLevelAt(
  position: GridPosition,
  sources: LightSource[],
  baseLight: LightLevel
): LightLevel {
  let best: LightLevel = baseLight

  for (const source of sources) {
    const dist = gridDistance(position, source.position)

    let level: LightLevel
    if (dist <= source.brightRadius) {
      level = 'bright'
    } else if (dist <= source.dimRadius) {
      level = 'dim'
    } else {
      continue
    }

    if (LIGHT_PRIORITY[level] > LIGHT_PRIORITY[best]) {
      best = level
    }
  }

  return best
}
