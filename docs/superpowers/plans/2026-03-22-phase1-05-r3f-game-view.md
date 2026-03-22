# Phase 1.5: R3F Game View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the isometric 3D game view using React Three Fiber — isometric camera, tile-based map rendering, token display, grid interaction (hover/click), and movement range highlighting. This is the visual core of the platform.

**Architecture:** R3F components inside the Next.js app (`apps/web/components/game/`). The game view is a single `<GameCanvas>` component containing sub-components for camera, map, tokens, and interaction layers. State comes from a Zustand store that mirrors the game-runtime's GameState. No Supabase integration yet — uses mock data.

**Tech Stack:** React Three Fiber, @react-three/drei, Three.js, Zustand, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-21-dndmanager-platform-design.md` (Section 9)

---

## File Structure

```
apps/web/
├── components/
│   └── game/
│       ├── GameCanvas.tsx            → Main R3F Canvas wrapper
│       ├── IsometricCamera.tsx       → Isometric camera with zoom/pan
│       ├── MapLayer.tsx              → Tile-based map rendering
│       ├── TokenLayer.tsx            → 3D token display (placeholder meshes)
│       ├── GridOverlay.tsx           → Grid hover highlight + movement range
│       ├── UIOverlay.tsx             → HTML overlay (initiative bar, action bar)
│       └── __tests__/
│           └── game-store.test.ts    → Store unit tests
├── lib/
│   └── stores/
│       └── game-store.ts            → Zustand store for game state
├── app/
│   └── (game)/
│       └── play/
│           └── [sessionId]/
│               └── page.tsx          → Game play page
```

---

### Task 1: Install R3F Dependencies

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install React Three Fiber and dependencies**

Run: `cd /Users/asanstefanski/Private/dndmanager/apps/web && pnpm add @react-three/fiber @react-three/drei three`

Run: `pnpm add -D @types/three`

Expected: Packages added to package.json

- [ ] **Step 2: Verify build still works**

Run: `cd /Users/asanstefanski/Private/dndmanager && pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add React Three Fiber, drei, and Three.js dependencies"
```

---

### Task 2: Game State Store (Zustand)

**Files:**
- Create: `apps/web/lib/stores/game-store.ts`
- Test: `apps/web/components/game/__tests__/game-store.test.ts`

- [ ] **Step 1: Write failing tests**

First, add vitest to the web app:
Run: `cd /Users/asanstefanski/Private/dndmanager/apps/web && pnpm add -D vitest`

Create `apps/web/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

Add to `apps/web/package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

`apps/web/components/game/__tests__/game-store.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/lib/stores/game-store'
import type { Token, GridPosition } from '@dndmanager/game-runtime'

