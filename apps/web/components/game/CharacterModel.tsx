'use client'

import { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

interface CharacterModelProps {
  url: string
  scale?: number
  rotation?: [number, number, number]
}

function LoadedModel({ url, scale = 1, rotation = [0, 0, 0] }: CharacterModelProps) {
  const { scene } = useGLTF(url)
  const ref = useRef<THREE.Group>(null)

  // Clone the scene so multiple tokens can use the same model
  const clonedScene = scene.clone(true)

  // Normalize model size: compute bounding box and scale to fit TOKEN_HEIGHT
  const box = new THREE.Box3().setFromObject(clonedScene)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  const normalizedScale = maxDim > 0 ? (0.8 / maxDim) * scale : scale

  // Center the model
  const center = new THREE.Vector3()
  box.getCenter(center)

  return (
    <group scale={normalizedScale} rotation={rotation}>
      <primitive
        ref={ref}
        object={clonedScene}
        position={[-center.x, -box.min.y, -center.z]}
      />
    </group>
  )
}

/**
 * Fallback cylinder shown while the GLB is loading.
 */
function CylinderFallback({ color }: { color: string }) {
  return (
    <mesh>
      <cylinderGeometry args={[0.35, 0.35, 0.8, 16]} />
      <meshStandardMaterial color={color} opacity={0.5} transparent />
    </mesh>
  )
}

/**
 * Renders a 3D character model from a GLB URL, with a cylinder fallback
 * while loading or if no URL is provided.
 */
export function CharacterModel({
  url,
  fallbackColor = '#9ca3af',
  scale,
  rotation,
}: CharacterModelProps & { fallbackColor?: string }) {
  if (!url) {
    return <CylinderFallback color={fallbackColor} />
  }

  return (
    <Suspense fallback={<CylinderFallback color={fallbackColor} />}>
      <LoadedModel url={url} scale={scale} rotation={rotation} />
    </Suspense>
  )
}
