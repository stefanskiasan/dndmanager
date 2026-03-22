# Phase 2.3: Fog of War Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement dynamic fog of war based on PF2e senses (darkvision, low-light vision), light sources, and line-of-sight raycasting through walls. Each player sees only what their character can perceive.

**Architecture:** New module in `packages/game-runtime/src/fog/`. Pure functions that compute visibility per token based on senses, light sources, and wall geometry. The fog state is a 2D grid where each cell is `visible`, `dim`, or `hidden` per player.

**Tech Stack:** TypeScript strict, Vitest

**Spec:** `docs/superpowers/specs/2026-03-21-dndmanager-platform-design.md` (Section 7: Fog of War Engine)

---

## File Structure

```
packages/game-runtime/src/
├── fog/
│   ├── index.ts                      → Re-exports
│   ├── types.ts                      → Fog-specific types
│   ├── senses.ts                     → Vision range by sense type
│   ├── lighting.ts                   → Light source calculations
│   ├── line-of-sight.ts             → Wall-blocking raycast
│   └── visibility.ts                → Combines senses + light + LOS
├── __tests__/
│   ├── fog-senses.test.ts
│   ├── fog-lighting.test.ts
│   ├── fog-los.test.ts
│   └── fog-visibility.test.ts
```

---

### Task 1: Fog Types

**Files:**
- Create: `packages/game-runtime/src/fog/types.ts`
- Create: `packages/game-runtime/src/fog/index.ts`

- [ ] **Step 1: Create fog types**

`packages/game-runtime/src/fog/types.ts`:
```typescript
import type { GridPosition } from '../types.js'

export type Visibility = 'visible' | 'dim' | 'hidden'
export type SenseType = 'normal' | 'low-light' | 'darkvision'
export type LightLevel = 'bright' | 'dim' | 'darkness'

export interface LightSource {
  position: GridPosition
  brightRadius: number   // in feet
  dimRadius: number      // in feet
}

export interface Wall {
  from: GridPosition
  to: GridPosition
}

export interface FogState {
  width: number
  height: number
  cells: Visibility[][]  // [y][x]
}

export interface TokenSenses {
  tokenId: string
  position: GridPosition
  senseType: SenseType
  perceptionRange: number  // in feet
}
```

`packages/game-runtime/src/fog/index.ts`:
```typescript
export * from './types.js'
export * from './senses.js'
export * from './lighting.js'
export * from './line-of-sight.js'
export * from './visibility.js'
```

- [ ] **Step 2: Update main index.ts**

Add `export * from './fog/index.js'` to `packages/game-runtime/src/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add packages/game-runtime/src/fog/ packages/game-runtime/src/index.ts
git commit -m "feat(game-runtime): add fog of war type definitions"
```

---

### Task 2: Senses System

**Files:**
- Create: `packages/game-runtime/src/fog/senses.ts`
- Test: `packages/game-runtime/src/__tests__/fog-senses.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/fog-senses.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { getVisionRange, canSeeInLight } from '../fog/senses.js'
import type { SenseType, LightLevel } from '../fog/types.js'

describe('getVisionRange', () => {
  it('normal vision: full range in bright light', () => {
    expect(getVisionRange('normal', 'bright', 60)).toBe(60)
  })

  it('normal vision: half range in dim light', () => {
    expect(getVisionRange('normal', 'dim', 60)).toBe(30)
  })

  it('normal vision: 0 range in darkness', () => {
    expect(getVisionRange('normal', 'darkness', 60)).toBe(0)
  })

  it('low-light vision: full range in bright and dim', () => {
    expect(getVisionRange('low-light', 'bright', 60)).toBe(60)
    expect(getVisionRange('low-light', 'dim', 60)).toBe(60)
  })

  it('low-light vision: 0 in darkness', () => {
    expect(getVisionRange('low-light', 'darkness', 60)).toBe(0)
  })

  it('darkvision: full range in all light levels', () => {
    expect(getVisionRange('darkvision', 'bright', 60)).toBe(60)
    expect(getVisionRange('darkvision', 'dim', 60)).toBe(60)
    expect(getVisionRange('darkvision', 'darkness', 60)).toBe(60)
  })
})

describe('canSeeInLight', () => {
  it('normal vision can see in bright', () => {
    expect(canSeeInLight('normal', 'bright')).toBe('visible')
  })

  it('normal vision sees dim in dim', () => {
    expect(canSeeInLight('normal', 'dim')).toBe('dim')
  })

  it('normal vision cannot see in darkness', () => {
    expect(canSeeInLight('normal', 'darkness')).toBe('hidden')
  })

  it('darkvision sees in darkness as dim', () => {
    expect(canSeeInLight('darkvision', 'darkness')).toBe('dim')
  })

  it('low-light treats dim as visible', () => {
    expect(canSeeInLight('low-light', 'dim')).toBe('visible')
  })
})
```

