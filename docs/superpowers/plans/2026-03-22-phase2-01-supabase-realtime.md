# Phase 2.1: Supabase Realtime Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the game state to Supabase so all players see token movements, turn changes, and encounter events in real time. Add game state tables to the database schema and create a sync layer between the Zustand store and Supabase Realtime subscriptions.

**Architecture:** New database tables (`game_state`, `game_tokens`, `game_initiative`, `game_action_log`) with Realtime enabled. A `SyncProvider` React component subscribes to changes and updates the Zustand store. Player actions write to the DB, Realtime pushes updates to all clients. Server-side dice rolls use Supabase Edge Functions.

**Tech Stack:** Supabase Realtime, Supabase Edge Functions (Deno), Zustand, Next.js

**Spec:** `docs/superpowers/specs/2026-03-21-dndmanager-platform-design.md` (Section 7: Synchronisation, Section 14: Anti-Cheat)

---

## File Structure

```
supabase/
├── migrations/
│   └── 00002_game_state_tables.sql    → Game state tables + RLS
├── functions/
│   └── roll-dice/
│       └── index.ts                   → Server-side dice rolling

apps/web/
├── lib/
│   ├── sync/
│   │   ├── game-sync.ts              → Supabase ↔ Zustand sync logic
│   │   ├── game-actions.ts           → DB write functions for player actions
│   │   └── types.ts                  → DB row types for game tables
│   └── stores/
│       └── game-store.ts             → Enhanced with sync actions
├── components/
│   └── providers/
│       └── GameSyncProvider.tsx       → Realtime subscription provider
```

---

### Task 1: Game State Database Tables

**Files:**
- Create: `supabase/migrations/00002_game_state_tables.sql`

- [ ] **Step 1: Create migration**

