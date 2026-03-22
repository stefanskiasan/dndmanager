'use client'

import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
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
