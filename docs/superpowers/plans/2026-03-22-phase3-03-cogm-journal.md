# Phase 3.3: Co-GM Assistant & Session Journal Generator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide GMs with an AI-powered Co-GM assistant that answers rules questions, suggests consequences, and helps balance encounters — all inside a sidebar chat panel on the GM dashboard. Additionally, automatically generate narrative session journals from the `game_action_log` when a session ends, store them in the database, and display them in a read-only journal UI.

**Architecture:** Both features extend `@dndmanager/ai-services` with new services and prompts. The Co-GM uses a streaming multi-turn conversation backed by Claude, with game context (tokens, encounter state, recent events) injected as system context. The Journal Generator reads the full `game_action_log` for a session, sends it to Claude for narrative summarisation, and persists the result to a new `session_journals` table. Next.js API routes proxy both services, and React components provide the UI.

**Tech Stack:** @anthropic-ai/sdk, @dndmanager/ai-services, @dndmanager/game-runtime, Next.js API routes (streaming), React, shadcn/ui, Supabase, Zustand

---

## File Structure

```
packages/ai-services/src/
├── types.ts                                  → Add Co-GM and Journal types
├── prompts/
│   ├── co-gm.ts                              → Co-GM system prompt + context builder
│   └── journal.ts                            → Journal generation prompt
├── services/
│   ├── co-gm.ts                              → Co-GM streaming conversation service
│   └── journal-generator.ts                  → Session journal generation service
└── index.ts                                  → Re-export new public API

supabase/migrations/
└── 00004_session_journals.sql                → session_journals table + RLS

apps/web/
├── app/api/ai/co-gm/
│   └── route.ts                              → POST streaming endpoint for Co-GM chat
├── app/api/ai/journal/
│   ├── generate/route.ts                     → POST endpoint to generate journal
│   └── [sessionId]/route.ts                  → GET endpoint to fetch journal
├── lib/stores/
│   └── co-gm-store.ts                        → Zustand store for Co-GM chat state
├── components/gm/
│   ├── CoGMPanel.tsx                          → Co-GM sidebar chat panel
│   └── CoGMMessage.tsx                        → Single message bubble component
├── components/journal/
│   ├── JournalList.tsx                        → List of session journals for a campaign
│   └── JournalEntry.tsx                       → Single journal detail view
└── app/(gm)/dashboard/[sessionId]/page.tsx   → Modified to include Co-GM panel
```

---

### Task 1: Co-GM and Journal Types

**Files:**
- Modify: `packages/ai-services/src/types.ts`

- [ ] **Step 1: Add Co-GM types**

Append to `packages/ai-services/src/types.ts`:
```ts
// ─── Co-GM Types ─────────────────────────────

/** A single message in a Co-GM conversation */
export interface CoGMMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

/** Game context snapshot injected into Co-GM system prompt */
export interface GameContextSnapshot {
  sessionId: string
  mode: 'exploration' | 'encounter' | 'downtime'
  round: number
  tokens: {
    id: string
    name: string
    type: 'player' | 'monster' | 'npc'
    hp: { current: number; max: number }
    ac: number
    conditions: string[]
  }[]
  currentTurnTokenId?: string
  recentEvents: string[] // last ~20 formatted event strings
}

/** Request payload for the Co-GM chat endpoint */
export interface CoGMRequest {
  message: string
  conversationHistory: CoGMMessage[]
  gameContext: GameContextSnapshot
  campaignSetting?: string
}

// ─── Journal Types ───────────────────────────

/** A generated session journal entry */
export interface SessionJournal {
  id: string
  sessionId: string
  campaignId: string
  title: string
  narrative: string      // markdown-formatted narrative summary
  highlights: string[]   // key moments
  combatSummary?: string // encounter recap if any combat occurred
  generatedAt: string    // ISO timestamp
}

/** Request payload for journal generation */
export interface JournalGenerateRequest {
  sessionId: string
  campaignId: string
  sessionName: string
  actionLog: {
    eventType: string
    data: Record<string, unknown>
    createdAt: string
  }[]
  partyMembers: string[] // character names
  campaignSetting?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/types.ts
git commit -m "feat(ai-services): add Co-GM and session journal types"
```

---

### Task 2: Co-GM Prompt Templates

**Files:**
- Create: `packages/ai-services/src/prompts/co-gm.ts`

- [ ] **Step 1: Create Co-GM prompts**

`packages/ai-services/src/prompts/co-gm.ts`:
```ts
import type { GameContextSnapshot } from '../types'

export const COGM_SYSTEM_PROMPT = `You are a Co-GM assistant for a Pathfinder 2nd Edition tabletop game. You help the Game Master run their session by answering rules questions, suggesting consequences, and balancing encounters.