- [ ] **Step 2: Implement senses.ts**

`packages/game-runtime/src/fog/senses.ts`:
```typescript
import type { SenseType, LightLevel, Visibility } from './types.js'

export function getVisionRange(sense: SenseType, light: LightLevel, baseRange: number): number {
  switch (sense) {
    case 'darkvision':
      return baseRange
    case 'low-light':
      return light === 'darkness' ? 0 : baseRange
    case 'normal':
      if (light === 'bright') return baseRange
      if (light === 'dim') return Math.floor(baseRange / 2)
      return 0
  }
}

export function canSeeInLight(sense: SenseType, light: LightLevel): Visibility {
  switch (sense) {
    case 'darkvision':
      return light === 'darkness' ? 'dim' : 'visible'
    case 'low-light':
      if (light === 'bright') return 'visible'
      if (light === 'dim') return 'visible'
      return 'hidden'
    case 'normal':
      if (light === 'bright') return 'visible'
      if (light === 'dim') return 'dim'
      return 'hidden'
  }
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add packages/game-runtime/src/fog/senses.ts packages/game-runtime/src/__tests__/fog-senses.test.ts
git commit -m "feat(game-runtime): add vision sense system for fog of war"
```

---

### Task 3: Light Sources

**Files:**
- Create: `packages/game-runtime/src/fog/lighting.ts`
- Test: `packages/game-runtime/src/__tests__/fog-lighting.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/fog-lighting.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { getLightLevelAt, COMMON_LIGHT_SOURCES } from '../fog/lighting.js'
import type { LightSource, LightLevel } from '../fog/types.js'

describe('COMMON_LIGHT_SOURCES', () => {
  it('torch has 20ft bright and 40ft dim', () => {
    expect(COMMON_LIGHT_SOURCES.torch.brightRadius).toBe(20)
    expect(COMMON_LIGHT_SOURCES.torch.dimRadius).toBe(40)
  })

  it('lantern has 30ft bright and 60ft dim', () => {
    expect(COMMON_LIGHT_SOURCES.lantern.brightRadius).toBe(30)
    expect(COMMON_LIGHT_SOURCES.lantern.dimRadius).toBe(60)
  })
})

describe('getLightLevelAt', () => {
  it('returns bright within bright radius', () => {
    const sources: LightSource[] = [
      { position: { x: 5, y: 5 }, brightRadius: 20, dimRadius: 40 },
    ]
    expect(getLightLevelAt({ x: 6, y: 5 }, sources, 'darkness')).toBe('bright')
  })

  it('returns dim between bright and dim radius', () => {
    const sources: LightSource[] = [
      { position: { x: 5, y: 5 }, brightRadius: 20, dimRadius: 40 },
    ]
    // 5 squares away = 25ft, outside bright (20ft) but inside dim (40ft)
    expect(getLightLevelAt({ x: 10, y: 5 }, sources, 'darkness')).toBe('dim')
  })

  it('returns base light outside all sources', () => {
    const sources: LightSource[] = [
      { position: { x: 5, y: 5 }, brightRadius: 20, dimRadius: 40 },
    ]
    // 10 squares = 50ft, outside dim (40ft)
    expect(getLightLevelAt({ x: 15, y: 5 }, sources, 'darkness')).toBe('darkness')
  })

  it('multiple sources: best light wins', () => {
    const sources: LightSource[] = [
      { position: { x: 3, y: 5 }, brightRadius: 10, dimRadius: 20 },
      { position: { x: 7, y: 5 }, brightRadius: 20, dimRadius: 40 },
    ]
    // Position 5,5: 10ft from source 1 (dim), 10ft from source 2 (bright)
    expect(getLightLevelAt({ x: 5, y: 5 }, sources, 'darkness')).toBe('bright')
  })

  it('no sources: returns base light', () => {
    expect(getLightLevelAt({ x: 5, y: 5 }, [], 'dim')).toBe('dim')
  })
})
```

- [ ] **Step 2: Implement lighting.ts**

