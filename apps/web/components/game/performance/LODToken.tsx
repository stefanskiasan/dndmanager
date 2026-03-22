'use client'

import { useRef, useState, useCallback } from 'react'
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

/**
 * Switches between three levels of detail based on camera zoom level.
 * At high zoom, renders the full 3D model. At medium zoom, a simple
 * cylinder. At low zoom (zoomed way out), a flat disc.
 */
export function LODToken({ modelUrl, fallbackColor, scale }: LODTokenProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const [lodLevel, setLodLevel] = useState<LODLevel>('high')

  useFrame(() => {
    if (!groupRef.current) return
    const cam = camera as THREE.OrthographicCamera
    const zoom = cam.zoom ?? 50

    let newLOD: LODLevel
    if (zoom >= 30) newLOD = 'high'
    else if (zoom >= 15) newLOD = 'medium'
    else newLOD = 'low'

    if (newLOD !== lodLevel) {
      setLodLevel(newLOD)
    }
  })

  return (
    <group ref={groupRef}>
      {lodLevel === 'high' && (
        <CharacterModel url={modelUrl} fallbackColor={fallbackColor} scale={scale} />
      )}
      {lodLevel === 'medium' && (
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.8, 8]} />
          <meshStandardMaterial color={fallbackColor} />
        </mesh>
      )}
      {lodLevel === 'low' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.35, 6]} />
          <meshBasicMaterial color={fallbackColor} />
        </mesh>
      )}
    </group>
  )
}