`supabase/migrations/00002_game_state_tables.sql`:
```sql
-- ============================================================
-- Game State Tables (Realtime-enabled)
-- ============================================================

-- Game State: tracks current mode, round, active session
create table public.game_state (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  mode text not null default 'exploration' check (mode in ('exploration', 'encounter', 'downtime')),
  round integer not null default 0,
  current_turn_index integer not null default -1,
  current_token_id text,
  actions_remaining integer not null default 3,
  reaction_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id)
);

alter table public.game_state enable row level security;
alter publication supabase_realtime add table public.game_state;

create policy "Campaign members can view game state"
  on public.game_state for select
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      left join public.campaign_members cm on cm.campaign_id = c.id
      where s.id = game_state.session_id
      and (c.gm_id = auth.uid() or cm.user_id = auth.uid())
    )
  );

create policy "GMs can manage game state"
  on public.game_state for all
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = game_state.session_id
      and c.gm_id = auth.uid()
    )
  );

-- Game Tokens: all tokens on the map
create table public.game_tokens (
  id text not null,
  game_state_id uuid not null references public.game_state(id) on delete cascade,
  name text not null,
  token_type text not null check (token_type in ('player', 'monster', 'npc')),
  owner_id uuid references public.profiles(id),
  position_x integer not null default 0,
  position_y integer not null default 0,
  speed integer not null default 25,
  hp_current integer not null,
  hp_max integer not null,
  hp_temp integer not null default 0,
  ac integer not null,
  conditions jsonb not null default '[]'::jsonb,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, game_state_id)
);

alter table public.game_tokens enable row level security;
alter publication supabase_realtime add table public.game_tokens;

create policy "Campaign members can view visible tokens"
  on public.game_tokens for select
  using (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      join public.campaigns c on c.id = s.campaign_id
      left join public.campaign_members cm on cm.campaign_id = c.id
      where gs.id = game_tokens.game_state_id
      and (c.gm_id = auth.uid() or cm.user_id = auth.uid())
    )
    and (
      visible = true
      or exists (
        select 1 from public.game_state gs
        join public.sessions s on s.id = gs.session_id
        join public.campaigns c on c.id = s.campaign_id
        where gs.id = game_tokens.game_state_id
        and c.gm_id = auth.uid()
      )
    )
  );

create policy "GMs can manage tokens"
  on public.game_tokens for all
  using (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      join public.campaigns c on c.id = s.campaign_id
      where gs.id = game_tokens.game_state_id
      and c.gm_id = auth.uid()
    )
  );

create policy "Players can update their own tokens"
  on public.game_tokens for update
  using (owner_id = auth.uid());

-- Game Initiative: turn order during encounters
create table public.game_initiative (
  id uuid primary key default uuid_generate_v4(),
  game_state_id uuid not null references public.game_state(id) on delete cascade,
  token_id text not null,
  roll integer not null,
  modifier integer not null default 0,
  total integer not null,
  sort_order integer not null default 0
);

alter table public.game_initiative enable row level security;
alter publication supabase_realtime add table public.game_initiative;

create policy "Campaign members can view initiative"
  on public.game_initiative for select
  using (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      join public.campaigns c on c.id = s.campaign_id
      left join public.campaign_members cm on cm.campaign_id = c.id
      where gs.id = game_initiative.game_state_id
      and (c.gm_id = auth.uid() or cm.user_id = auth.uid())
    )
  );

create policy "GMs can manage initiative"
  on public.game_initiative for all
  using (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      join public.campaigns c on c.id = s.campaign_id
      where gs.id = game_initiative.game_state_id
      and c.gm_id = auth.uid()
    )
  );

-- Game Action Log: records all actions for replay
create table public.game_action_log (
  id uuid primary key default uuid_generate_v4(),
  game_state_id uuid not null references public.game_state(id) on delete cascade,
  event_type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.game_action_log enable row level security;
alter publication supabase_realtime add table public.game_action_log;

create policy "Campaign members can view action log"
  on public.game_action_log for select
  using (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      join public.campaigns c on c.id = s.campaign_id
      left join public.campaign_members cm on cm.campaign_id = c.id
      where gs.id = game_action_log.game_state_id
      and (c.gm_id = auth.uid() or cm.user_id = auth.uid())
    )
  );

create policy "GMs can write action log"
  on public.game_action_log for insert
  with check (
    exists (
      select 1 from public.game_state gs
      join public.sessions s on s.id = gs.session_id
      join public.campaigns c on c.id = s.campaign_id
      where gs.id = game_action_log.game_state_id
      and c.gm_id = auth.uid()
    )
  );

-- Updated-at triggers
create trigger set_game_state_updated_at
  before update on public.game_state
  for each row execute function public.set_updated_at();

create trigger set_game_tokens_updated_at
  before update on public.game_tokens
  for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/00002_game_state_tables.sql
git commit -m "feat(db): add game state tables with Realtime and RLS"
```

---

### Task 2: Sync Type Definitions

**Files:**
- Create: `apps/web/lib/sync/types.ts`

- [ ] **Step 1: Create sync types**

`apps/web/lib/sync/types.ts`:
```typescript
export interface GameStateRow {
  id: string
  session_id: string
  mode: 'exploration' | 'encounter' | 'downtime'
  round: number
  current_turn_index: number
  current_token_id: string | null
  actions_remaining: number
  reaction_available: boolean
  created_at: string
  updated_at: string
}

export interface GameTokenRow {
  id: string
  game_state_id: string
  name: string
  token_type: 'player' | 'monster' | 'npc'
  owner_id: string | null
  position_x: number
  position_y: number
  speed: number
  hp_current: number
  hp_max: number
  hp_temp: number
  ac: number
  conditions: unknown[]
  visible: boolean
  created_at: string
  updated_at: string
}

export interface GameInitiativeRow {
  id: string
  game_state_id: string
  token_id: string
  roll: number
  modifier: number
  total: number
  sort_order: number
}

export interface GameActionLogRow {
  id: string
  game_state_id: string
  event_type: string
  data: Record<string, unknown>
  created_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/sync/
git commit -m "feat(web): add sync type definitions for game state tables"
```

