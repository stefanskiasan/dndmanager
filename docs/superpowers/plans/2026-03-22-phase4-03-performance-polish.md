# Phase 4.3: Performance Optimization & UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the R3F isometric game view to production-quality performance — reducing draw calls via instancing and texture atlases, culling off-screen geometry, adding LOD for zoomed-out tokens, lazy-loading 3D models, and providing loading/transition polish so the player experience feels smooth.

**Architecture:** All changes live in `apps/web/components/game/` (and supporting files in `apps/web/lib/`). No engine or game-runtime changes are needed. The existing `GameCanvas`, `MapLayer`, `TokenLayer`, `CharacterModel`, and `IsometricCamera` components are extended or wrapped — not replaced — so existing functionality is preserved.

**Tech Stack:** TypeScript strict, React 18+, @react-three/fiber, @react-three/drei, Three.js, Zustand, tailwindcss, shadcn/ui

---

## File Structure

```
apps/web/components/game/
├── performance/
│   ├── InstancedTokenGroup.tsx       → Groups duplicate monster models into InstancedMesh
│   ├── FrustumCulledGroup.tsx        → Wrapper that hides children outside camera frustum
│   ├── TileAtlasLayer.tsx            → Replaces per-tile meshes with single atlas-textured plane
│   ├── LODToken.tsx                  → Renders simplified geometry when camera zoom is low
│   ├── LazyModel.tsx                 → Loads GLB only when token enters viewport via IntersectionObserver
│   ├── PerformanceMonitor.tsx        → FPS, draw calls, triangle count HUD
│   └── __tests__/
│       ├── InstancedTokenGroup.test.tsx
│       ├── FrustumCulledGroup.test.tsx
│       ├── TileAtlasLayer.test.tsx
│       ├── LODToken.test.tsx
│       ├── LazyModel.test.tsx
│       └── PerformanceMonitor.test.tsx
├── LoadingScreen.tsx                 → Full-screen loading overlay with progress bar
├── MapTransition.tsx                 → Fade/crossfade between room changes

apps/web/lib/
├── three-utils/
│   ├── texture-atlas.ts              → Builds a TextureAtlas from individual tile images
│   ├── frustum-helpers.ts            → Camera frustum intersection helpers
│   └── __tests__/
│       ├── texture-atlas.test.ts
│       └── frustum-helpers.test.ts
```

---

### Task 1: Instanced Mesh for Duplicate Monsters

**Files:**
- Create: `apps/web/components/game/performance/InstancedTokenGroup.tsx`
- Create: `apps/web/components/game/performance/__tests__/InstancedTokenGroup.test.tsx`
- Modify: `apps/web/components/game/TokenLayer.tsx`

- [ ] **Step 1: Create InstancedTokenGroup component**

`apps/web/components/game/performance/InstancedTokenGroup.tsx`:
```typescript
'use client'

import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { Token } from '@dndmanager/game-runtime'

const TILE_SIZE = 1
const TOKEN_HEIGHT = 0.8

interface InstancedTokenGroupProps {
  /** All tokens that share the same model/type (e.g. "goblin") */
  tokens: Token[]
  color: string
}

/**
 * Renders N identical tokens as a single InstancedMesh draw call.
 * Falls back to standard mesh for <=1 token (no instancing needed).
 */
export function InstancedTokenGroup({ tokens, color }: InstancedTokenGroupProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    if (!meshRef.current) return
    tokens.forEach((token, i) => {
      dummy.position.set(
        token.position.x * TILE_SIZE,
        TOKEN_HEIGHT / 2,
        token.position.y * TILE_SIZE,
      )
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [tokens, dummy])

  if (tokens.length === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, tokens.length]}>
      <cylinderGeometry args={[0.35, 0.35, TOKEN_HEIGHT, 16]} />
      <meshStandardMaterial color={color} />
    </instancedMesh>
  )
}
```

- [ ] **Step 2: Group tokens by model type in TokenLayer**

In `TokenLayer.tsx`, add logic to partition tokens by their `modelUrl` (or creature type for fallback tokens). Tokens that share the same model and have no custom GLB use `InstancedTokenGroup`. Tokens with unique models or player tokens continue to render individually via `TokenMesh`.

