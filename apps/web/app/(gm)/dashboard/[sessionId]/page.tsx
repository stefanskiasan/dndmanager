'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useGameStore } from '@/lib/stores/game-store'
import { EncounterPanel } from '@/components/gm/EncounterPanel'
import { MonsterSpawner } from '@/components/gm/MonsterSpawner'
import { TurnControls } from '@/components/gm/TurnControls'
import type { Token } from '@dndmanager/game-runtime'

const GameCanvas = dynamic(
  () => import('@/components/game/GameCanvas').then((m) => ({ default: m.GameCanvas })),
  { ssr: false }
)

const MOCK_PLAYER_TOKENS: Token[] = [
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
    position: { x: 3, y: 5 },
    speed: 30,
    conditions: [],
    hp: { current: 32, max: 38, temp: 0 },
    ac: 15,
    visible: true,
  },
]

export default function GMDashboardPage() {
  const setTokens = useGameStore((s) => s.setTokens)
  const setMap = useGameStore((s) => s.setMap)

  useEffect(() => {
    setMap([15, 12], 'cave-stone')
    setTokens(MOCK_PLAYER_TOKENS)
  }, [])

  return (
    <div className="flex h-screen bg-neutral-950">
      {/* Sidebar */}
      <div className="w-80 space-y-4 overflow-y-auto border-r border-neutral-800 p-4">
        <h1 className="text-xl font-bold">GM Dashboard</h1>
        <EncounterPanel />
        <MonsterSpawner />
        <TurnControls />

        {/* Token list */}
        <div className="rounded border border-neutral-800 p-3">
          <h3 className="mb-2 text-sm font-medium text-neutral-400">Tokens auf der Karte</h3>
          <TokenList />
        </div>
      </div>

      {/* Game view */}
      <div className="flex-1">
        <GameCanvas />
      </div>
    </div>
  )
}

function TokenList() {
  const tokens = useGameStore((s) => s.tokens)

  return (
    <div className="space-y-1">
      {tokens.map((token) => (
        <div key={token.id} className="flex items-center justify-between rounded bg-neutral-800 px-2 py-1 text-sm">
          <span className={token.type === 'player' ? 'text-blue-400' : 'text-red-400'}>
            {token.name}
          </span>
          <span className="text-neutral-500">
            HP {token.hp.current}/{token.hp.max}
          </span>
        </div>
      ))}
      {tokens.length === 0 && (
        <p className="text-xs text-neutral-500">Keine Tokens</p>
      )}
    </div>
  )
}