CORE RESPONSIBILITIES:
1. **Rules Lookup**: Answer PF2e rules questions accurately. Cite the relevant rules when possible.
2. **Consequence Suggestions**: When the GM describes a player action, suggest realistic in-game consequences with DC checks where appropriate.
3. **Encounter Balancing**: Help adjust encounters for party size/level. Use PF2e encounter budget system (Trivial: 40, Low: 60, Moderate: 80, Severe: 120, Extreme: 160 XP for a party of 4).
4. **Tactical Advice**: Suggest NPC/monster tactics that make encounters interesting but fair.
5. **Improvisation Help**: Help the GM improvise NPCs, descriptions, and plot hooks.

PF2e RULES REFERENCE:
- Actions: Each creature gets 3 actions per turn. Reactions are separate.
- MAP (Multiple Attack Penalty): -5 on 2nd attack, -10 on 3rd (agile: -4/-8).
- Degrees of Success: Critical Success (beat DC by 10+), Success, Failure, Critical Failure (miss DC by 10+).
- Conditions: Frightened (status penalty = value), Sickened (status penalty = value), Stunned (lose actions), Prone (flat-footed, stand = 1 action), Grabbed (flat-footed, immobilized), etc.
- Grapple: Athletics vs Fortitude DC. Crit Success = Restrained. Success = Grabbed. Crit Fail = you become flat-footed.
- Encounter Budget per creature: Party Level -4 = 10 XP, PL-3 = 15, PL-2 = 20, PL-1 = 30, PL = 40, PL+1 = 60, PL+2 = 80, PL+3 = 120, PL+4 = 160.

GUIDELINES:
- Be concise. GMs need quick answers during play.
- When unsure about a rule, say so and suggest a reasonable ruling.
- Format lists and tables in markdown for readability.
- Reference the current game state when relevant (tokens, HP, conditions).
- Never take actions for the GM — only suggest and advise.
- If asked about homebrew or house rules, provide the RAW (Rules As Written) answer first, then suggest alternatives.`

/**
 * Builds the dynamic game-context block injected into the system prompt.
 */
export function buildGameContextBlock(ctx: GameContextSnapshot): string {
  const lines: string[] = [
    '',
    '--- CURRENT GAME STATE ---',
    `Mode: ${ctx.mode} | Round: ${ctx.round}`,
  ]

  if (ctx.currentTurnTokenId) {
    lines.push(`Current Turn: ${ctx.currentTurnTokenId}`)
  }

  if (ctx.tokens.length > 0) {
    lines.push('')
    lines.push('TOKENS ON MAP:')
    for (const t of ctx.tokens) {
      const conditions = t.conditions.length > 0 ? ` [${t.conditions.join(', ')}]` : ''
      lines.push(`  ${t.name} (${t.type}) — HP ${t.hp.current}/${t.hp.max}, AC ${t.ac}${conditions}`)
    }
  }

  if (ctx.recentEvents.length > 0) {
    lines.push('')
    lines.push('RECENT EVENTS:')
    for (const event of ctx.recentEvents.slice(-15)) {
      lines.push(`  - ${event}`)
    }
  }

  return lines.join('\n')
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/prompts/co-gm.ts
git commit -m "feat(ai-services): add Co-GM system prompt and context builder"
```

---

### Task 3: Co-GM Streaming Service

**Files:**
- Create: `packages/ai-services/src/services/co-gm.ts`

- [ ] **Step 1: Create the Co-GM service with streaming**

`packages/ai-services/src/services/co-gm.ts`:
```ts
import { getAnthropicClient } from '../client'
import { COGM_SYSTEM_PROMPT, buildGameContextBlock } from '../prompts/co-gm'
import type { CoGMRequest, CoGMMessage } from '../types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1024

/**
 * Sends a Co-GM message and returns a streaming response.
 * The caller should iterate over the stream to get text deltas.
 */
export async function streamCoGMResponse(request: CoGMRequest) {
  const client = getAnthropicClient()

  const gameContext = buildGameContextBlock(request.gameContext)
  const systemPrompt = COGM_SYSTEM_PROMPT + gameContext

  // Build conversation messages
  const messages: { role: 'user' | 'assistant'; content: string }[] = []

  for (const msg of request.conversationHistory) {
    messages.push({ role: msg.role, content: msg.content })
  }

  // Add the new user message
  messages.push({ role: 'user', content: request.message })

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  })

  return stream
}

/**
 * Non-streaming variant for testing or simpler use cases.
 */
export async function askCoGM(request: CoGMRequest): Promise<string> {
  const client = getAnthropicClient()

  const gameContext = buildGameContextBlock(request.gameContext)
  const systemPrompt = COGM_SYSTEM_PROMPT + gameContext

  const messages: { role: 'user' | 'assistant'; content: string }[] = []

  for (const msg of request.conversationHistory) {
    messages.push({ role: msg.role, content: msg.content })
  }

  messages.push({ role: 'user', content: request.message })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  return textBlock.text
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/services/co-gm.ts
git commit -m "feat(ai-services): add Co-GM streaming conversation service"
```

---

### Task 4: Journal Generation Prompt

**Files:**
- Create: `packages/ai-services/src/prompts/journal.ts`

- [ ] **Step 1: Create journal prompt**