describe('game store', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('initializes with default state', () => {
    const state = useGameStore.getState()
    expect(state.mode).toBe('exploration')
    expect(state.tokens).toEqual([])
    expect(state.selectedTokenId).toBeNull()
    expect(state.hoveredPosition).toBeNull()
  })

  it('sets tokens', () => {
    const token: Token = {
      id: 'thorin',
      name: 'Thorin',
      type: 'player',
      ownerId: 'user-1',
      position: { x: 3, y: 5 },
      speed: 25,
      conditions: [],
      hp: { current: 45, max: 45, temp: 0 },
      ac: 18,
      visible: true,
    }
    useGameStore.getState().setTokens([token])
    expect(useGameStore.getState().tokens).toHaveLength(1)
  })

  it('selects and deselects token', () => {
    useGameStore.getState().selectToken('thorin')
    expect(useGameStore.getState().selectedTokenId).toBe('thorin')

    useGameStore.getState().selectToken(null)
    expect(useGameStore.getState().selectedTokenId).toBeNull()
  })

  it('updates hovered position', () => {
    useGameStore.getState().setHoveredPosition({ x: 5, y: 3 })
    expect(useGameStore.getState().hoveredPosition).toEqual({ x: 5, y: 3 })
  })

  it('moves token', () => {
    const token: Token = {
      id: 'thorin',
      name: 'Thorin',
      type: 'player',
      ownerId: 'user-1',
      position: { x: 0, y: 0 },
      speed: 25,
      conditions: [],
      hp: { current: 45, max: 45, temp: 0 },
      ac: 18,
      visible: true,
    }
    useGameStore.getState().setTokens([token])
    useGameStore.getState().moveToken('thorin', { x: 3, y: 2 })
    expect(useGameStore.getState().tokens[0].position).toEqual({ x: 3, y: 2 })
  })

  it('sets game mode', () => {
    useGameStore.getState().setMode('encounter')
    expect(useGameStore.getState().mode).toBe('encounter')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/asanstefanski/Private/dndmanager && pnpm --filter @dndmanager/web test`
Expected: FAIL

- [ ] **Step 3: Implement game-store.ts**

`apps/web/lib/stores/game-store.ts`:
```typescript
import { create } from 'zustand'
import type { Token, GameMode, GridPosition, TurnState, InitiativeEntry } from '@dndmanager/game-runtime'

interface GameStore {
  // State
  mode: GameMode
  tokens: Token[]
  selectedTokenId: string | null
  hoveredPosition: GridPosition | null
  initiative: InitiativeEntry[]
  turnOrder: string[]
  currentTurnIndex: number
  turn: TurnState | null
  round: number

  // Map
  mapSize: [number, number]
  mapTiles: string

  // Actions
  setTokens: (tokens: Token[]) => void
  selectToken: (tokenId: string | null) => void
  setHoveredPosition: (pos: GridPosition | null) => void
  moveToken: (tokenId: string, position: GridPosition) => void
  setMode: (mode: GameMode) => void
  setInitiative: (initiative: InitiativeEntry[], turnOrder: string[]) => void
  setTurn: (turn: TurnState | null) => void
  setRound: (round: number) => void
  setMap: (size: [number, number], tiles: string) => void
  reset: () => void
}

const initialState = {
  mode: 'exploration' as GameMode,
  tokens: [] as Token[],
  selectedTokenId: null as string | null,
  hoveredPosition: null as GridPosition | null,
  initiative: [] as InitiativeEntry[],
  turnOrder: [] as string[],
  currentTurnIndex: -1,
  turn: null as TurnState | null,
  round: 0,
  mapSize: [10, 10] as [number, number],
  mapTiles: 'stone',
}

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setTokens: (tokens) => set({ tokens }),

  selectToken: (tokenId) => set({ selectedTokenId: tokenId }),

  setHoveredPosition: (pos) => set({ hoveredPosition: pos }),

  moveToken: (tokenId, position) =>
    set((state) => ({
      tokens: state.tokens.map((t) =>
        t.id === tokenId ? { ...t, position } : t
      ),
    })),

  setMode: (mode) => set({ mode }),

  setInitiative: (initiative, turnOrder) =>
    set({ initiative, turnOrder }),

  setTurn: (turn) => set({ turn }),

  setRound: (round) => set({ round }),

  setMap: (size, tiles) => set({ mapSize: size, mapTiles: tiles }),

  reset: () => set(initialState),
}))
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @dndmanager/web test`
Expected: All 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/stores/ apps/web/components/game/__tests__/ apps/web/vitest.config.ts apps/web/package.json
git commit -m "feat(web): add Zustand game state store with tests"
```

---

### Task 3: Isometric Camera

**Files:**
- Create: `apps/web/components/game/IsometricCamera.tsx`

- [ ] **Step 1: Create isometric camera component**

`apps/web/components/game/IsometricCamera.tsx`:
```tsx
'use client'

import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'

interface IsometricCameraProps {
  zoom?: number
  target?: [number, number, number]
}

export function IsometricCamera({ zoom = 50, target = [0, 0, 0] }: IsometricCameraProps) {
  const cameraRef = useRef<THREE.OrthographicCamera>(null)
  const { size } = useThree()

  useEffect(() => {
    if (!cameraRef.current) return

    const cam = cameraRef.current
    // Isometric angle: 45deg rotation, ~35.264deg elevation (atan(1/sqrt(2)))
    const distance = 100
    const angle = Math.PI / 4   // 45 degrees
    const elevation = Math.atan(1 / Math.sqrt(2)) // ~35.264 degrees

    cam.position.set(
      target[0] + distance * Math.cos(elevation) * Math.cos(angle),
      target[1] + distance * Math.sin(elevation),
      target[2] + distance * Math.cos(elevation) * Math.sin(angle)
    )
    cam.lookAt(target[0], target[1], target[2])
    cam.zoom = zoom
    cam.updateProjectionMatrix()
  }, [zoom, target])

  return (
    <OrthographicCamera
      ref={cameraRef}
      makeDefault
      near={0.1}
      far={1000}
      zoom={zoom}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/IsometricCamera.tsx
git commit -m "feat(web): add isometric camera component"
```

