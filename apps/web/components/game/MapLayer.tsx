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