`packages/ai-services/src/prompts/journal.ts`:
```ts
export const JOURNAL_SYSTEM_PROMPT = `You are a session journal writer for a Pathfinder 2nd Edition tabletop RPG. Given a log of game actions from a session, write an engaging narrative summary that the players will enjoy reading after the session.

OUTPUT FORMAT — respond with valid JSON:
{
  "title": "A short evocative title for this session (5-10 words)",
  "narrative": "A markdown-formatted narrative summary (3-6 paragraphs). Write in past tense, third person. Include character names. Make it dramatic and fun to read. Cover key decisions, combat highlights, and story progression.",
  "highlights": ["Key moment 1", "Key moment 2", "...up to 5 highlights"],
  "combatSummary": "A brief tactical summary of any combat encounters, or null if no combat occurred. Include who fought whom, notable hits/misses, and the outcome."
}

GUIDELINES:
- Transform mechanical game events (damage_dealt, condition_added) into narrative prose.
- Name characters by their token name, not their ID.
- Group related events into narrative beats (e.g., a sequence of attacks becomes a combat paragraph).
- Highlight dramatic moments: critical hits, near-death saves, clever tactics.
- Keep the tone matching heroic fantasy — dramatic but not overwrought.
- If the session was short or had few events, write a shorter journal.
- Do not invent events that did not happen in the log.
- Do not include any text outside the JSON object.`

/**
 * Builds the user prompt with the session action log.
 */
export function buildJournalPrompt(
  sessionName: string,
  partyMembers: string[],
  actionLog: { eventType: string; data: Record<string, unknown>; createdAt: string }[],
  campaignSetting?: string
): string {
  const lines: string[] = [
    `Session: "${sessionName}"`,
    `Party: ${partyMembers.join(', ')}`,
  ]

  if (campaignSetting) {
    lines.push(`Setting: ${campaignSetting}`)
  }

  lines.push('')
  lines.push('--- ACTION LOG ---')

  for (const entry of actionLog) {
    const time = new Date(entry.createdAt).toLocaleTimeString('en-US', { hour12: false })
    lines.push(`[${time}] ${entry.eventType}: ${JSON.stringify(entry.data)}`)
  }

  return lines.join('\n')
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/prompts/journal.ts
git commit -m "feat(ai-services): add session journal generation prompt"
```

---

### Task 5: Journal Generator Service

**Files:**
- Create: `packages/ai-services/src/services/journal-generator.ts`

- [ ] **Step 1: Create the journal generator service**

`packages/ai-services/src/services/journal-generator.ts`:
```ts
import { getAnthropicClient } from '../client'
import { JOURNAL_SYSTEM_PROMPT, buildJournalPrompt } from '../prompts/journal'
import type { JournalGenerateRequest, SessionJournal } from '../types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2048

/**
 * Generates a narrative session journal from the game action log.
 */
export async function generateSessionJournal(
  request: JournalGenerateRequest
): Promise<Omit<SessionJournal, 'id' | 'generatedAt'>> {
  const client = getAnthropicClient()

  const userPrompt = buildJournalPrompt(
    request.sessionName,
    request.partyMembers,
    request.actionLog,
    request.campaignSetting
  )

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: JOURNAL_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let parsed: {
    title: string
    narrative: string
    highlights: string[]
    combatSummary: string | null
  }

  try {
    parsed = JSON.parse(textBlock.text)
  } catch {
    throw new Error(
      `Failed to parse journal response as JSON: ${textBlock.text.slice(0, 200)}`
    )
  }

  if (!parsed.title || !parsed.narrative || !parsed.highlights) {
    throw new Error('Incomplete journal: missing title, narrative, or highlights')
  }

  return {
    sessionId: request.sessionId,
    campaignId: request.campaignId,
    title: parsed.title,
    narrative: parsed.narrative,
    highlights: parsed.highlights,
    combatSummary: parsed.combatSummary ?? undefined,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/services/journal-generator.ts
git commit -m "feat(ai-services): add session journal generator service"
```

---

### Task 6: Update ai-services Public API

**Files:**
- Modify: `packages/ai-services/src/index.ts`

- [ ] **Step 1: Re-export Co-GM and Journal services**

Append to `packages/ai-services/src/index.ts`:
```ts
// Co-GM Assistant
export { streamCoGMResponse, askCoGM } from './services/co-gm'
export {
  COGM_SYSTEM_PROMPT,
  buildGameContextBlock,
} from './prompts/co-gm'
export type {
  CoGMMessage,
  CoGMRequest,
  GameContextSnapshot,
} from './types'

// Session Journal
export { generateSessionJournal } from './services/journal-generator'
export {
  JOURNAL_SYSTEM_PROMPT,
  buildJournalPrompt,
} from './prompts/journal'
export type {
  SessionJournal,
  JournalGenerateRequest,
} from './types'
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/index.ts
git commit -m "feat(ai-services): export Co-GM and journal public API"
```

---

### Task 7: Session Journals Database Table

**Files:**
- Create: `supabase/migrations/00004_session_journals.sql`