```typescript
// Group monster tokens without models by type for instancing
const { instanceGroups, individualTokens } = useMemo(() => {
  const groups: Record<string, Token[]> = {}
  const individual: Token[] = []

  tokens.forEach((token) => {
    const modelUrl = (token as Token & { modelUrl?: string }).modelUrl
    if (token.type === 'monster' && !modelUrl) {
      const key = token.name // or creatureType if available
      ;(groups[key] ??= []).push(token)
    } else {
      individual.push(token)
    }
  })

  return { instanceGroups: groups, individualTokens: individual }
}, [tokens])
```

- [ ] **Step 3: Write tests**

Test that `InstancedTokenGroup` creates an `instancedMesh` with correct instance count and updates matrices when token positions change. Verify that `TokenLayer` correctly partitions tokens into instanced groups vs individual renders.

**Commit:** `feat(game): add InstancedMesh rendering for duplicate monster tokens`

---

### Task 2: Frustum Culling Optimization

**Files:**
- Create: `apps/web/lib/three-utils/frustum-helpers.ts`
- Create: `apps/web/lib/three-utils/__tests__/frustum-helpers.test.ts`
- Create: `apps/web/components/game/performance/FrustumCulledGroup.tsx`
- Create: `apps/web/components/game/performance/__tests__/FrustumCulledGroup.test.tsx`
- Modify: `apps/web/components/game/MapLayer.tsx`
- Modify: `apps/web/components/game/TokenLayer.tsx`

- [ ] **Step 1: Create frustum helper utilities**

`apps/web/lib/three-utils/frustum-helpers.ts`:
```typescript
import * as THREE from 'three'

const _frustum = new THREE.Frustum()
const _projScreenMatrix = new THREE.Matrix4()

/**
 * Returns a Frustum built from the current camera's projection × view matrix.
 */
export function getCameraFrustum(camera: THREE.Camera): THREE.Frustum {
  _projScreenMatrix.multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  )
  _frustum.setFromProjectionMatrix(_projScreenMatrix)
  return _frustum
}

/**
 * Tests whether a tile at grid position (x, y) is inside the camera frustum.
 * Uses a bounding sphere for speed (radius covers a 1x1 tile).
 */
const _sphere = new THREE.Sphere()
const TILE_SPHERE_RADIUS = 0.72 // √(0.5² + 0.5²) ≈ 0.707

export function isTileVisible(
  frustum: THREE.Frustum,
  x: number,
  y: number,
): boolean {
  _sphere.center.set(x, 0, y)
  _sphere.radius = TILE_SPHERE_RADIUS
  return frustum.intersectsSphere(_sphere)
}
```

- [ ] **Step 2: Create FrustumCulledGroup wrapper**

`apps/web/components/game/performance/FrustumCulledGroup.tsx`:
```typescript
'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getCameraFrustum, isTileVisible } from '@/lib/three-utils/frustum-helpers'

interface FrustumCulledGroupProps {
  /** Grid positions this group covers */
  positions: { x: number; y: number }[]
  children: React.ReactNode
}

/**
 * Hides its children when none of the given grid positions are inside the
 * camera frustum. Checked once per frame — cheap because it uses spheres.
 */
export function FrustumCulledGroup({ positions, children }: FrustumCulledGroupProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()

  useFrame(() => {
    if (!groupRef.current) return
    const frustum = getCameraFrustum(camera)
    const anyVisible = positions.some((p) => isTileVisible(frustum, p.x, p.y))
    groupRef.current.visible = anyVisible
  })

  return <group ref={groupRef}>{children}</group>
}
```

- [ ] **Step 3: Apply frustum culling to MapLayer**

Divide the map into chunks (e.g. 8x8 tile groups). Wrap each chunk in a `FrustumCulledGroup` so off-screen tile batches are skipped entirely. This keeps the per-frame check count proportional to chunk count (not tile count).

```typescript
// In MapLayer: chunk tiles into CHUNK_SIZE groups
const CHUNK_SIZE = 8

const chunks = useMemo(() => {
  const result: Map<string, { x: number; y: number }[]> = new Map()
  for (let x = 0; x < mapSize[0]; x++) {
    for (let y = 0; y < mapSize[1]; y++) {
      const cx = Math.floor(x / CHUNK_SIZE)
      const cy = Math.floor(y / CHUNK_SIZE)
      const key = `${cx}-${cy}`
      if (!result.has(key)) result.set(key, [])
      result.get(key)!.push({ x, y })
    }
  }
  return result
}, [mapSize])
```

- [ ] **Step 4: Apply frustum culling to TokenLayer**

