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
 * camera frustum. Checked once per frame -- cheap because it uses spheres.
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
