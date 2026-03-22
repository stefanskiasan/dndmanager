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