---

### Task 3: Game Actions (DB Write Functions)

**Files:**
- Create: `apps/web/lib/sync/game-actions.ts`

- [ ] **Step 1: Create game action functions**

`apps/web/lib/sync/game-actions.ts`:
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.js'
import type { GameStateRow, GameTokenRow } from './types.js'
import type { Token, GameMode } from '@dndmanager/game-runtime'

type Client = SupabaseClient<Database>

/**
 * Initialize game state for a session.
 */
export async function initializeGameState(
  supabase: Client,
  sessionId: string,
  mapSize: [number, number],
): Promise<string> {
  const { data, error } = await supabase
    .from('game_state')
    .insert({ session_id: sessionId })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to init game state: ${error.message}`)
  return data.id
}

/**
 * Load existing game state for a session.
 */
export async function loadGameState(
  supabase: Client,
  sessionId: string
): Promise<{ state: GameStateRow; tokens: GameTokenRow[] } | null> {
  const { data: state } = await supabase
    .from('game_state')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (!state) return null

  const { data: tokens } = await supabase
    .from('game_tokens')
    .select('*')
    .eq('game_state_id', state.id)

  return { state, tokens: tokens ?? [] }
}

/**
 * Spawn a token on the map.
 */
export async function spawnToken(
  supabase: Client,
  gameStateId: string,
  token: Token
): Promise<void> {
  const { error } = await supabase
    .from('game_tokens')
    .insert({
      id: token.id,
      game_state_id: gameStateId,
      name: token.name,
      token_type: token.type,
      owner_id: token.ownerId === 'gm' ? null : token.ownerId,
      position_x: token.position.x,
      position_y: token.position.y,
      speed: token.speed,
      hp_current: token.hp.current,
      hp_max: token.hp.max,
      hp_temp: token.hp.temp,
      ac: token.ac,
      conditions: token.conditions as unknown as Record<string, unknown>[],
      visible: token.visible,
    })

  if (error) throw new Error(`Failed to spawn token: ${error.message}`)
}

/**
 * Move a token to a new position.
 */
export async function moveTokenDB(
  supabase: Client,
  gameStateId: string,
  tokenId: string,
  x: number,
  y: number
): Promise<void> {
  const { error } = await supabase
    .from('game_tokens')
    .update({ position_x: x, position_y: y })
    .eq('id', tokenId)
    .eq('game_state_id', gameStateId)

  if (error) throw new Error(`Failed to move token: ${error.message}`)
}

/**
 * Update game mode (exploration/encounter/downtime).
 */
export async function updateGameMode(
  supabase: Client,
  gameStateId: string,
  mode: GameMode,
  round?: number
): Promise<void> {
  const update: Record<string, unknown> = { mode }
  if (round !== undefined) update.round = round
  if (mode === 'exploration') {
    update.round = 0
    update.current_turn_index = -1
    update.current_token_id = null
    update.actions_remaining = 3
    update.reaction_available = true
  }

  const { error } = await supabase
    .from('game_state')
    .update(update)
    .eq('id', gameStateId)

  if (error) throw new Error(`Failed to update mode: ${error.message}`)
}

/**
 * Advance to next turn.
 */
export async function advanceTurn(
  supabase: Client,
  gameStateId: string,
  nextTokenId: string,
  turnIndex: number,
  round: number
): Promise<void> {
  const { error } = await supabase
    .from('game_state')
    .update({
      current_token_id: nextTokenId,
      current_turn_index: turnIndex,
      round,
      actions_remaining: 3,
      reaction_available: true,
    })
    .eq('id', gameStateId)

  if (error) throw new Error(`Failed to advance turn: ${error.message}`)
}

/**
 * Use an action (decrement counter).
 */
export async function useActionDB(
  supabase: Client,
  gameStateId: string,
  actionsRemaining: number
): Promise<void> {
  const { error } = await supabase
    .from('game_state')
    .update({ actions_remaining: actionsRemaining })
    .eq('id', gameStateId)

  if (error) throw new Error(`Failed to use action: ${error.message}`)
}

/**
 * Log a game event.
 */
export async function logGameEvent(
  supabase: Client,
  gameStateId: string,
  eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('game_action_log')
    .insert({
      game_state_id: gameStateId,
      event_type: eventType,
      data,
    })

  if (error) throw new Error(`Failed to log event: ${error.message}`)
}

/**
 * Update token HP.
 */
export async function updateTokenHP(
  supabase: Client,
  gameStateId: string,
  tokenId: string,
  hp: { current: number; max: number; temp: number }
): Promise<void> {
  const { error } = await supabase
    .from('game_tokens')
    .update({
      hp_current: hp.current,
      hp_max: hp.max,
      hp_temp: hp.temp,
    })
    .eq('id', tokenId)
    .eq('game_state_id', gameStateId)

  if (error) throw new Error(`Failed to update HP: ${error.message}`)
}

/**
 * Remove a token from the map.
 */
export async function removeTokenDB(
  supabase: Client,
  gameStateId: string,
  tokenId: string
): Promise<void> {
  const { error } = await supabase
    .from('game_tokens')
    .delete()
    .eq('id', tokenId)
    .eq('game_state_id', gameStateId)

  if (error) throw new Error(`Failed to remove token: ${error.message}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/sync/game-actions.ts
git commit -m "feat(web): add game action functions for DB writes"
```

---

### Task 4: Game Sync Provider (Realtime Subscriptions)

**Files:**
- Create: `apps/web/lib/sync/game-sync.ts`
- Create: `apps/web/components/providers/GameSyncProvider.tsx`

- [ ] **Step 1: Create sync logic**

`apps/web/lib/sync/game-sync.ts`:
```typescript
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '../types/database.js'
import type { GameTokenRow, GameStateRow } from './types.js'
import { useGameStore } from '../stores/game-store.js'
import type { Token, ActiveCondition } from '@dndmanager/game-runtime'

type Client = SupabaseClient<Database>

function tokenRowToToken(row: GameTokenRow): Token {
  return {
    id: row.id,
    name: row.name,
    type: row.token_type as Token['type'],
    ownerId: row.owner_id ?? 'gm',
    position: { x: row.position_x, y: row.position_y },
    speed: row.speed,
    hp: { current: row.hp_current, max: row.hp_max, temp: row.hp_temp },
    ac: row.ac,
    conditions: (row.conditions ?? []) as ActiveCondition[],
    visible: row.visible,
  }
}

export function subscribeToGameState(
  supabase: Client,
  gameStateId: string
): RealtimeChannel {
  const channel = supabase.channel(`game:${gameStateId}`)

  // Subscribe to game_state changes
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'game_state',
      filter: `id=eq.${gameStateId}`,
    },
    (payload) => {
      const row = payload.new as GameStateRow
      if (!row) return
      const store = useGameStore.getState()
      store.setMode(row.mode)
      store.setRound(row.round)
      if (row.current_token_id) {
        store.setTurn({
          currentTokenId: row.current_token_id,
          actionsRemaining: row.actions_remaining,
          reactionAvailable: row.reaction_available,
          actionsUsed: [],
        })
      } else {
        store.setTurn(null)
      }
    }
  )

  // Subscribe to game_tokens changes
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'game_tokens',
      filter: `game_state_id=eq.${gameStateId}`,
    },
    (payload) => {
      const store = useGameStore.getState()
      const tokens = [...store.tokens]

      if (payload.eventType === 'INSERT') {
        const newToken = tokenRowToToken(payload.new as GameTokenRow)
        if (!tokens.find((t) => t.id === newToken.id)) {
          store.setTokens([...tokens, newToken])
        }
      } else if (payload.eventType === 'UPDATE') {
        const updated = tokenRowToToken(payload.new as GameTokenRow)
        store.setTokens(tokens.map((t) => t.id === updated.id ? updated : t))
      } else if (payload.eventType === 'DELETE') {
        const old = payload.old as { id?: string }
        if (old.id) {
          store.setTokens(tokens.filter((t) => t.id !== old.id))
        }
      }
    }
  )

  // Subscribe to initiative changes
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'game_initiative',
      filter: `game_state_id=eq.${gameStateId}`,
    },
    (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        // Re-fetch all initiative for this game to get sorted order
        supabase
          .from('game_initiative')
          .select('*')
          .eq('game_state_id', gameStateId)
          .order('sort_order')
          .then(({ data }) => {
            if (data) {
              const store = useGameStore.getState()
              store.setInitiative(
                data.map((d) => ({
                  tokenId: d.token_id,
                  roll: d.roll,
                  modifier: d.modifier,
                  total: d.total,
                })),
                data.map((d) => d.token_id)
              )
            }
          })
      }
    }
  )

  channel.subscribe()

  return channel
}
```

- [ ] **Step 2: Create sync provider component**

`apps/web/components/providers/GameSyncProvider.tsx`:
```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { subscribeToGameState } from '@/lib/sync/game-sync'
import { loadGameState } from '@/lib/sync/game-actions'
import { useGameStore } from '@/lib/stores/game-store'
import type { Token, ActiveCondition } from '@dndmanager/game-runtime'