- [ ] **Step 1: Create migration**

`supabase/migrations/00004_session_journals.sql`:
```sql
-- ============================================================
-- Session Journals (AI-generated session summaries)
-- ============================================================

create table public.session_journals (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  narrative text not null,
  highlights jsonb not null default '[]'::jsonb,
  combat_summary text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(session_id)  -- one journal per session
);

alter table public.session_journals enable row level security;

-- Campaign members can read journals
create policy "Campaign members can view session journals"
  on public.session_journals for select
  using (
    exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = session_journals.campaign_id
      and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaigns c
      where c.id = session_journals.campaign_id
      and c.gm_id = auth.uid()
    )
  );

-- Only GMs can create/update/delete journals
create policy "GMs can manage session journals"
  on public.session_journals for all
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = session_journals.campaign_id
      and c.gm_id = auth.uid()
    )
  );

-- Index for fast lookup by campaign
create index idx_session_journals_campaign_id on public.session_journals(campaign_id);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/00004_session_journals.sql
git commit -m "feat(db): add session_journals table with RLS policies"
```

---

### Task 8: Co-GM API Route (Streaming)

**Files:**
- Create: `apps/web/app/api/ai/co-gm/route.ts`

- [ ] **Step 1: Create streaming API route**

`apps/web/app/api/ai/co-gm/route.ts`:
```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { streamCoGMResponse } from '@dndmanager/ai-services'
import type { CoGMRequest } from '@dndmanager/ai-services'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: CoGMRequest
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!body.message || !body.gameContext) {
    return new Response('Missing message or gameContext', { status: 400 })
  }

  // Verify user is GM of this session
  const { data: session } = await supabase
    .from('sessions')
    .select('campaign_id, campaigns!inner(gm_id)')
    .eq('id', body.gameContext.sessionId)
    .single()

  if (!session || (session.campaigns as any).gm_id !== user.id) {
    return new Response('Forbidden: not the GM', { status: 403 })
  }

  try {
    const stream = await streamCoGMResponse(body)

    // Convert Anthropic stream to a ReadableStream for the response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('Co-GM error:', err)
    return new Response('AI service error', { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/ai/co-gm/route.ts
git commit -m "feat(web): add streaming Co-GM API route"
```

---

### Task 9: Journal API Routes

**Files:**
- Create: `apps/web/app/api/ai/journal/generate/route.ts`
- Create: `apps/web/app/api/ai/journal/[sessionId]/route.ts`

- [ ] **Step 1: Create journal generation endpoint**

`apps/web/app/api/ai/journal/generate/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSessionJournal } from '@dndmanager/ai-services'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await req.json()

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  // Fetch session + verify GM
  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, campaign_id, campaigns!inner(gm_id, settings)')
    .eq('id', sessionId)
    .single()

  if (!session || (session.campaigns as any).gm_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check if journal already exists
  const { data: existing } = await supabase
    .from('session_journals')
    .select('id')
    .eq('session_id', sessionId)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Journal already exists for this session' },
      { status: 409 }
    )
  }

  // Fetch action log via game_state
  const { data: gameState } = await supabase
    .from('game_state')
    .select('id')
    .eq('session_id', sessionId)
    .single()

  if (!gameState) {
    return NextResponse.json({ error: 'No game state found' }, { status: 404 })
  }

  const { data: actionLog } = await supabase
    .from('game_action_log')
    .select('event_type, data, created_at')
    .eq('game_state_id', gameState.id)
    .order('created_at', { ascending: true })

  if (!actionLog || actionLog.length === 0) {
    return NextResponse.json({ error: 'No action log entries' }, { status: 404 })
  }

  // Fetch party member names
  const { data: characters } = await supabase
    .from('characters')
    .select('name')
    .eq('campaign_id', session.campaign_id)

  const partyMembers = characters?.map((c) => c.name) ?? []

  try {
    const journal = await generateSessionJournal({
      sessionId,
      campaignId: session.campaign_id,
      sessionName: session.name,
      actionLog: actionLog.map((entry) => ({
        eventType: entry.event_type,
        data: entry.data as Record<string, unknown>,
        createdAt: entry.created_at,
      })),
      partyMembers,
    })

    // Persist to database
    const { data: saved, error } = await supabase
      .from('session_journals')
      .insert({
        session_id: journal.sessionId,
        campaign_id: journal.campaignId,
        title: journal.title,
        narrative: journal.narrative,
        highlights: journal.highlights,
        combat_summary: journal.combatSummary ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save journal:', error)
      return NextResponse.json({ error: 'Failed to save journal' }, { status: 500 })
    }

    return NextResponse.json(saved)
  } catch (err) {
    console.error('Journal generation error:', err)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create journal fetch endpoint**

`apps/web/app/api/ai/journal/[sessionId]/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: journal, error } = await supabase
    .from('session_journals')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (error || !journal) {
    return NextResponse.json({ error: 'Journal not found' }, { status: 404 })
  }

  return NextResponse.json(journal)
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/ai/journal/
git commit -m "feat(web): add journal generation and fetch API routes"
```

---

### Task 10: Co-GM Zustand Store

**Files:**
- Create: `apps/web/lib/stores/co-gm-store.ts`

- [ ] **Step 1: Create the Co-GM chat store**

`apps/web/lib/stores/co-gm-store.ts`:
```ts
import { create } from 'zustand'
import type { CoGMMessage, GameContextSnapshot } from '@dndmanager/ai-services'

