'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGameStore } from '@/lib/stores/game-store'
import type { Token } from '@dndmanager/game-runtime'

const GameCanvas = dynamic(
  () => import('@/components/game/GameCanvas').then((mod) => ({ default: mod.GameCanvas })),
  { ssr: false }
)

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