Wrap each `TokenMesh` (or instanced group) with a frustum check. Since tokens move, check visibility per-frame using the token's current grid position.

- [ ] **Step 5: Write tests**

Test `getCameraFrustum` with a known orthographic camera. Verify `isTileVisible` returns `true` for in-view tiles and `false` for far-away tiles. Test `FrustumCulledGroup` toggles `visible` correctly.

**Commit:** `feat(game): add frustum culling for map chunks and tokens`

---

### Task 3: Texture Atlas for Map Tiles

**Files:**
- Create: `apps/web/lib/three-utils/texture-atlas.ts`
- Create: `apps/web/lib/three-utils/__tests__/texture-atlas.test.ts`
- Create: `apps/web/components/game/performance/TileAtlasLayer.tsx`
- Create: `apps/web/components/game/performance/__tests__/TileAtlasLayer.test.tsx`

- [ ] **Step 1: Build texture atlas utility**

`apps/web/lib/three-utils/texture-atlas.ts`:
```typescript
import * as THREE from 'three'

export interface AtlasEntry {
  key: string
  /** UV offset in the atlas (0-1 range) */
  uOffset: number
  vOffset: number
  /** UV scale (fraction of atlas this tile occupies) */
  uScale: number
  vScale: number
}

export interface TextureAtlas {
  texture: THREE.Texture
  entries: Map<string, AtlasEntry>
}

/**
 * Creates a canvas-based texture atlas from a set of tile colors/textures.
 * Each tile type gets a slot in the atlas grid.
 *
 * @param tileTypes - Map of tile key to color hex string
 * @param tileResolution - Pixel size per tile in atlas (default: 64)
 */
export function buildColorAtlas(
  tileTypes: Record<string, string>,
  tileResolution = 64,
): TextureAtlas {
  const keys = Object.keys(tileTypes)
  const gridSize = Math.ceil(Math.sqrt(keys.length))
  const atlasSize = gridSize * tileResolution

  const canvas = document.createElement('canvas')
  canvas.width = atlasSize
  canvas.height = atlasSize
  const ctx = canvas.getContext('2d')!

  const entries = new Map<string, AtlasEntry>()

  keys.forEach((key, i) => {
    const col = i % gridSize
    const row = Math.floor(i / gridSize)
    ctx.fillStyle = tileTypes[key]
    ctx.fillRect(col * tileResolution, row * tileResolution, tileResolution, tileResolution)

    entries.set(key, {
      key,
      uOffset: col / gridSize,
      vOffset: 1 - (row + 1) / gridSize, // flip Y for GL
      uScale: 1 / gridSize,
      vScale: 1 / gridSize,
    })
  })

  const texture = new THREE.CanvasTexture(canvas)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter

  return { texture, entries }
}
```

- [ ] **Step 2: Create TileAtlasLayer component**

Replaces the per-tile individual mesh approach with a single merged `BufferGeometry` that uses UV coordinates into the atlas. This reduces draw calls from `width * height` to 1.

```typescript
/**
 * Renders the entire map as a single mesh using a texture atlas.
 * Each tile's UVs point to the correct region of the atlas.
 *
 * Falls back to the original MapLayer if the atlas fails to build.
 */
export function TileAtlasLayer() {
  // Build merged geometry with per-tile UVs
  // Single draw call for the entire map floor
}
```

The component builds a merged `PlaneGeometry` for all tiles, adjusting UV attributes per-tile to reference the correct atlas slot.

- [ ] **Step 3: Write tests**

Verify `buildColorAtlas` creates a canvas of the expected size, entries have correct UV ranges, and all tile types are represented. Test `TileAtlasLayer` renders a single mesh child.

**Commit:** `feat(game): add texture atlas for single-draw-call map rendering`

---

### Task 4: LOD System for Tokens

**Files:**
- Create: `apps/web/components/game/performance/LODToken.tsx`
- Create: `apps/web/components/game/performance/__tests__/LODToken.test.tsx`
- Modify: `apps/web/components/game/TokenLayer.tsx`

- [ ] **Step 1: Create LODToken component**

