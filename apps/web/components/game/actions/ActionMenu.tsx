'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/stores/game-store'
import { StrikeMenu } from './StrikeMenu'
import { SpellMenu } from './SpellMenu'
import { SkillMenu } from './SkillMenu'
import { MoveMenu } from './MoveMenu'

type MenuView = 'main' | 'strike' | 'spell' | 'skill' | 'move'

export function ActionMenu() {
  const [view, setView] = useState<MenuView>('main')
  const mode = useGameStore((s) => s.mode)
  const turn = useGameStore((s) => s.turn)

  if (mode !== 'encounter' || !turn) return null

  if (view === 'strike') {
    return (
      <StrikeMenu
        onStrike={(weapon, attackNumber) => {
          // TODO: resolve attack via game runtime
          console.log('Strike:', weapon.name, 'Attack #', attackNumber)
          setView('main')
        }}
        onBack={() => setView('main')}
      />
    )
  }

  if (view === 'spell') {
    return (
      <SpellMenu
        onCast={(spell) => {
          console.log('Cast:', spell.name)
          setView('main')
        }}
        onBack={() => setView('main')}
      />
    )
  }

  if (view === 'skill') {
    return (
      <SkillMenu
        onUseSkill={(actionId) => {
          console.log('Skill:', actionId)
          setView('main')
        }}
        onBack={() => setView('main')}
      />
    )
  }

  if (view === 'move') {
    return (
      <MoveMenu
        onStride={() => {
          console.log('Stride')
          setView('main')
        }}
        onStep={() => {
          console.log('Step')
          setView('main')
        }}
        onBack={() => setView('main')}
      />
    )
  }

  // Main menu
  return (
    <div className="flex gap-2">
      <button
        onClick={() => setView('strike')}
        disabled={turn.actionsRemaining <= 0}
        className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
      >
        Strike
      </button>
      <button
        onClick={() => setView('move')}
        disabled={turn.actionsRemaining <= 0}
        className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
      >
        Move
      </button>
      <button
        onClick={() => setView('spell')}
        disabled={turn.actionsRemaining <= 0}
        className="rounded bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-600 disabled:opacity-50"
      >
        Cast
      </button>
      <button
        onClick={() => setView('skill')}
        disabled={turn.actionsRemaining <= 0}
        className="rounded bg-yellow-700 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50"
      >
        Skill
      </button>
    </div>
  )
}
