'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/lib/stores/game-store'
import { CharacterModel } from './CharacterModel'
import { InstancedTokenGroup } from './performance/InstancedTokenGroup'
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

  // modelUrl may exist on the token data (added in Phase 3.1)
  // Using local type extension to avoid modifying game-runtime package
  const modelUrl = (token as Token & { modelUrl?: string }).modelUrl

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

      {/* Token body: 3D model if available, cylinder fallback otherwise */}
      <group ref={meshRef} onClick={onClick}>
        <CharacterModel url={modelUrl ?? ''} fallbackColor={color} />
      </group>

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

  // Group monster tokens without models by type for instancing
  const { instanceGroups, individualTokens } = useMemo(() => {
    const groups: Record<string, Token[]> = {}
    const individual: Token[] = []

    tokens.forEach((token) => {
      const modelUrl = (token as Token & { modelUrl?: string }).modelUrl
      if (token.type === 'monster' && !modelUrl) {
        const key = token.name
        ;(groups[key] ??= []).push(token)
      } else {
        individual.push(token)
      }
    })

    return { instanceGroups: groups, individualTokens: individual }
  }, [tokens])

  return (
    <group name="token-layer">
      {/* Instanced groups for duplicate monster tokens (single draw call per group) */}
      {Object.entries(instanceGroups).map(([name, groupTokens]) => (
        <InstancedTokenGroup
          key={`instanced-${name}`}
          tokens={groupTokens}
          color={TOKEN_COLORS['monster'] ?? '#9ca3af'}
        />
      ))}

      {/* Individual tokens (players, NPCs, tokens with custom models) */}
      {individualTokens.map((token) => (
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