`apps/web/components/game/performance/LODToken.tsx`:
```typescript
'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CharacterModel } from '../CharacterModel'

/**
 * LOD levels:
 * - HIGH (zoom >= 30):  Full 3D model via CharacterModel
 * - MEDIUM (zoom 15-30): Low-poly cylinder with color
 * - LOW (zoom < 15):    Flat colored disc (billboard)
 */
export type LODLevel = 'high' | 'medium' | 'low'

interface LODTokenProps {
  modelUrl: string
  fallbackColor: string
  scale?: number
  children?: React.ReactNode
}

export function LODToken({ modelUrl, fallbackColor, scale }: LODTokenProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const currentLOD = useRef<LODLevel>('high')

  useFrame(() => {
    if (!groupRef.current) return
    const cam = camera as THREE.OrthographicCamera
    const zoom = cam.zoom ?? 50

    let newLOD: LODLevel
    if (zoom >= 30) newLOD = 'high'
    else if (zoom >= 15) newLOD = 'medium'
    else newLOD = 'low'

    if (newLOD !== currentLOD.current) {
      currentLOD.current = newLOD
      // Force re-render via a state update or ref flag
      // (implementation uses a zustand selector or forceUpdate pattern)
    }
  })

  return (
    <group ref={groupRef}>
      {currentLOD.current === 'high' && (
        <CharacterModel url={modelUrl} fallbackColor={fallbackColor} scale={scale} />
      )}
      {currentLOD.current === 'medium' && (
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.8, 8]} />
          <meshStandardMaterial color={fallbackColor} />
        </mesh>
      )}
      {currentLOD.current === 'low' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.35, 6]} />
          <meshBasicMaterial color={fallbackColor} />
        </mesh>
      )}
    </group>
  )
}
```

- [ ] **Step 2: Integrate LODToken into TokenMesh**

Replace the direct `<CharacterModel>` usage in `TokenMesh` with `<LODToken>`. Pass through `modelUrl` and `fallbackColor`. The LOD component handles the rest transparently.

- [ ] **Step 3: Write tests**

Test that LODToken renders the correct geometry type at each zoom threshold. Verify transitions happen cleanly (no flicker).

**Commit:** `feat(game): add LOD system for token rendering at different zoom levels`

---

### Task 5: Lazy Loading for 3D Models

**Files:**
- Create: `apps/web/components/game/performance/LazyModel.tsx`
- Create: `apps/web/components/game/performance/__tests__/LazyModel.test.tsx`
- Modify: `apps/web/components/game/CharacterModel.tsx`

- [ ] **Step 1: Create LazyModel wrapper**

`apps/web/components/game/performance/LazyModel.tsx`:
```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { getCameraFrustum, isTileVisible } from '@/lib/three-utils/frustum-helpers'

interface LazyModelProps {
  url: string
  gridX: number
  gridY: number
  /** How many tiles outside the viewport to start preloading */
  preloadMargin?: number
  children: (loaded: boolean) => React.ReactNode
}

/**
 * Defers GLB loading until the token's grid position is near the camera viewport.
 * Uses a render-callback pattern: children receive `loaded` boolean.
 *
 * Preloads via useGLTF.preload() when the token is within `preloadMargin`
 * tiles of the viewport edge.
 */
export function LazyModel({ url, gridX, gridY, preloadMargin = 3, children }: LazyModelProps) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const { camera } = useThree()

  useFrame(() => {
    if (shouldLoad) return // already triggered, no need to check
    const frustum = getCameraFrustum(camera)
    // Use a slightly expanded check for preload margin
    if (isTileVisible(frustum, gridX, gridY)) {
      setShouldLoad(true)
      if (url) useGLTF.preload(url)
    }
  })

  return <>{children(shouldLoad)}</>
}
```

- [ ] **Step 2: Integrate into CharacterModel**

Wrap the `LoadedModel` Suspense boundary with `LazyModel`. When `loaded` is `false`, show the cylinder fallback. When `true`, begin loading the GLB via the existing `useGLTF` path. This means GLB network requests only fire when the token scrolls into (or near) view.

- [ ] **Step 3: Add preload cache eviction**

Add a utility that tracks loaded model URLs and calls `useGLTF.clear(url)` for models that have been off-screen for more than 60 seconds. This prevents memory bloat on large maps with many unique models.

```typescript
// apps/web/lib/three-utils/model-cache.ts
const loadedModels = new Map<string, { lastVisible: number }>()
const EVICTION_TIMEOUT = 60_000 // 60s

export function markModelVisible(url: string) { ... }
export function evictStaleModels() { ... }
```

- [ ] **Step 4: Write tests**

Test that `LazyModel` does not trigger load for off-screen positions. Verify it triggers load when frustum includes the position. Test cache eviction timing.