interface CoGMState {
  messages: CoGMMessage[]
  isStreaming: boolean
  error: string | null

  addUserMessage: (content: string) => void
  startStreaming: () => void
  appendToAssistant: (delta: string) => void
  finishStreaming: () => void
  setError: (error: string | null) => void
  clearChat: () => void
}

export const useCoGMStore = create<CoGMState>((set, get) => ({
  messages: [],
  isStreaming: false,
  error: null,

  addUserMessage: (content) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { role: 'user', content, timestamp: Date.now() },
      ],
      error: null,
    })),

  startStreaming: () =>
    set((state) => ({
      isStreaming: true,
      messages: [
        ...state.messages,
        { role: 'assistant', content: '', timestamp: Date.now() },
      ],
    })),

  appendToAssistant: (delta) =>
    set((state) => {
      const messages = [...state.messages]
      const last = messages[messages.length - 1]
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = {
          ...last,
          content: last.content + delta,
        }
      }
      return { messages }
    }),

  finishStreaming: () => set({ isStreaming: false }),

  setError: (error) => set({ error, isStreaming: false }),

  clearChat: () => set({ messages: [], error: null, isStreaming: false }),
}))

/**
 * Sends a message to the Co-GM and streams the response.
 */
export async function sendCoGMMessage(
  message: string,
  gameContext: GameContextSnapshot,
  store: CoGMState
) {
  store.addUserMessage(message)
  store.startStreaming()

  try {
    const conversationHistory = store.messages.filter(
      (m) => m.content.length > 0
    )

    const response = await fetch('/api/ai/co-gm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory: conversationHistory.slice(0, -1), // exclude the empty assistant message
        gameContext,
      }),
    })

    if (!response.ok) {
      throw new Error(`Co-GM error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      store.appendToAssistant(text)
    }

    store.finishStreaming()
  } catch (err) {
    store.setError(err instanceof Error ? err.message : 'Unknown error')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/stores/co-gm-store.ts
git commit -m "feat(web): add Co-GM Zustand store with streaming support"
```

---

### Task 11: Co-GM Chat UI Components

**Files:**
- Create: `apps/web/components/gm/CoGMMessage.tsx`
- Create: `apps/web/components/gm/CoGMPanel.tsx`

- [ ] **Step 1: Create message bubble component**

`apps/web/components/gm/CoGMMessage.tsx`:
```tsx
'use client'

import { cn } from '@/lib/utils'
import type { CoGMMessage as CoGMMessageType } from '@dndmanager/ai-services'

interface CoGMMessageProps {
  message: CoGMMessageType
}

export function CoGMMessage({ message }: CoGMMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-neutral-800 text-neutral-100'
        )}
      >
        {!isUser && (
          <span className="mb-1 block text-xs font-medium text-amber-400">
            Co-GM
          </span>
        )}
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the Co-GM panel**

`apps/web/components/gm/CoGMPanel.tsx`:
```tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import { useCoGMStore, sendCoGMMessage } from '@/lib/stores/co-gm-store'
import { useGameStore } from '@/lib/stores/game-store'
import { CoGMMessage } from './CoGMMessage'
import { formatEventAsText } from '@dndmanager/game-runtime'
import type { GameContextSnapshot } from '@dndmanager/ai-services'

interface CoGMPanelProps {
  sessionId: string
}

export function CoGMPanel({ sessionId }: CoGMPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages = useCoGMStore((s) => s.messages)
  const isStreaming = useCoGMStore((s) => s.isStreaming)
  const error = useCoGMStore((s) => s.error)
  const clearChat = useCoGMStore((s) => s.clearChat)
  const store = useCoGMStore.getState

  // Pull game state for context
  const tokens = useGameStore((s) => s.tokens)
  const mode = useGameStore((s) => s.mode)
  const round = useGameStore((s) => s.round)
  const actionLog = useGameStore((s) => s.actionLog)
  const currentTurnTokenId = useGameStore((s) => s.currentTurnTokenId)

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  function buildContext(): GameContextSnapshot {
    return {
      sessionId,
      mode: mode ?? 'exploration',
      round: round ?? 0,
      tokens: tokens.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        hp: { current: t.hp.current, max: t.hp.max },
        ac: t.ac,
        conditions: t.conditions.map((c) => c.id),
      })),
      currentTurnTokenId: currentTurnTokenId ?? undefined,
      recentEvents: (actionLog ?? []).slice(-20).map(formatEventAsText),
    }
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return

    setInput('')
    const context = buildContext()
    await sendCoGMMessage(trimmed, context, store())
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col rounded border border-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <h3 className="text-sm font-medium text-amber-400">Co-GM Assistant</h3>
        <button
          onClick={clearChat}
          className="text-xs text-neutral-500 hover:text-neutral-300"
          title="Clear chat"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto p-3"
      >
        {messages.length === 0 && (
          <div className="space-y-2 py-4 text-center text-xs text-neutral-500">
            <p>Ask me about PF2e rules, encounter balancing, or consequences.</p>
            <div className="space-y-1">
              <p className="text-neutral-600">Try:</p>
              <p>&quot;How does Grapple work?&quot;</p>
              <p>&quot;Balance this encounter for 3 players&quot;</p>
              <p>&quot;Players want to burn down the tavern&quot;</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <CoGMMessage key={i} message={msg} />
        ))}
        {isStreaming && (
          <div className="text-xs text-neutral-500">Co-GM is thinking...</div>
        )}
        {error && (
          <div className="rounded bg-red-900/30 px-2 py-1 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 p-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the Co-GM..."
            disabled={isStreaming}
            className="flex-1 rounded bg-neutral-800 px-3 py-1.5 text-sm text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-amber-500"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/gm/CoGMMessage.tsx apps/web/components/gm/CoGMPanel.tsx
git commit -m "feat(web): add Co-GM chat panel UI components"
```

---

### Task 12: Journal UI Components

**Files:**
- Create: `apps/web/components/journal/JournalEntry.tsx`
- Create: `apps/web/components/journal/JournalList.tsx`

- [ ] **Step 1: Create journal entry component**

`apps/web/components/journal/JournalEntry.tsx`:
```tsx
'use client'

import type { SessionJournal } from '@dndmanager/ai-services'

interface JournalEntryProps {
  journal: SessionJournal
}

export function JournalEntry({ journal }: JournalEntryProps) {
  return (
    <article className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
      <header>
        <h2 className="text-xl font-bold text-amber-400">{journal.title}</h2>
        <p className="mt-1 text-xs text-neutral-500">
          {new Date(journal.generatedAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </header>

      {/* Narrative */}
      <div className="prose prose-invert prose-sm max-w-none">
        {journal.narrative.split('\n\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {/* Highlights */}
      {journal.highlights.length > 0 && (
        <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
          <h3 className="mb-2 text-sm font-medium text-amber-400">Key Moments</h3>
          <ul className="space-y-1 text-sm text-neutral-300">
            {journal.highlights.map((h, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-600">*</span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Combat summary */}
      {journal.combatSummary && (
        <div className="rounded border border-red-900/30 bg-red-950/20 p-4">
          <h3 className="mb-2 text-sm font-medium text-red-400">Combat Summary</h3>
          <p className="text-sm text-neutral-300">{journal.combatSummary}</p>
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 2: Create journal list component**

`apps/web/components/journal/JournalList.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { JournalEntry } from './JournalEntry'
import type { SessionJournal } from '@dndmanager/ai-services'

interface JournalListProps {
  campaignId: string
}

interface JournalRow {
  id: string
  session_id: string
  campaign_id: string
  title: string
  narrative: string
  highlights: string[]
  combat_summary: string | null
  generated_at: string
}

function toSessionJournal(row: JournalRow): SessionJournal {
  return {
    id: row.id,
    sessionId: row.session_id,
    campaignId: row.campaign_id,
    title: row.title,
    narrative: row.narrative,
    highlights: row.highlights,
    combatSummary: row.combat_summary ?? undefined,
    generatedAt: row.generated_at,
  }
}

export function JournalList({ campaignId }: JournalListProps) {
  const [journals, setJournals] = useState<SessionJournal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchJournals() {
      try {
        const res = await fetch(`/api/ai/journal?campaignId=${campaignId}`)
        if (!res.ok) throw new Error('Failed to fetch journals')
        const rows: JournalRow[] = await res.json()
        setJournals(rows.map(toSessionJournal))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchJournals()
  }, [campaignId])

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading journals...</p>
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  if (journals.length === 0) {
    return (
      <div className="rounded border border-neutral-800 p-8 text-center">
        <p className="text-sm text-neutral-500">No session journals yet.</p>
        <p className="mt-1 text-xs text-neutral-600">
          Journals are automatically generated when a session ends.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {journals.map((journal) => (
        <JournalEntry key={journal.id} journal={journal} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/journal/
git commit -m "feat(web): add session journal UI components"
```

---

### Task 13: Integrate Co-GM Panel into GM Dashboard

**Files:**
- Modify: `apps/web/app/(gm)/dashboard/[sessionId]/page.tsx`

- [ ] **Step 1: Add Co-GM sidebar tab to the dashboard**

Replace the GM dashboard page with a tabbed sidebar that includes the existing controls and a new Co-GM tab:

`apps/web/app/(gm)/dashboard/[sessionId]/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useGameStore } from '@/lib/stores/game-store'
import { EncounterPanel } from '@/components/gm/EncounterPanel'
import { MonsterSpawner } from '@/components/gm/MonsterSpawner'
import { TurnControls } from '@/components/gm/TurnControls'
import { CoGMPanel } from '@/components/gm/CoGMPanel'
import { cn } from '@/lib/utils'
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

type SidebarTab = 'controls' | 'cogm'

export default function GMDashboardPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [activeTab, setActiveTab] = useState<SidebarTab>('controls')
  const setTokens = useGameStore((s) => s.setTokens)
  const setMap = useGameStore((s) => s.setMap)

  useEffect(() => {
    setMap([15, 12], 'cave-stone')
    setTokens(MOCK_PLAYER_TOKENS)
  }, [])

  return (
    <div className="flex h-screen bg-neutral-950">
      {/* Sidebar */}
      <div className="flex w-80 flex-col border-r border-neutral-800">
        {/* Tab bar */}
        <div className="flex border-b border-neutral-800">
          <button
            onClick={() => setActiveTab('controls')}
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium',
              activeTab === 'controls'
                ? 'border-b-2 border-amber-500 text-white'
                : 'text-neutral-500 hover:text-neutral-300'
            )}
          >
            Controls
          </button>
          <button
            onClick={() => setActiveTab('cogm')}
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium',
              activeTab === 'cogm'
                ? 'border-b-2 border-amber-500 text-white'
                : 'text-neutral-500 hover:text-neutral-300'
            )}
          >
            Co-GM
          </button>
        </div>

        {/* Tab content */}
        {activeTab === 'controls' && (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
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
        )}

        {activeTab === 'cogm' && (
          <div className="flex-1 overflow-hidden">
            <CoGMPanel sessionId={sessionId} />
          </div>
        )}
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

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(gm\)/dashboard/\[sessionId\]/page.tsx
git commit -m "feat(web): integrate Co-GM panel into GM dashboard sidebar"
```

---

### Task 14: Auto-Generate Journal on Session End

**Files:**
- Modify: `apps/web/lib/sync/game-sync.ts` (or equivalent session management)

- [ ] **Step 1: Add journal trigger on session completion**

In the session management layer, add a hook that triggers journal generation when a session status transitions to `'completed'`. Create a utility function:

`apps/web/lib/journal/auto-generate.ts`:
```ts
/**
 * Triggers journal generation for a completed session.
 * Called when session status changes to 'completed'.
 */
export async function triggerJournalGeneration(sessionId: string): Promise<void> {
  try {
    const res = await fetch('/api/ai/journal/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.warn('Journal generation failed:', body.error ?? res.status)
      return
    }

    console.info('Session journal generated successfully')
  } catch (err) {
    // Non-blocking — journal generation is best-effort
    console.warn('Journal generation error:', err)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/journal/auto-generate.ts
git commit -m "feat(web): add auto-generate journal trigger for session completion"
```

---

### Task 15: Tests for Co-GM and Journal Services

**Files:**
- Create: `packages/ai-services/__tests__/services/co-gm.test.ts`
- Create: `packages/ai-services/__tests__/services/journal-generator.test.ts`
- Create: `packages/ai-services/__tests__/prompts/co-gm.test.ts`
- Create: `packages/ai-services/__tests__/prompts/journal.test.ts`

- [ ] **Step 1: Co-GM prompt tests**

`packages/ai-services/__tests__/prompts/co-gm.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildGameContextBlock, COGM_SYSTEM_PROMPT } from '../../src/prompts/co-gm'
import type { GameContextSnapshot } from '../../src/types'

describe('Co-GM prompts', () => {
  it('system prompt includes PF2e rules reference', () => {
    expect(COGM_SYSTEM_PROMPT).toContain('Multiple Attack Penalty')
    expect(COGM_SYSTEM_PROMPT).toContain('Encounter Budget')
    expect(COGM_SYSTEM_PROMPT).toContain('Grapple')
  })

  it('builds game context block with tokens', () => {
    const ctx: GameContextSnapshot = {
      sessionId: 'test-session',
      mode: 'encounter',
      round: 3,
      tokens: [
        {
          id: 'thorin',
          name: 'Thorin',
          type: 'player',
          hp: { current: 30, max: 45 },
          ac: 18,
          conditions: ['frightened'],
        },
      ],
      currentTurnTokenId: 'thorin',
      recentEvents: ['Round 3 started', 'Thorin moved to (4, 5)'],
    }

    const block = buildGameContextBlock(ctx)
    expect(block).toContain('Mode: encounter')
    expect(block).toContain('Round: 3')
    expect(block).toContain('Thorin (player)')
    expect(block).toContain('HP 30/45')
    expect(block).toContain('[frightened]')
    expect(block).toContain('Current Turn: thorin')
    expect(block).toContain('Round 3 started')
  })

  it('handles empty tokens and events', () => {
    const ctx: GameContextSnapshot = {
      sessionId: 'test-session',
      mode: 'exploration',
      round: 0,
      tokens: [],
      recentEvents: [],
    }

    const block = buildGameContextBlock(ctx)
    expect(block).toContain('Mode: exploration')
    expect(block).not.toContain('TOKENS ON MAP')
    expect(block).not.toContain('RECENT EVENTS')
  })
})
```

- [ ] **Step 2: Journal prompt tests**

`packages/ai-services/__tests__/prompts/journal.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildJournalPrompt, JOURNAL_SYSTEM_PROMPT } from '../../src/prompts/journal'

describe('Journal prompts', () => {
  it('system prompt requires JSON output', () => {
    expect(JOURNAL_SYSTEM_PROMPT).toContain('valid JSON')
    expect(JOURNAL_SYSTEM_PROMPT).toContain('title')
    expect(JOURNAL_SYSTEM_PROMPT).toContain('narrative')
    expect(JOURNAL_SYSTEM_PROMPT).toContain('highlights')
  })

  it('builds journal prompt with action log', () => {
    const prompt = buildJournalPrompt(
      'The Goblin Ambush',
      ['Thorin', 'Elara'],
      [
        {
          eventType: 'encounter_start',
          data: {},
          createdAt: '2026-03-22T19:00:00Z',
        },
        {
          eventType: 'damage_dealt',
          data: { source: 'Thorin', target: 'Goblin', damage: 12 },
          createdAt: '2026-03-22T19:01:00Z',
        },
      ]
    )

    expect(prompt).toContain('The Goblin Ambush')
    expect(prompt).toContain('Thorin, Elara')
    expect(prompt).toContain('encounter_start')
    expect(prompt).toContain('damage_dealt')
  })

  it('includes campaign setting when provided', () => {
    const prompt = buildJournalPrompt(
      'Session 1',
      ['Thorin'],
      [],
      'Lost Omens: Absalom'
    )

    expect(prompt).toContain('Setting: Lost Omens: Absalom')
  })
})
```

- [ ] **Step 3: Co-GM service tests (mocked)**

`packages/ai-services/__tests__/services/co-gm.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { askCoGM } from '../../src/services/co-gm'
import type { CoGMRequest } from '../../src/types'

// Mock the client
vi.mock('../../src/client', () => ({
  getAnthropicClient: () => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Grapple uses Athletics vs Fortitude DC. On a success, the target gains the Grabbed condition.',
          },
        ],
      }),
      stream: vi.fn(),
    },
  }),
}))

describe('askCoGM', () => {
  const baseRequest: CoGMRequest = {
    message: 'How does Grapple work?',
    conversationHistory: [],
    gameContext: {
      sessionId: 'test-session',
      mode: 'encounter',
      round: 1,
      tokens: [],
      recentEvents: [],
    },
  }

  it('returns a text response', async () => {
    const result = await askCoGM(baseRequest)
    expect(result).toContain('Grapple')
    expect(result).toContain('Athletics')
  })
})
```

- [ ] **Step 4: Journal generator service tests (mocked)**

`packages/ai-services/__tests__/services/journal-generator.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { generateSessionJournal } from '../../src/services/journal-generator'
import type { JournalGenerateRequest } from '../../src/types'

vi.mock('../../src/client', () => ({
  getAnthropicClient: () => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: 'The Battle of Thornwood',
              narrative: 'The party ventured into the dark forest...\n\nThorin led the charge against the goblins.',
              highlights: [
                'Thorin landed a critical hit on the goblin chief',
                'Elara saved the party with a timely heal',
              ],
              combatSummary: 'The party fought 4 goblins and their chief. Thorin dealt the killing blow.',
            }),
          },
        ],
      }),
    },
  }),
}))

describe('generateSessionJournal', () => {
  const baseRequest: JournalGenerateRequest = {
    sessionId: 'session-1',
    campaignId: 'campaign-1',
    sessionName: 'The Goblin Ambush',
    actionLog: [
      { eventType: 'encounter_start', data: {}, createdAt: '2026-03-22T19:00:00Z' },
      {
        eventType: 'damage_dealt',
        data: { source: 'Thorin', target: 'Goblin', damage: 12 },
        createdAt: '2026-03-22T19:01:00Z',
      },
    ],
    partyMembers: ['Thorin', 'Elara'],
  }

  it('generates a structured journal', async () => {
    const result = await generateSessionJournal(baseRequest)
    expect(result.title).toBe('The Battle of Thornwood')
    expect(result.narrative).toContain('dark forest')
    expect(result.highlights).toHaveLength(2)
    expect(result.combatSummary).toContain('goblin chief')
    expect(result.sessionId).toBe('session-1')
    expect(result.campaignId).toBe('campaign-1')
  })
})
```

- [ ] **Step 5: Commit**

```bash
git add packages/ai-services/__tests__/services/co-gm.test.ts \
  packages/ai-services/__tests__/services/journal-generator.test.ts \
  packages/ai-services/__tests__/prompts/co-gm.test.ts \
  packages/ai-services/__tests__/prompts/journal.test.ts
git commit -m "test(ai-services): add Co-GM and journal service/prompt tests"
```