---

### Task 4: Map Layer (Tile Rendering)

**Files:**
- Create: `apps/web/components/game/MapLayer.tsx`

- [ ] **Step 1: Create map layer component**

`apps/web/components/game/MapLayer.tsx`:
```tsx
'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/lib/stores/game-store'

const TILE_SIZE = 1
const TILE_COLORS: Record<string, string> = {
  'stone': '#6b7280',
  'cave-stone': '#52525b',
  'grass': '#4ade80',
  'wood': '#a16207',
  'sand': '#fbbf24',
  'water': '#3b82f6',
}

interface TileProps {
  x: number
  y: number
  color: string
}

function Tile({ x, y, color }: TileProps) {
  return (
    <mesh position={[x * TILE_SIZE, 0, y * TILE_SIZE]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[TILE_SIZE * 0.98, TILE_SIZE * 0.98]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

export function MapLayer() {
  const mapSize = useGameStore((s) => s.mapSize)
  const mapTiles = useGameStore((s) => s.mapTiles)

  const tileColor = TILE_COLORS[mapTiles] ?? TILE_COLORS['stone']

  const tiles = useMemo(() => {
    const result: { x: number; y: number }[] = []
    for (let x = 0; x < mapSize[0]; x++) {
      for (let y = 0; y < mapSize[1]; y++) {
        result.push({ x, y })
      }
    }
    return result
  }, [mapSize])

  return (
    <group name="map-layer">
      {tiles.map(({ x, y }) => (
        <Tile key={`${x}-${y}`} x={x} y={y} color={tileColor} />
      ))}
      {/* Ambient light for the map */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/MapLayer.tsx
git commit -m "feat(web): add tile-based map layer component"
```

---

### Task 5: Token Layer

**Files:**
- Create: `apps/web/components/game/TokenLayer.tsx`

- [ ] **Step 1: Create token layer component**

`apps/web/components/game/TokenLayer.tsx`:
```tsx
'use client'

import { useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/lib/stores/game-store'
import type { Token } from '@dndmanager/game-runtime'

const TILE_SIZE = 1
const TOKEN_HEIGHT = 0.8
const TOKEN_RADIUS = 0.35

const TOKEN_COLORS: Record<string, string> = {
  player: '#3b82f6',   // blue
  monster: '#ef4444',   // red
  npc: '#a855f7',       // purple
}

interface TokenMeshProps {
  token: Token
  isSelected: boolean
  onClick: () => void
}

function TokenMesh({ token, isSelected, onClick }: TokenMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const color = TOKEN_COLORS[token.type] ?? '#9ca3af'

  if (!token.visible) return null

  return (
    <group
      position={[
        token.position.x * TILE_SIZE,
        TOKEN_HEIGHT / 2,
        token.position.y * TILE_SIZE,
      ]}
    >
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -TOKEN_HEIGHT / 2 + 0.01, 0]}>
          <ringGeometry args={[TOKEN_RADIUS + 0.05, TOKEN_RADIUS + 0.12, 32]} />
          <meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Token body (cylinder placeholder for 3D model) */}
      <mesh ref={meshRef} onClick={onClick}>
        <cylinderGeometry args={[TOKEN_RADIUS, TOKEN_RADIUS, TOKEN_HEIGHT, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* HP bar */}
      <group position={[0, TOKEN_HEIGHT / 2 + 0.15, 0]}>
        {/* Background */}
        <mesh>
          <planeGeometry args={[0.6, 0.08]} />
          <meshBasicMaterial color="#1f2937" />
        </mesh>
        {/* Fill */}
        <mesh position={[(token.hp.current / token.hp.max - 1) * 0.3, 0, 0.001]}>
          <planeGeometry args={[0.6 * (token.hp.current / token.hp.max), 0.06]} />
          <meshBasicMaterial
            color={token.hp.current / token.hp.max > 0.5 ? '#22c55e' : token.hp.current / token.hp.max > 0.25 ? '#eab308' : '#ef4444'}
          />
        </mesh>
      </group>
    </group>
  )
}

export function TokenLayer() {
  const tokens = useGameStore((s) => s.tokens)
  const selectedTokenId = useGameStore((s) => s.selectedTokenId)
  const selectToken = useGameStore((s) => s.selectToken)

  return (
    <group name="token-layer">
      {tokens.map((token) => (
        <TokenMesh
          key={token.id}
          token={token}
          isSelected={selectedTokenId === token.id}
          onClick={() => selectToken(token.id)}
        />
      ))}
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/TokenLayer.tsx
git commit -m "feat(web): add token layer with placeholder meshes and HP bars"
```