**Commit:** `feat(game): add lazy loading and cache eviction for 3D token models`

---

### Task 6: R3F Performance Monitoring Component

**Files:**
- Create: `apps/web/components/game/performance/PerformanceMonitor.tsx`
- Create: `apps/web/components/game/performance/__tests__/PerformanceMonitor.test.tsx`
- Modify: `apps/web/components/game/GameCanvas.tsx`

- [ ] **Step 1: Create PerformanceMonitor component**

`apps/web/components/game/performance/PerformanceMonitor.tsx`:
```typescript
'use client'

import { useRef, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

interface PerfStats {
  fps: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  frameTime: number
}

/**
 * In-scene performance HUD. Reads from gl.info each frame.
 * Renders as an HTML overlay (not 3D text) for zero perf impact.
 *
 * Only shown in development or when toggled via keyboard shortcut (F3).
 */
export function PerformanceMonitor() {
  const { gl } = useThree()
  const [stats, setStats] = useState<PerfStats>({
    fps: 0, drawCalls: 0, triangles: 0,
    geometries: 0, textures: 0, frameTime: 0,
  })
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())

  useFrame(() => {
    frameCount.current++
    const now = performance.now()
    const delta = now - lastTime.current

    // Update stats every 500ms to avoid layout thrashing
    if (delta >= 500) {
      const info = gl.info
      setStats({
        fps: Math.round((frameCount.current / delta) * 1000),
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        frameTime: Math.round(delta / frameCount.current * 100) / 100,
      })
      frameCount.current = 0
      lastTime.current = now
    }
  })

  return null // Stats rendered via an external HTML overlay (see step 2)
}
```

- [ ] **Step 2: Create HTML overlay for stats display**

Add a sibling component outside the Canvas (in `GameCanvas.tsx`) that reads perf stats from a shared ref or zustand store and renders a fixed-position overlay:

```typescript
// In GameCanvas.tsx, alongside UIOverlay
{process.env.NODE_ENV === 'development' && <PerfOverlay />}
```

The overlay shows: FPS, draw calls, triangles, geometries, textures, frame time. Styled with `font-mono text-xs` and a semi-transparent background. Toggled with F3.

- [ ] **Step 3: Add PerformanceMonitor inside Canvas**

```typescript
// GameCanvas.tsx - inside <Canvas>
<PerformanceMonitor />
```

- [ ] **Step 4: Write tests**

Test that stats update after 500ms of frames. Verify F3 toggle shows/hides the overlay.

**Commit:** `feat(game): add performance monitoring HUD with FPS and draw call stats`

---

### Task 7: Loading Screen with Progress Bar

**Files:**
- Create: `apps/web/components/game/LoadingScreen.tsx`
- Create: `apps/web/components/game/__tests__/LoadingScreen.test.tsx`
- Modify: `apps/web/components/game/GameCanvas.tsx`

- [ ] **Step 1: Create LoadingScreen component**

`apps/web/components/game/LoadingScreen.tsx`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'

interface LoadingScreenProps {
  /** 0-100 progress percentage */
  progress: number
  /** Current loading stage description */
  stage: string
  /** Whether loading is complete */
  isComplete: boolean
}

/**
 * Full-screen overlay shown while the game scene initialises.
 * Fades out over 500ms when loading completes.
 *
 * Stages: "Connecting..." → "Loading map..." → "Loading tokens..." → "Ready"
 */
export function LoadingScreen({ progress, stage, isComplete }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    if (isComplete) {
      // Fade out
      setOpacity(0)
      const timer = setTimeout(() => setVisible(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isComplete])

  if (!visible) return null

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center
                 bg-zinc-900 transition-opacity duration-500"
      style={{ opacity }}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo / title */}
        <h1 className="text-2xl font-bold text-zinc-100">Loading Adventure...</h1>

        {/* Progress bar */}
        <div className="w-64">
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stage label */}
        <p className="text-sm text-zinc-400">{stage}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create loading progress tracker**

Add a Zustand store slice or standalone store that tracks loading stages:

```typescript
// apps/web/lib/stores/loading-store.ts
interface LoadingState {
  progress: number
  stage: string
  isComplete: boolean
  setProgress: (progress: number, stage: string) => void
  complete: () => void
}
```

Game initialization code updates this store as it progresses through: connect to realtime (20%) → load map data (40%) → load token data (60%) → preload visible models (80%) → ready (100%).