`packages/game-runtime/src/fog/lighting.ts`:
```typescript
import type { GridPosition, LightSource, LightLevel } from './types.js'
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
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add packages/game-runtime/src/fog/lighting.ts packages/game-runtime/src/__tests__/fog-lighting.test.ts
git commit -m "feat(game-runtime): add light source system for fog of war"
```

---

### Task 4: Line of Sight (Raycasting)

**Files:**
- Create: `packages/game-runtime/src/fog/line-of-sight.ts`
- Test: `packages/game-runtime/src/__tests__/fog-los.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/fog-los.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { hasLineOfSight, castRay } from '../fog/line-of-sight.js'
import type { Wall } from '../fog/types.js'

describe('hasLineOfSight', () => {
  it('returns true with no walls', () => {
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 5, y: 5 }, [])).toBe(true)
  })

  it('returns true when wall is not in the way', () => {
    const walls: Wall[] = [
      { from: { x: 10, y: 0 }, to: { x: 10, y: 10 } },
    ]
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 5, y: 5 }, walls)).toBe(true)
  })

  it('returns false when wall blocks sight', () => {
    const walls: Wall[] = [
      { from: { x: 3, y: 0 }, to: { x: 3, y: 10 } },
    ]
    expect(hasLineOfSight({ x: 0, y: 5 }, { x: 5, y: 5 }, walls)).toBe(false)
  })

  it('returns false when horizontal wall blocks', () => {
    const walls: Wall[] = [
      { from: { x: 0, y: 3 }, to: { x: 10, y: 3 } },
    ]
    expect(hasLineOfSight({ x: 5, y: 0 }, { x: 5, y: 5 }, walls)).toBe(false)
  })

  it('returns true for same position', () => {
    expect(hasLineOfSight({ x: 3, y: 3 }, { x: 3, y: 3 }, [])).toBe(true)
  })
})

describe('castRay', () => {
  it('returns all cells along a line', () => {
    const cells = castRay({ x: 0, y: 0 }, { x: 3, y: 0 })
    expect(cells.length).toBeGreaterThanOrEqual(3)
    expect(cells).toContainEqual({ x: 1, y: 0 })
    expect(cells).toContainEqual({ x: 2, y: 0 })
    expect(cells).toContainEqual({ x: 3, y: 0 })
  })

  it('handles diagonal rays', () => {
    const cells = castRay({ x: 0, y: 0 }, { x: 3, y: 3 })
    expect(cells.length).toBeGreaterThanOrEqual(3)
  })

  it('returns just target for same position', () => {
    const cells = castRay({ x: 3, y: 3 }, { x: 3, y: 3 })
    expect(cells).toContainEqual({ x: 3, y: 3 })
  })
})
```

- [ ] **Step 2: Implement line-of-sight.ts**

`packages/game-runtime/src/fog/line-of-sight.ts`:
```typescript
import type { GridPosition, Wall } from './types.js'

/**
 * Bresenham's line algorithm — returns all grid cells along a line.
 */
export function castRay(from: GridPosition, to: GridPosition): GridPosition[] {
  const cells: GridPosition[] = []
  let x0 = from.x, y0 = from.y
  const x1 = to.x, y1 = to.y
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  while (true) {
    cells.push({ x: x0, y: y0 })
    if (x0 === x1 && y0 === y1) break
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; x0 += sx }
    if (e2 < dx) { err += dx; y0 += sy }
  }

  return cells
}

/**
 * Check if a line segment (ray) intersects a wall segment.
 * Uses simple segment-segment intersection.
 */
function segmentsIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number
): boolean {
  const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx)
  if (Math.abs(denom) < 0.0001) return false // parallel

  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom

  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99
}

/**
 * Check line of sight between two grid positions.
 * Returns false if any wall blocks the line.
 */
export function hasLineOfSight(
  from: GridPosition,
  to: GridPosition,
  walls: Wall[]
): boolean {
  if (from.x === to.x && from.y === to.y) return true

  // Cast from center of cells
  const fx = from.x + 0.5, fy = from.y + 0.5
  const tx = to.x + 0.5, ty = to.y + 0.5

  for (const wall of walls) {
    if (segmentsIntersect(
      fx, fy, tx, ty,
      wall.from.x, wall.from.y, wall.to.x, wall.to.y
    )) {
      return false
    }
  }

  return true
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @dndmanager/game-runtime test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add packages/game-runtime/src/fog/line-of-sight.ts packages/game-runtime/src/__tests__/fog-los.test.ts
git commit -m "feat(game-runtime): add line-of-sight raycasting for fog of war"
```