---

### Task 6: Grid Overlay (Hover & Movement Range)

**Files:**
- Create: `apps/web/components/game/GridOverlay.tsx`

- [ ] **Step 1: Create grid overlay component**

`apps/web/components/game/GridOverlay.tsx`:
```tsx
'use client'

import { useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/lib/stores/game-store'
import { positionsInRange, getToken } from '@dndmanager/game-runtime'
import type { GridPosition } from '@dndmanager/game-runtime'

const TILE_SIZE = 1

interface GridCellProps {
  x: number
  y: number
  type: 'hover' | 'movement' | 'attack'
  onPointerEnter: () => void
  onClick: () => void
}

function GridCell({ x, y, type, onPointerEnter, onClick }: GridCellProps) {
  const colors: Record<string, string> = {
    hover: '#ffffff',
    movement: '#22c55e',
    attack: '#ef4444',
  }

  return (
    <mesh
      position={[x * TILE_SIZE, 0.01, y * TILE_SIZE]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerEnter={onPointerEnter}
      onClick={onClick}
    >
      <planeGeometry args={[TILE_SIZE * 0.95, TILE_SIZE * 0.95]} />
      <meshBasicMaterial
        color={colors[type]}
        transparent
        opacity={type === 'hover' ? 0.2 : 0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export function GridOverlay() {
  const mapSize = useGameStore((s) => s.mapSize)
  const tokens = useGameStore((s) => s.tokens)
  const selectedTokenId = useGameStore((s) => s.selectedTokenId)
  const hoveredPosition = useGameStore((s) => s.hoveredPosition)
  const setHoveredPosition = useGameStore((s) => s.setHoveredPosition)
  const moveToken = useGameStore((s) => s.moveToken)

  const selectedToken = selectedTokenId ? getToken(tokens, selectedTokenId) : undefined

  const movementRange = useMemo(() => {
    if (!selectedToken) return new Set<string>()
    const positions = positionsInRange(selectedToken.position, selectedToken.speed)
    return new Set(positions.map((p) => `${p.x},${p.y}`))
  }, [selectedToken])

  const handleCellClick = useCallback((x: number, y: number) => {
    if (selectedTokenId && movementRange.has(`${x},${y}`)) {
      moveToken(selectedTokenId, { x, y })
    }
  }, [selectedTokenId, movementRange, moveToken])

  const cells = useMemo(() => {
    const result: { x: number; y: number }[] = []
    for (let x = 0; x < mapSize[0]; x++) {
      for (let y = 0; y < mapSize[1]; y++) {
        result.push({ x, y })
      }
    }
    return result
  }, [mapSize])

  return (
    <group name="grid-overlay">
      {cells.map(({ x, y }) => {
        const isHovered = hoveredPosition?.x === x && hoveredPosition?.y === y
        const isInRange = movementRange.has(`${x},${y}`)

        if (!isHovered && !isInRange) return null

        return (
          <GridCell
            key={`grid-${x}-${y}`}
            x={x}
            y={y}
            type={isHovered ? 'hover' : 'movement'}
            onPointerEnter={() => setHoveredPosition({ x, y })}
            onClick={() => handleCellClick(x, y)}
          />
        )
      })}

      {/* Invisible interaction plane for hover detection */}
      <mesh
        position={[(mapSize[0] - 1) / 2, 0, (mapSize[1] - 1) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={(e) => {
          const x = Math.round(e.point.x / TILE_SIZE)
          const y = Math.round(e.point.z / TILE_SIZE)
          if (x >= 0 && x < mapSize[0] && y >= 0 && y < mapSize[1]) {
            setHoveredPosition({ x, y })
          }
        }}
        onPointerLeave={() => setHoveredPosition(null)}
      >
        <planeGeometry args={[mapSize[0] * TILE_SIZE, mapSize[1] * TILE_SIZE]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/GridOverlay.tsx
git commit -m "feat(web): add grid overlay with hover highlight and movement range"
```

