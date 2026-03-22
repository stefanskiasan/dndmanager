# Phase 1.6: Web App Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect all pieces together — GM dashboard for managing sessions and encounters, session flow (campaign → session → game), character creation page, and the game page wired to actual game-runtime state. This completes the MVP: a playable session from start to finish.

**Architecture:** New pages and components in the Next.js app. GM dashboard manages sessions and controls encounters. The game page initializes game-runtime state and processes player actions. Character creation is a simple form storing to the characters table. No Supabase Realtime yet (that's Phase 2) — state is local per client for now.

**Tech Stack:** Next.js 15 App Router, shadcn/ui, Zustand, @dndmanager/game-runtime, @dndmanager/pf2e-engine

**Spec:** `docs/superpowers/specs/2026-03-21-dndmanager-platform-design.md` (Sections 11, 17)

---

## File Structure

```
apps/web/
├── app/
│   ├── (lobby)/
│   │   └── campaigns/
│   │       └── [campaignId]/
│   │           ├── page.tsx              → Campaign detail (sessions list)
│   │           ├── characters/
│   │           │   └── new/page.tsx      → Character creation
│   │           └── sessions/
│   │               └── [sessionId]/
│   │                   └── page.tsx      → Redirects to play
│   ├── (game)/
│   │   └── play/
│   │       └── [sessionId]/
│   │           └── page.tsx              → Already exists, will be enhanced
│   └── (gm)/
│       └── dashboard/
│           └── [sessionId]/
│               └── page.tsx              → GM dashboard
├── components/
│   ├── game/
│   │   └── GameController.tsx            → Game logic controller
│   ├── gm/
│   │   ├── EncounterPanel.tsx            → Start/end encounters
│   │   ├── MonsterSpawner.tsx            → Add monsters to map
│   │   └── TurnControls.tsx             → Advance turns
│   └── character/
│       └── CharacterForm.tsx             → Character creation form
├── lib/
│   └── stores/
│       └── game-store.ts                → Already exists
```

---

### Task 1: Campaign Detail Page

**Files:**
- Create: `apps/web/app/(lobby)/campaigns/[campaignId]/page.tsx`

- [ ] **Step 1: Add shadcn badge component**

Run: `cd /Users/asanstefanski/Private/dndmanager/apps/web && npx shadcn@latest add badge separator --yes`

- [ ] **Step 2: Create campaign detail page**

`apps/web/app/(lobby)/campaigns/[campaignId]/page.tsx`:
```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (!campaign) redirect('/campaigns')

  const isGM = campaign.gm_id === user.id

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('campaign_id', campaignId)

  const myCharacter = characters?.find((c) => c.owner_id === user.id)

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <p className="mt-1 text-neutral-400">{campaign.description || 'Keine Beschreibung'}</p>
        </div>
        {isGM && (
          <Badge variant="outline" className="text-amber-400 border-amber-400">
            Gamemaster
          </Badge>
        )}
      </div>

      {isGM && (
        <div className="mt-4 rounded bg-neutral-800 p-3">
          <span className="text-sm text-neutral-400">Einladungscode: </span>
          <code className="rounded bg-neutral-700 px-2 py-1 text-amber-400">{campaign.invite_code}</code>
        </div>
      )}

      <Separator className="my-8" />

      {/* Character Section */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Charaktere</h2>
          {!isGM && !myCharacter && (
            <Link href={`/campaigns/${campaignId}/characters/new`}>
              <Button size="sm">Charakter erstellen</Button>
            </Link>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {characters && characters.length > 0 ? (
            characters.map((char) => (
              <Card key={char.id} className={char.owner_id === user.id ? 'border-blue-500' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{char.name}</CardTitle>
                  <CardDescription>Level {char.level}</CardDescription>
                </CardHeader>
              </Card>
            ))
          ) : (
            <p className="text-neutral-500">Noch keine Charaktere erstellt.</p>
          )}
        </div>
      </section>

      <Separator className="my-8" />

      {/* Sessions Section */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Sessions</h2>
          {isGM && (
            <form action={async () => {
              'use server'
              const supabase = await createClient()
              const { data } = await supabase
                .from('sessions')
                .insert({
                  campaign_id: campaignId,
                  name: `Session ${(sessions?.length ?? 0) + 1}`,
                  status: 'planned',
                })
                .select()
                .single()
              if (data) {
                redirect(`/campaigns/${campaignId}`)
              }
            }}>
              <Button type="submit" size="sm">Neue Session</Button>
            </form>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {sessions && sessions.length > 0 ? (
            sessions.map((session) => (
              <Card key={session.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg">{session.name}</CardTitle>
                    <CardDescription>
                      Status: <Badge variant={
                        session.status === 'active' ? 'default' :
                        session.status === 'completed' ? 'secondary' : 'outline'
                      }>{session.status}</Badge>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {isGM && session.status !== 'completed' && (
                      <Link href={`/gm/dashboard/${session.id}`}>
                        <Button variant="outline" size="sm">GM Dashboard</Button>
                      </Link>
                    )}
                    {session.status === 'active' && (
                      <Link href={`/play/${session.id}`}>
                        <Button size="sm">Beitreten</Button>
                      </Link>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            <p className="text-neutral-500">Noch keine Sessions geplant.</p>
          )}
        </div>
      </section>

      <div className="mt-8">
        <Link href="/campaigns">
          <Button variant="ghost">&larr; Zurueck zu Kampagnen</Button>
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Update campaigns list to link to detail page**

In `apps/web/app/(lobby)/campaigns/page.tsx`, wrap each campaign Card with a Link to `/campaigns/${campaign.id}`. Add `import Link from 'next/link'` if missing, and wrap each `<Card>` in the GM campaigns section with `<Link href={/campaigns/${campaign.id}}>`.

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/web/
git commit -m "feat(web): add campaign detail page with sessions and characters"
```

---

### Task 2: Character Creation Form

**Files:**
- Create: `apps/web/components/character/CharacterForm.tsx`
- Create: `apps/web/app/(lobby)/campaigns/[campaignId]/characters/new/page.tsx`

- [ ] **Step 1: Create character form component**

`apps/web/components/character/CharacterForm.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CharacterFormProps {
  campaignId: string
}

export function CharacterForm({ campaignId }: CharacterFormProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Nicht angemeldet')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('characters')
      .insert({
        name,
        owner_id: user.id,
        campaign_id: campaignId,
        level: 1,
        xp: 0,
        data: {},
      })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/campaigns/${campaignId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Charaktername</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Thorin Eisenschild"
          required
        />
      </div>

      <p className="text-sm text-neutral-400">
        Weitere Charakter-Optionen (Ancestry, Class, Abilities) werden in Phase 2 hinzugefuegt.
        Aktuell wird nur der Name gespeichert.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Erstellen...' : 'Charakter erstellen'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Create character creation page**

`apps/web/app/(lobby)/campaigns/[campaignId]/characters/new/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CharacterForm } from '@/components/character/CharacterForm'

