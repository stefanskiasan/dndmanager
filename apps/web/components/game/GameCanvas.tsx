'use client'

import { Canvas } from '@react-three/fiber'
import { IsometricCamera } from './IsometricCamera'
import { MapLayer } from './MapLayer'
import { TokenLayer } from './TokenLayer'
import { GridOverlay } from './GridOverlay'
import { UIOverlay } from './UIOverlay'
import { PerformanceMonitor, PerfOverlay } from './performance/PerformanceMonitor'
import { LoadingScreen } from './LoadingScreen'
import { useGameStore } from '@/lib/stores/game-store'
import { useLoadingStore } from '@/lib/stores/loading-store'

export function GameCanvas() {
  const mapSize = useGameStore((s) => s.mapSize)
  const loadingProgress = useLoadingStore((s) => s.progress)
  const loadingStage = useLoadingStore((s) => s.stage)
  const loadingComplete = useLoadingStore((s) => s.isComplete)

  // Center camera target on map
  const centerX = (mapSize[0] - 1) / 2
  const centerY = (mapSize[1] - 1) / 2

  return (
    <div className="relative h-full w-full">
      <LoadingScreen progress={loadingProgress} stage={loadingStage} isComplete={loadingComplete} />
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