---

### Task 7: UI Overlay (Initiative & Action Bar)

**Files:**
- Create: `apps/web/components/game/UIOverlay.tsx`

- [ ] **Step 1: Create UI overlay component**

`apps/web/components/game/UIOverlay.tsx`:
```tsx
'use client'

import { useGameStore } from '@/lib/stores/game-store'

export function InitiativeBar() {
  const mode = useGameStore((s) => s.mode)
  const turnOrder = useGameStore((s) => s.turnOrder)
  const tokens = useGameStore((s) => s.tokens)
  const turn = useGameStore((s) => s.turn)
  const round = useGameStore((s) => s.round)

  if (mode !== 'encounter') return null

  return (
    <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center gap-2 bg-neutral-900/80 px-4 py-2 backdrop-blur-sm">
      <span className="mr-4 text-sm text-neutral-400">Runde {round}</span>
      {turnOrder.map((tokenId) => {
        const token = tokens.find((t) => t.id === tokenId)
        if (!token) return null
        const isActive = turn?.currentTokenId === tokenId

        return (
          <div
            key={tokenId}
            className={`rounded px-3 py-1 text-sm font-medium ${
              isActive
                ? 'bg-amber-500 text-neutral-900'
                : token.type === 'player'
                  ? 'bg-blue-900 text-blue-200'
                  : 'bg-red-900 text-red-200'
            }`}
          >
            {token.name}
          </div>
        )
      })}
    </div>
  )
}

export function ActionBar() {
  const mode = useGameStore((s) => s.mode)
  const turn = useGameStore((s) => s.turn)

  if (mode !== 'encounter' || !turn) return null

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-neutral-900/80 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <div className="flex gap-2">
          <button className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">
            Strike
          </button>
          <button className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600">
            Move
          </button>
          <button className="rounded bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600">
            Cast
          </button>
          <button className="rounded bg-yellow-700 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600">
            Skill
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full ${
                  i <= turn.actionsRemaining
                    ? 'bg-amber-400'
                    : 'bg-neutral-600'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-neutral-400">
            {turn.actionsRemaining}/3 Aktionen
          </span>
          <div
            className={`h-4 w-4 rounded-full ${
              turn.reactionAvailable ? 'bg-cyan-400' : 'bg-neutral-600'
            }`}
            title="Reaction"
          />
        </div>
      </div>
    </div>
  )
}

export function UIOverlay() {
  return (
    <>
      <InitiativeBar />
      <ActionBar />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/UIOverlay.tsx
git commit -m "feat(web): add UI overlay with initiative bar and action bar"
```

---

### Task 8: Game Canvas (Main Component)

**Files:**
- Create: `apps/web/components/game/GameCanvas.tsx`

- [ ] **Step 1: Create main game canvas**