export default async function NewCharacterPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('name')
    .eq('id', campaignId)
    .single()

  if (!campaign) redirect('/campaigns')

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Neuer Charakter</CardTitle>
          <CardDescription>Fuer Kampagne: {campaign.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <CharacterForm campaignId={campaignId} />
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/character/ apps/web/app/\(lobby\)/campaigns/\[campaignId\]/characters/
git commit -m "feat(web): add character creation form and page"
```

---

### Task 3: GM Dashboard

**Files:**
- Create: `apps/web/components/gm/EncounterPanel.tsx`
- Create: `apps/web/components/gm/MonsterSpawner.tsx`
- Create: `apps/web/components/gm/TurnControls.tsx`
- Create: `apps/web/app/(gm)/dashboard/[sessionId]/page.tsx`

- [ ] **Step 1: Create encounter panel**

`apps/web/components/gm/EncounterPanel.tsx`:
```tsx
'use client'

import { useGameStore } from '@/lib/stores/game-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function EncounterPanel() {
  const mode = useGameStore((s) => s.mode)
  const tokens = useGameStore((s) => s.tokens)
  const setMode = useGameStore((s) => s.setMode)

  function handleStartEncounter() {
    setMode('encounter')
    // Auto-roll initiative for all tokens
    const initiatives = tokens.map((t) => ({
      tokenId: t.id,
      roll: Math.floor(Math.random() * 20) + 1,
      modifier: 0,
      total: Math.floor(Math.random() * 20) + 1,
    }))
    const sorted = [...initiatives].sort((a, b) => b.total - a.total)
    useGameStore.getState().setInitiative(sorted, sorted.map((e) => e.tokenId))
    useGameStore.getState().setRound(1)
    if (sorted.length > 0) {
      useGameStore.getState().setTurn({
        currentTokenId: sorted[0].tokenId,
        actionsRemaining: 3,
        reactionAvailable: true,
        actionsUsed: [],
      })
    }
  }

  function handleEndEncounter() {
    setMode('exploration')
    useGameStore.getState().setTurn(null)
    useGameStore.getState().setRound(0)
    useGameStore.getState().setInitiative([], [])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Encounter</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-neutral-400">
          Modus: <span className="font-medium text-neutral-200">{mode}</span>
        </p>
        {mode === 'exploration' ? (
          <Button onClick={handleStartEncounter} className="w-full" disabled={tokens.length === 0}>
            Encounter starten
          </Button>
        ) : (
          <Button onClick={handleEndEncounter} variant="destructive" className="w-full">
            Encounter beenden
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create monster spawner**

`apps/web/components/gm/MonsterSpawner.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useGameStore } from '@/lib/stores/game-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
```

- [ ] **Step 3: Create turn controls**

`apps/web/components/gm/TurnControls.tsx`:
```tsx
'use client'

import { useGameStore } from '@/lib/stores/game-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function TurnControls() {
  const mode = useGameStore((s) => s.mode)
  const turn = useGameStore((s) => s.turn)
  const tokens = useGameStore((s) => s.tokens)
  const turnOrder = useGameStore((s) => s.turnOrder)
  const round = useGameStore((s) => s.round)

  if (mode !== 'encounter' || !turn) return null

  const currentToken = tokens.find((t) => t.id === turn.currentTokenId)

  function handleNextTurn() {
    const store = useGameStore.getState()
    const currentIdx = turnOrder.indexOf(turn!.currentTokenId)
    let nextIdx = currentIdx + 1
    let newRound = round

    if (nextIdx >= turnOrder.length) {
      nextIdx = 0
      newRound += 1
      store.setRound(newRound)
    }

    const nextTokenId = turnOrder[nextIdx]
    store.setTurn({
      currentTokenId: nextTokenId,
      actionsRemaining: 3,
      reactionAvailable: true,
      actionsUsed: [],
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Turn-Steuerung</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <p className="text-neutral-400">Runde: <span className="text-neutral-200">{round}</span></p>
          <p className="text-neutral-400">
            Am Zug: <span className="font-medium text-amber-400">{currentToken?.name ?? 'Unbekannt'}</span>
          </p>
          <p className="text-neutral-400">
            Aktionen: <span className="text-neutral-200">{turn.actionsRemaining}/3</span>
          </p>
        </div>
        <Button onClick={handleNextTurn} className="w-full">
          Naechster Turn
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create GM dashboard page**

`apps/web/app/(gm)/dashboard/[sessionId]/page.tsx`:
```tsx
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
```

- [ ] **Step 5: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/gm/ apps/web/app/\(gm\)/
git commit -m "feat(web): add GM dashboard with encounter, monster spawner, and turn controls"
```

---

### Task 4: Navigation & Layout Polish

**Files:**
- Create: `apps/web/components/ui/nav.tsx`
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Create navigation component**

`apps/web/components/ui/nav.tsx`:
```tsx
import Link from 'next/link'

export function Nav() {
  return (
    <nav className="border-b border-neutral-800 bg-neutral-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/campaigns" className="text-lg font-bold tracking-tight text-amber-400 hover:text-amber-300">
          DnD Manager
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/campaigns" className="text-sm text-neutral-400 hover:text-neutral-200">
            Kampagnen
          </Link>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Add nav to lobby layout**

Create `apps/web/app/(lobby)/layout.tsx`:
```tsx
import { Nav } from '@/components/ui/nav'

export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  )
}
```

- [ ] **Step 3: Update landing page to redirect**

Modify `apps/web/app/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/campaigns')
  }

  redirect('/login')
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/ui/nav.tsx apps/web/app/\(lobby\)/layout.tsx apps/web/app/page.tsx
git commit -m "feat(web): add navigation bar and lobby layout"
```

---

### Task 5: Link Campaign Cards

**Files:**
- Modify: `apps/web/app/(lobby)/campaigns/page.tsx`

- [ ] **Step 1: Wrap campaign cards with links**

In `apps/web/app/(lobby)/campaigns/page.tsx`, make each campaign card clickable by wrapping it with `<Link href={/campaigns/${campaign.id}}>`. Both GM campaigns and player campaigns should be wrapped.

The key changes:
- GM campaigns: wrap `<Card>` with `<Link href={/campaigns/${campaign.id}}>`
- Player campaigns: wrap `<Card>` with `<Link href={/campaigns/${campaign.id}}>` (use `(campaign as any).id`)
- Add `cursor-pointer hover:border-neutral-600 transition-colors` to Card className

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(lobby\)/campaigns/page.tsx
git commit -m "feat(web): make campaign cards clickable with navigation links"
```

---

### Task 6: Final Build & Test Verification

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: All packages pass

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Verify git status is clean**

Run: `git status`
Expected: Nothing to commit

- [ ] **Step 4: Commit any remaining changes**

Only if needed:
```bash
git add -A && git diff --cached --quiet || git commit -m "chore: final Phase 1.6 cleanup"
```
