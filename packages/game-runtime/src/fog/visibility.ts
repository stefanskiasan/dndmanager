import type { TokenSenses, LightSource, Wall, FogState, Visibility, LightLevel } from './types.js'
import { getVisionRange, canSeeInLight } from './senses.js'
import { getLightLevelAt } from './lighting.js'
import { hasLineOfSight } from './line-of-sight.js'
import { gridDistance } from '../grid.js'

const VISIBILITY_PRIORITY: Record<Visibility, number> = {
  visible: 2,
  dim: 1,
  hidden: 0,
}

export function createFogState(width: number, height: number): FogState {
  const cells: Visibility[][] = []
  for (let y = 0; y < height; y++) {
    cells.push(new Array(width).fill('hidden'))
  }
  return { width, height, cells }
}

export function computeVisibility(
  token: TokenSenses,
  lightSources: LightSource[],
  walls: Wall[],
  baseLight: LightLevel,
  mapWidth: number,
  mapHeight: number
): FogState {
  const fog = createFogState(mapWidth, mapHeight)

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const cellPos = { x, y }
      const dist = gridDistance(token.position, cellPos)

      // Get light level at this cell
      const lightLevel = getLightLevelAt(cellPos, lightSources, baseLight)

      // Get vision range based on senses and light
      const visionRange = getVisionRange(token.senseType, lightLevel, token.perceptionRange)

      // Out of range
      if (dist > visionRange) continue

      // Check line of sight
      if (!hasLineOfSight(token.position, cellPos, walls)) continue

      // Determine visibility quality
      fog.cells[y][x] = canSeeInLight(token.senseType, lightLevel)
    }
  }

  return fog
}

export function mergeVisibility(fogStates: FogState[]): FogState {
  if (fogStates.length === 0) return createFogState(0, 0)

  const { width, height } = fogStates[0]
  const merged = createFogState(width, height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let best: Visibility = 'hidden'
      for (const fog of fogStates) {
        const cell = fog.cells[y]?.[x] ?? 'hidden'
        if (VISIBILITY_PRIORITY[cell] > VISIBILITY_PRIORITY[best]) {
          best = cell
        }
      }
      merged.cells[y][x] = best
    }
  }

  return merged
}