interface GameSyncProviderProps {
  sessionId: string
  children: React.ReactNode
}

export function GameSyncProvider({ sessionId, children }: GameSyncProviderProps) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [gameStateId, setGameStateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      try {
        const result = await loadGameState(supabase, sessionId)
        if (!result) {
          setError('Kein Spielzustand fuer diese Session gefunden')
          setLoading(false)
          return
        }

        const { state, tokens } = result
        setGameStateId(state.id)

        // Hydrate Zustand store
        const store = useGameStore.getState()
        store.setMode(state.mode)
        store.setRound(state.round)
        store.setTokens(
          tokens.map((t) => ({
            id: t.id,
            name: t.name,
            type: t.token_type as Token['type'],
            ownerId: t.owner_id ?? 'gm',
            position: { x: t.position_x, y: t.position_y },
            speed: t.speed,
            hp: { current: t.hp_current, max: t.hp_max, temp: t.hp_temp },
            ac: t.ac,
            conditions: (t.conditions ?? []) as ActiveCondition[],
            visible: t.visible,
          }))
        )

        if (state.current_token_id) {
          store.setTurn({
            currentTokenId: state.current_token_id,
            actionsRemaining: state.actions_remaining,
            reactionAvailable: state.reaction_available,
            actionsUsed: [],
          })
        }

        // Subscribe to Realtime
        channelRef.current = subscribeToGameState(supabase, state.id)
        setLoading(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
        setLoading(false)
      }
    }

    init()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <p className="text-neutral-400">Spielzustand wird geladen...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/sync/game-sync.ts apps/web/components/providers/GameSyncProvider.tsx
git commit -m "feat(web): add Realtime sync provider with Supabase subscriptions"
```

---

### Task 5: Enhanced Game Store with Sync

**Files:**
- Modify: `apps/web/lib/stores/game-store.ts`

- [ ] **Step 1: Add gameStateId to the store**

Add `gameStateId: string | null` to the store state and a `setGameStateId` action. This lets the sync provider and game actions know which game state to operate on.

Add to initial state:
```typescript
gameStateId: null as string | null,
```

Add action:
```typescript
setGameStateId: (id: string | null) => set({ gameStateId: id }),
```

Also add to the interface and reset.

- [ ] **Step 2: Verify tests still pass**

Run: `pnpm --filter @dndmanager/web test`
Expected: All tests pass (the new field has a default, so existing tests work)

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/stores/game-store.ts
git commit -m "feat(web): add gameStateId to store for sync coordination"
```

---

### Task 6: Update Database Types

**Files:**
- Modify: `apps/web/lib/types/database.ts`

- [ ] **Step 1: Add game state table types to database.ts**

Add the following tables to the `Database` type in `apps/web/lib/types/database.ts`:

```typescript
game_state: {
  Row: {
    id: string
    session_id: string
    mode: string
    round: number
    current_turn_index: number
    current_token_id: string | null
    actions_remaining: number
    reaction_available: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    session_id: string
    mode?: string
    round?: number
    current_turn_index?: number
    current_token_id?: string | null
    actions_remaining?: number
    reaction_available?: boolean
  }
  Update: {
    id?: string
    session_id?: string
    mode?: string
    round?: number
    current_turn_index?: number
    current_token_id?: string | null
    actions_remaining?: number
    reaction_available?: boolean
  }
}
game_tokens: {
  Row: {
    id: string
    game_state_id: string
    name: string
    token_type: string
    owner_id: string | null
    position_x: number
    position_y: number
    speed: number
    hp_current: number
    hp_max: number
    hp_temp: number
    ac: number
    conditions: unknown[]
    visible: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id: string
    game_state_id: string
    name: string
    token_type: string
    owner_id?: string | null
    position_x?: number
    position_y?: number
    speed?: number
    hp_current: number
    hp_max: number
    hp_temp?: number
    ac: number
    conditions?: unknown[]
    visible?: boolean
  }
  Update: {
    id?: string
    game_state_id?: string
    name?: string
    token_type?: string
    owner_id?: string | null
    position_x?: number
    position_y?: number
    speed?: number
    hp_current?: number
    hp_max?: number
    hp_temp?: number
    ac?: number
    conditions?: unknown[]
    visible?: boolean
  }
}
game_initiative: {
  Row: {
    id: string
    game_state_id: string
    token_id: string
    roll: number
    modifier: number
    total: number
    sort_order: number
  }
  Insert: {
    id?: string
    game_state_id: string
    token_id: string
    roll: number
    modifier?: number
    total: number
    sort_order?: number
  }
  Update: {
    id?: string
    game_state_id?: string
    token_id?: string
    roll?: number
    modifier?: number
    total?: number
    sort_order?: number
  }
}
game_action_log: {
  Row: {
    id: string
    game_state_id: string
    event_type: string
    data: Record<string, unknown>
    created_at: string
  }
  Insert: {
    id?: string
    game_state_id: string
    event_type: string
    data?: Record<string, unknown>
  }
  Update: {
    id?: string
    game_state_id?: string
    event_type?: string
    data?: Record<string, unknown>
  }
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/types/database.ts
git commit -m "feat(web): add game state table types to database schema"
```

---

### Task 7: Server-Side Dice Rolling (Edge Function)

**Files:**
- Create: `supabase/functions/roll-dice/index.ts`

- [ ] **Step 1: Create edge function**

`supabase/functions/roll-dice/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

interface RollRequest {
  count: number
  sides: number
  modifier?: number
  gameStateId?: string
  purpose?: string
}

serve(async (req) => {
  try {
    const { count, sides, modifier = 0, gameStateId, purpose } = await req.json() as RollRequest

    if (count < 1 || count > 100 || sides < 1 || sides > 100) {
      return new Response(JSON.stringify({ error: 'Invalid dice parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Server-side random (crypto-secure)
    const rolls: number[] = []
    for (let i = 0; i < count; i++) {
      const array = new Uint32Array(1)
      crypto.getRandomValues(array)
      rolls.push((array[0] % sides) + 1)
    }

    const total = rolls.reduce((a, b) => a + b, 0) + modifier

    // Optionally log to game action log
    if (gameStateId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      await supabase.from('game_action_log').insert({
        game_state_id: gameStateId,
        event_type: 'dice_roll',
        data: { rolls, modifier, total, sides, count, purpose },
      })
    }

    return new Response(JSON.stringify({ rolls, modifier, total }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/
git commit -m "feat(api): add server-side dice rolling edge function"
```

---

### Task 8: Full Verification

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: All pass

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit any remaining changes**

```bash
git status
```