`apps/web/components/game/GameCanvas.tsx`:
```tsx
'use client'

import { Canvas } from '@react-three/fiber'
import { IsometricCamera } from './IsometricCamera'
import { MapLayer } from './MapLayer'
import { TokenLayer } from './TokenLayer'
import { GridOverlay } from './GridOverlay'
import { UIOverlay } from './UIOverlay'
import { useGameStore } from '@/lib/stores/game-store'

export function GameCanvas() {
  const mapSize = useGameStore((s) => s.mapSize)

  // Center camera target on map
  const centerX = (mapSize[0] - 1) / 2
  const centerY = (mapSize[1] - 1) / 2

  return (
    <div className="relative h-full w-full">
      <Canvas>
        <IsometricCamera
          zoom={40}
          target={[centerX, 0, centerY]}
        />
        <MapLayer />
        <TokenLayer />
        <GridOverlay />
      </Canvas>
      <UIOverlay />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/GameCanvas.tsx
git commit -m "feat(web): add main GameCanvas component composing all layers"
```

---

### Task 9: Game Play Page with Mock Data

**Files:**
- Create: `apps/web/app/(game)/play/[sessionId]/page.tsx`

- [ ] **Step 1: Create play page with mock data**

`apps/web/app/(game)/play/[sessionId]/page.tsx`:
```tsx
'use client'

import { useEffect } from 'react'
import { GameCanvas } from '@/components/game/GameCanvas'
import { useGameStore } from '@/lib/stores/game-store'
import type { Token } from '@dndmanager/game-runtime'

// Mock data for development
const MOCK_TOKENS: Token[] = [
  {
    id: 'thorin',
    name: 'Thorin',
    type: 'player',
    ownerId: 'user-1',
    position: { x: 2, y: 3 },
    speed: 25,
    conditions: [],
    hp: { current: 45, max: 45, temp: 0 },
    ac: 18,
    visible: true,
  },
  {
    id: 'elara',
    name: 'Elara',
    type: 'player',
    ownerId: 'user-2',
    position: { x: 3, y: 4 },
    speed: 30,
    conditions: [],
    hp: { current: 32, max: 38, temp: 0 },
    ac: 15,
    visible: true,
  },
  {
    id: 'goblin-1',
    name: 'Goblin',
    type: 'monster',
    ownerId: 'gm',
    position: { x: 7, y: 3 },
    speed: 25,
    conditions: [],
    hp: { current: 15, max: 20, temp: 0 },
    ac: 16,
    visible: true,
  },
  {
    id: 'goblin-2',
    name: 'Goblin',
    type: 'monster',
    ownerId: 'gm',
    position: { x: 8, y: 5 },
    speed: 25,
    conditions: [],
    hp: { current: 20, max: 20, temp: 0 },
    ac: 16,
    visible: true,
  },
]

export default function PlayPage() {
  const setTokens = useGameStore((s) => s.setTokens)
  const setMap = useGameStore((s) => s.setMap)
  const setMode = useGameStore((s) => s.setMode)
  const setTurn = useGameStore((s) => s.setTurn)
  const setRound = useGameStore((s) => s.round)

  useEffect(() => {
    // Initialize with mock data
    setMap([12, 10], 'cave-stone')
    setTokens(MOCK_TOKENS)

    // Simulate encounter mode for testing UI
    setMode('encounter')
    useGameStore.getState().setInitiative(
      [
        { tokenId: 'thorin', roll: 15, modifier: 7, total: 22 },
        { tokenId: 'goblin-1', roll: 12, modifier: 3, total: 15 },
        { tokenId: 'elara', roll: 14, modifier: 5, total: 19 },
        { tokenId: 'goblin-2', roll: 8, modifier: 3, total: 11 },
      ],
      ['thorin', 'elara', 'goblin-1', 'goblin-2']
    )
    useGameStore.getState().setTurn({
      currentTokenId: 'thorin',
      actionsRemaining: 3,
      reactionAvailable: true,
      actionsUsed: [],
    })
    useGameStore.getState().setRound(1)
  }, [])

  return (
    <div className="h-screen w-screen bg-neutral-950">
      <GameCanvas />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/asanstefanski/Private/dndmanager && pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(game\)/
git commit -m "feat(web): add game play page with mock encounter data"
```

---

### Task 10: Full Verification

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: All packages pass

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit any remaining changes**

```bash
git status
# Only commit if there are changes
```
