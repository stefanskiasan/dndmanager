'use client'

import { Canvas } from '@react-three/fiber'
import { IsometricCamera } from './IsometricCamera'
import { MapLayer } from './MapLayer'
import { TokenLayer } from './TokenLayer'
import { GridOverlay } from './GridOverlay'
import { UIOverlay } from './UIOverlay'
import { PerformanceMonitor, PerfOverlay } from './performance/PerformanceMonitor'
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
        <PerformanceMonitor />
      </Canvas>
      <UIOverlay />
      {process.env.NODE_ENV === 'development' && <PerfOverlay />}
    </div>
  )
}