- [ ] **Step 3: Integrate into GameCanvas**

Wrap the existing Canvas + UIOverlay with the `LoadingScreen` overlay. The Canvas still mounts immediately (so R3F can begin loading), but the loading screen covers it until progress hits 100%.

- [ ] **Step 4: Write tests**

Test that LoadingScreen renders at 0% progress, updates the progress bar, shows the correct stage text, and fades out when `isComplete` is true.

**Commit:** `feat(game): add loading screen with progress tracking`

---

### Task 8: Map Transition Animations

**Files:**
- Create: `apps/web/components/game/MapTransition.tsx`
- Create: `apps/web/components/game/__tests__/MapTransition.test.tsx`
- Modify: `apps/web/components/game/GameCanvas.tsx`

- [ ] **Step 1: Create MapTransition component**

`apps/web/components/game/MapTransition.tsx`:
```typescript
'use client'

import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '@/lib/stores/game-store'

type TransitionType = 'fade' | 'crossfade' | 'slide'

interface MapTransitionProps {
  type?: TransitionType
  duration?: number // seconds
  children: React.ReactNode
}

/**
 * Wraps the map scene content and applies a transition effect when the
 * current room/map changes. Detects room changes by watching the game
 * store's currentRoom or mapId.
 *
 * - fade: opacity 1 → 0, swap content, opacity 0 → 1
 * - crossfade: old scene fades out while new scene fades in simultaneously
 * - slide: old scene slides out, new scene slides in from the direction of travel
 */
export function MapTransition({
  type = 'fade',
  duration = 0.6,
  children,
}: MapTransitionProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [transitioning, setTransitioning] = useState(false)
  const progress = useRef(0)
  const phase = useRef<'out' | 'in'>('out')

  // Watch for room changes
  const currentRoom = useGameStore((s) => s.currentRoom)
  const prevRoom = useRef(currentRoom)

  useEffect(() => {
    if (currentRoom !== prevRoom.current) {
      prevRoom.current = currentRoom
      setTransitioning(true)
      progress.current = 0
      phase.current = 'out'
    }
  }, [currentRoom])

  useFrame((_, delta) => {
    if (!transitioning || !groupRef.current) return

    progress.current += delta / (duration / 2)

    if (type === 'fade') {
      if (phase.current === 'out') {
        // Fade out
        groupRef.current.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
            child.material.opacity = 1 - progress.current
          }
        })
        if (progress.current >= 1) {
          phase.current = 'in'
          progress.current = 0
        }
      } else {
        // Fade in
        groupRef.current.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
            child.material.opacity = progress.current
          }
        })
        if (progress.current >= 1) {
          setTransitioning(false)
        }
      }
    }
  })

  return <group ref={groupRef}>{children}</group>
}
```

- [ ] **Step 2: Integrate into GameCanvas**

Wrap `<MapLayer />` and `<TokenLayer />` inside `<MapTransition>`:

```typescript
<Canvas>
  <IsometricCamera zoom={40} target={[centerX, 0, centerY]} />
  <MapTransition type="fade" duration={0.6}>
    <MapLayer />
    <TokenLayer />
  </MapTransition>
  <GridOverlay />
</Canvas>
```

- [ ] **Step 3: Add room change detection to game store**

Ensure `game-store` exposes a `currentRoom` (or `mapId`) field that updates when the party moves between rooms. The `MapTransition` component watches this field to trigger animations.

- [ ] **Step 4: Write tests**

Test that `MapTransition` triggers a fade-out/fade-in cycle when `currentRoom` changes. Verify the transition duration is respected. Test that content is visible and fully opaque when no transition is active.

**Commit:** `feat(game): add fade/crossfade transition animations between map rooms`

---

## Integration Notes

- **Incremental adoption:** Each task is independent. They can be implemented in any order and toggled individually. The existing `MapLayer` and `TokenLayer` continue to work as-is; the new components wrap or replace them.
- **Feature flags:** Consider a `usePerformanceSettings` store that lets users toggle atlas rendering, LOD, and instancing on/off (useful for debugging and for low-end devices that may have driver issues with instancing).
- **No engine changes:** All code lives in `apps/web/`. The `@dndmanager/game-runtime` package is consumed read-only.
- **Performance budget:** Target 60 FPS on a mid-range laptop (e.g. M1 MacBook Air) with a 40x40 tile map and 20 tokens. The monitoring HUD (Task 6) provides the measurement tool to validate this.
