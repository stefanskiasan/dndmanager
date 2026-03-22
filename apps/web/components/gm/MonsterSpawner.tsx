'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/stores/game-store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Token } from '@dndmanager/game-runtime'

const PRESET_MONSTERS: { name: string; ac: number; hp: number; speed: number }[] = [
  { name: 'Goblin Warrior', ac: 16, hp: 6, speed: 25 },
  { name: 'Skeleton Guard', ac: 16, hp: 12, speed: 25 },
  { name: 'Giant Rat', ac: 15, hp: 8, speed: 30 },
  { name: 'Kobold Scout', ac: 15, hp: 8, speed: 25 },
]

export function MonsterSpawner() {
  const tokens = useGameStore((s) => s.tokens)
  const setTokens = useGameStore((s) => s.setTokens)
  const mapSize = useGameStore((s) => s.mapSize)
  const [selectedPreset, setSelectedPreset] = useState(0)

  function spawnMonster() {
    const preset = PRESET_MONSTERS[selectedPreset]
    const id = `monster-${Date.now()}`

    // Find empty position
    const occupied = new Set(tokens.map((t) => `${t.position.x},${t.position.y}`))
    let x = Math.floor(mapSize[0] / 2)
    let y = Math.floor(mapSize[1] / 2)
    for (let dx = 0; dx < mapSize[0]; dx++) {
      for (let dy = 0; dy < mapSize[1]; dy++) {
        const px = (x + dx) % mapSize[0]
        const py = (y + dy) % mapSize[1]
        if (!occupied.has(`${px},${py}`)) {
          x = px
          y = py
          dx = mapSize[0] // break
          break
        }
      }
    }

    const newToken: Token = {
      id,
      name: preset.name,
      type: 'monster',
      ownerId: 'gm',
      position: { x, y },
      speed: preset.speed,
      conditions: [],
      hp: { current: preset.hp, max: preset.hp, temp: 0 },
      ac: preset.ac,
      visible: true,
    }

    setTokens([...tokens, newToken])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Monster spawnen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Monster-Typ</Label>
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(Number(e.target.value))}
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm"
          >
            {PRESET_MONSTERS.map((m, i) => (
              <option key={i} value={i}>{m.name} (AC {m.ac}, HP {m.hp})</option>
            ))}
          </select>
        </div>
        <Button onClick={spawnMonster} className="w-full" variant="outline">
          Spawnen
        </Button>
      </CardContent>
    </Card>
  )
}