---

### Task 5: Visibility Computation

**Files:**
- Create: `packages/game-runtime/src/fog/visibility.ts`
- Test: `packages/game-runtime/src/__tests__/fog-visibility.test.ts`

- [ ] **Step 1: Write failing tests**

`packages/game-runtime/src/__tests__/fog-visibility.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { computeVisibility, createFogState, mergeVisibility } from '../fog/visibility.js'
import type { TokenSenses, LightSource, Wall, FogState, Visibility } from '../fog/types.js'

describe('createFogState', () => {
  it('creates grid filled with hidden', () => {
    const fog = createFogState(5, 5)
    expect(fog.width).toBe(5)
    expect(fog.height).toBe(5)
    expect(fog.cells[0][0]).toBe('hidden')
    expect(fog.cells[4][4]).toBe('hidden')
  })
})

describe('computeVisibility', () => {
  it('marks cells within vision range as visible', () => {
    const token: TokenSenses = {
      tokenId: 'thorin',
      position: { x: 5, y: 5 },
      senseType: 'normal',
      perceptionRange: 60,
    }
    const fog = computeVisibility(token, [], [], 'bright', 10, 10)
    expect(fog.cells[5][5]).toBe('visible') // own position
    expect(fog.cells[5][6]).toBe('visible') // adjacent
  })

  it('walls block visibility', () => {
    const token: TokenSenses = {
      tokenId: 'thorin',
      position: { x: 2, y: 5 },
      senseType: 'normal',
      perceptionRange: 60,
    }
    const walls: Wall[] = [
      { from: { x: 4, y: 0 }, to: { x: 4, y: 10 } },
    ]
    const fog = computeVisibility(token, [], walls, 'bright', 10, 10)
    expect(fog.cells[5][2]).toBe('visible')
    expect(fog.cells[5][6]).toBe('hidden') // behind wall
  })

  it('darkvision sees in darkness', () => {
    const token: TokenSenses = {
      tokenId: 'elf',
      position: { x: 5, y: 5 },
      senseType: 'darkvision',
      perceptionRange: 60,
    }
    const fog = computeVisibility(token, [], [], 'darkness', 10, 10)
    expect(fog.cells[5][6]).toBe('dim') // darkvision in darkness = dim
  })

  it('normal vision cannot see in darkness', () => {
    const token: TokenSenses = {
      tokenId: 'human',
      position: { x: 5, y: 5 },
      senseType: 'normal',
      perceptionRange: 60,
    }
    const fog = computeVisibility(token, [], [], 'darkness', 10, 10)
    expect(fog.cells[5][6]).toBe('hidden')
  })

  it('light source illuminates area in darkness', () => {
    const token: TokenSenses = {
      tokenId: 'human',
      position: { x: 5, y: 5 },
      senseType: 'normal',
      perceptionRange: 60,
    }
    const lights: LightSource[] = [
      { position: { x: 5, y: 5 }, brightRadius: 20, dimRadius: 40 },
    ]
    const fog = computeVisibility(token, lights, [], 'darkness', 10, 10)
    expect(fog.cells[5][6]).toBe('visible') // within torch bright
  })
})

describe('mergeVisibility', () => {
  it('takes best visibility from multiple fog states', () => {
    const fog1 = createFogState(3, 3)
    fog1.cells[0][0] = 'visible'
    fog1.cells[1][1] = 'dim'

    const fog2 = createFogState(3, 3)
    fog2.cells[0][0] = 'dim'
    fog2.cells[1][1] = 'visible'
    fog2.cells[2][2] = 'dim'

    const merged = mergeVisibility([fog1, fog2])
    expect(merged.cells[0][0]).toBe('visible') // best of visible, dim
    expect(merged.cells[1][1]).toBe('visible') // best of dim, visible
    expect(merged.cells[2][2]).toBe('dim')     // best of hidden, dim
  })
})
```

- [ ] **Step 2: Implement visibility.ts**

`packages/game-runtime/src/fog/visibility.ts`:
```typescript
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
```

- [ ] **Step 3: Run all tests**

Run: `pnpm test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add packages/game-runtime/src/fog/visibility.ts packages/game-runtime/src/__tests__/fog-visibility.test.ts
git commit -m "feat(game-runtime): add visibility computation combining senses, light, and LOS"
```
