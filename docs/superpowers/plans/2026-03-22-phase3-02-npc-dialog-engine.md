# Phase 3.2: NPC Dialog Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an AI-powered NPC dialog engine where each NPC has a distinct personality, knowledge set, and dialogue style defined in the scenario DSL. Players interact with NPCs through a chat-like interface. Claude generates NPC responses based on a rich system prompt assembled from the NPC definition and conversation history. The GM reviews every AI response before it reaches the player — approving, editing, or rejecting it. This creates immersive, in-character NPC interactions while keeping the GM in full narrative control.

**Architecture:** The conversation context builder and response generation service live in `packages/ai-services/`. Database tables for NPC conversations (with GM approval workflow) live in a new Supabase migration. The GM approval panel is a component in `apps/web/components/gm/`. The player dialog UI is a component in `apps/web/components/game/`. Integration with the game runtime adds `npc_dialog_*` event types so dialog flows participate in the action log and realtime sync.

**Tech Stack:** @anthropic-ai/sdk, @dndmanager/ai-services, @dndmanager/scene-framework (NpcDef), @dndmanager/game-runtime, Next.js API routes, React, Zustand, shadcn/ui, Supabase (Realtime + RLS)

---

## File Structure

```
packages/ai-services/src/
├── prompts/
│   └── npc-dialog.ts                        → System prompt builder from NpcDef + history
├── services/
│   └── npc-dialog.ts                        → NPC response generation service
├── types.ts                                 → Extended with NPC dialog types
└── index.ts                                 → Re-export new public API

packages/game-runtime/src/
├── types.ts                                 → Add npc_dialog_* event types
├── events.ts                                → Add formatEventAsText cases for dialog events
└── npc-dialog.ts                            → NPC dialog game actions (start/send/approve)

supabase/migrations/
└── 00004_npc_conversations.sql              → Tables: npc_conversations, npc_messages

apps/web/
├── app/api/ai/npc-dialog/
│   └── route.ts                             → POST endpoint: generate NPC response
├── app/api/ai/npc-dialog/approve/
│   └── route.ts                             → POST endpoint: GM approves/edits/rejects
├── components/gm/
│   └── NpcApprovalPanel.tsx                 → GM sees pending AI response, can approve/edit/reject
├── components/game/dialog/
│   ├── NpcDialogPanel.tsx                   → Player-facing chat UI with NPC
│   ├── NpcDialogBubble.tsx                  → Single message bubble (NPC or player)
│   └── NpcDialogInput.tsx                   → Text input for player messages
├── lib/stores/
│   └── npc-dialog-store.ts                  → Zustand store for dialog state + realtime sync
└── __tests__/
    └── npc-dialog-store.test.ts             → Store unit tests
```

---

### Task 1: NPC Dialog Types

**Files:**
- Modify: `packages/ai-services/src/types.ts`

- [ ] **Step 1: Add NPC dialog types**

Append to `packages/ai-services/src/types.ts`:
```ts
// ─── NPC Dialog Types ────────────────────────────

/** NPC definition as consumed by the dialog engine (mirrors scene-framework NpcDef) */
export interface NpcDialogProfile {
  npcId: string
  name: string
  personality: string
  knowledge: string[]
  dialogueStyle: string
  /** Optional monster reference for stat-based responses */
  monsterRef?: string
}

/** A single message in an NPC conversation */
export interface NpcMessage {
  id: string
  conversationId: string
  role: 'player' | 'npc' | 'system'
  content: string
  /** GM approval status — only relevant for role: 'npc' */
  status: 'pending' | 'approved' | 'edited' | 'rejected'
  /** If edited, the original AI-generated text */
  originalContent?: string
  createdAt: string
}

/** Full NPC conversation record */
export interface NpcConversation {
  id: string
  sessionId: string
  npcId: string
  playerId: string
  messages: NpcMessage[]
  createdAt: string
  updatedAt: string
}

/** Request to generate an NPC response */
export interface NpcDialogRequest {
  sessionId: string
  npcId: string
  playerMessage: string
}

/** Response from the NPC dialog generation service */
export interface NpcDialogResponse {
  messageId: string
  conversationId: string
  npcMessage: string
  status: 'pending'
}

/** GM approval action */
export interface NpcApprovalAction {
  messageId: string
  action: 'approve' | 'edit' | 'reject'
  /** Required when action is 'edit' */
  editedContent?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/types.ts
git commit -m "feat(ai-services): add NPC dialog types"
```

---

### Task 2: NPC Conversation Context Builder

**Files:**
- Create: `packages/ai-services/src/prompts/npc-dialog.ts`

- [ ] **Step 1: Build the system prompt generator**

`packages/ai-services/src/prompts/npc-dialog.ts`:
```ts
import type { NpcDialogProfile, NpcMessage } from '../types'

/**
 * Builds a system prompt for Claude that embodies the NPC's personality,
 * knowledge, and dialogue style. This is the core of the dialog engine —
 * the prompt shapes every response the NPC gives.
 */
export function buildNpcSystemPrompt(npc: NpcDialogProfile): string {
  return `You are roleplaying as "${npc.name}", an NPC in a Pathfinder 2nd Edition tabletop game.

CHARACTER DEFINITION:
- Personality: ${npc.personality}
- Dialogue Style: ${npc.dialogueStyle}
${npc.monsterRef ? `- Creature Type: ${npc.monsterRef}` : ''}

KNOWLEDGE (things this NPC knows and can reveal through conversation):
${npc.knowledge.map((k, i) => `${i + 1}. ${k}`).join('\n')}

RULES:
- Stay completely in character at all times. Never break the fourth wall.
- Match the dialogue style exactly — vocabulary, grammar, speech patterns.
- Only reveal knowledge naturally through conversation. Do not dump all information at once.
- If asked about something outside your knowledge, respond in-character (deflect, express ignorance, speculate based on personality).
- Keep responses concise — 1-3 sentences for casual exchanges, up to a short paragraph for important reveals.
- Never reference game mechanics, dice, or rules. Speak as a living person in this world.
- React emotionally according to your personality when appropriate.
- If threatened or intimidated, respond according to your personality (cowardly NPCs cower, brave ones stand firm, etc.).

RESPONSE FORMAT:
Respond ONLY with the NPC's spoken dialogue and brief action descriptions in asterisks.
Example: *leans forward nervously* "I wouldn't go down that road if I were you, stranger."

Do not include any out-of-character commentary or explanations.`
}

/**
 * Converts conversation history into Claude message format.
 * Only includes approved/edited messages — pending and rejected messages are excluded.
 */
export function buildConversationMessages(
  messages: NpcMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter(
      (m) =>
        m.role === 'player' ||
        (m.role === 'npc' && (m.status === 'approved' || m.status === 'edited'))
    )
    .map((m) => ({
      role: m.role === 'player' ? ('user' as const) : ('assistant' as const),
      content: m.role === 'npc' && m.status === 'edited'
        ? m.content // Use edited content
        : m.content,
    }))
}

/**
 * Builds a context preamble that the GM can optionally inject to steer
 * the NPC's next response (e.g., "The NPC is nervous because guards are nearby").
 */
export function buildGmContextInjection(gmHint: string): string {
  return `[GM CONTEXT — not visible to the player, use this to inform your response: ${gmHint}]`
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/prompts/npc-dialog.ts
git commit -m "feat(ai-services): add NPC conversation context builder"
```

---

### Task 3: NPC Response Generation Service

**Files:**
- Create: `packages/ai-services/src/services/npc-dialog.ts`

- [ ] **Step 1: Create the dialog generation service**

`packages/ai-services/src/services/npc-dialog.ts`:
```ts
import { getAnthropicClient } from '../client'
import {
  buildNpcSystemPrompt,
  buildConversationMessages,
  buildGmContextInjection,
} from '../prompts/npc-dialog'
import type { NpcDialogProfile, NpcMessage } from '../types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 512

export interface GenerateNpcResponseParams {
  npc: NpcDialogProfile
  conversationHistory: NpcMessage[]
  playerMessage: string
  /** Optional GM hint to steer the response */
  gmHint?: string
}

export interface GenerateNpcResponseResult {
  npcResponse: string
  inputTokens: number
  outputTokens: number
}

/**
 * Generates an NPC dialog response using Claude.
 * The response is NOT shown to the player — it goes to the GM for approval first.
 */
export async function generateNpcResponse(
  params: GenerateNpcResponseParams
): Promise<GenerateNpcResponseResult> {
  const client = getAnthropicClient()
  const systemPrompt = buildNpcSystemPrompt(params.npc)

  // Build message history from approved messages
  const history = buildConversationMessages(params.conversationHistory)

  // Add the new player message
  const messages = [
    ...history,
    { role: 'user' as const, content: params.playerMessage },
  ]

  // If GM provided a hint, prepend it as a system-level injection
  // by appending to the system prompt
  let fullSystemPrompt = systemPrompt
  if (params.gmHint) {
    fullSystemPrompt += '\n\n' + buildGmContextInjection(params.gmHint)
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: fullSystemPrompt,
    messages,
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude for NPC dialog')
  }

  return {
    npcResponse: textBlock.text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/services/npc-dialog.ts
git commit -m "feat(ai-services): add NPC response generation service"
```

---

### Task 4: Export New NPC Dialog API

**Files:**
- Modify: `packages/ai-services/src/index.ts`

- [ ] **Step 1: Add exports**

Append to `packages/ai-services/src/index.ts`:
```ts
// NPC Dialog
export { generateNpcResponse } from './services/npc-dialog'
export type { GenerateNpcResponseParams, GenerateNpcResponseResult } from './services/npc-dialog'
export {
  buildNpcSystemPrompt,
  buildConversationMessages,
  buildGmContextInjection,
} from './prompts/npc-dialog'
export type {
  NpcDialogProfile,
  NpcMessage,
  NpcConversation,
  NpcDialogRequest,
  NpcDialogResponse,
  NpcApprovalAction,
} from './types'
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/index.ts
git commit -m "feat(ai-services): export NPC dialog public API"
```

---

### Task 5: Database Migration for NPC Conversations

**Files:**
- Create: `supabase/migrations/00004_npc_conversations.sql`

- [ ] **Step 1: Create migration**

`supabase/migrations/00004_npc_conversations.sql`:
```sql
-- ============================================================
-- NPC Conversations (AI Dialog Engine)
-- ============================================================

-- NPC Conversations: tracks an ongoing dialog between a player and an NPC
create table public.npc_conversations (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  npc_id text not null,
  player_id uuid not null references public.profiles(id) on delete cascade,
  npc_name text not null,
  npc_profile jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, npc_id, player_id)
);

alter table public.npc_conversations enable row level security;
alter publication supabase_realtime add table public.npc_conversations;

-- Campaign members can view conversations in their session
create policy "Campaign members can view NPC conversations"
  on public.npc_conversations for select
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      left join public.campaign_members cm on cm.campaign_id = c.id
      where s.id = npc_conversations.session_id
      and (c.gm_id = auth.uid() or cm.user_id = auth.uid())
    )
  );

-- Players can start conversations (insert)
create policy "Players can start NPC conversations"
  on public.npc_conversations for insert
  with check (player_id = auth.uid());

-- GMs can manage all conversations in their campaigns
create policy "GMs can manage NPC conversations"
  on public.npc_conversations for all
  using (
    exists (
      select 1 from public.sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = npc_conversations.session_id
      and c.gm_id = auth.uid()
    )
  );

-- NPC Messages: individual messages within a conversation
create table public.npc_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.npc_conversations(id) on delete cascade,
  role text not null check (role in ('player', 'npc', 'system')),
  content text not null,
  status text not null default 'approved'
    check (status in ('pending', 'approved', 'edited', 'rejected')),
  original_content text,
  token_count_input integer,
  token_count_output integer,
  created_at timestamptz not null default now()
);

alter table public.npc_messages enable row level security;
alter publication supabase_realtime add table public.npc_messages;

-- Campaign members can view approved messages in their session
create policy "Campaign members can view approved NPC messages"
  on public.npc_messages for select
  using (
    exists (
      select 1 from public.npc_conversations nc
      join public.sessions s on s.id = nc.session_id
      join public.campaigns c on c.id = s.campaign_id
      left join public.campaign_members cm on cm.campaign_id = c.id
      where nc.id = npc_messages.conversation_id
      and (c.gm_id = auth.uid() or cm.user_id = auth.uid())
    )
    and (
      -- GMs see all messages (including pending)
      exists (
        select 1 from public.npc_conversations nc
        join public.sessions s on s.id = nc.session_id
        join public.campaigns c on c.id = s.campaign_id
        where nc.id = npc_messages.conversation_id
        and c.gm_id = auth.uid()
      )
      -- Players only see approved/edited messages and their own player messages
      or status in ('approved', 'edited')
      or (role = 'player' and exists (
        select 1 from public.npc_conversations nc
        where nc.id = npc_messages.conversation_id
        and nc.player_id = auth.uid()
      ))
    )
  );

-- Players can insert their own messages
create policy "Players can send messages"
  on public.npc_messages for insert
  with check (
    role = 'player'
    and exists (
      select 1 from public.npc_conversations nc
      where nc.id = npc_messages.conversation_id
      and nc.player_id = auth.uid()
    )
  );

-- GMs can insert and update messages (for AI responses and approval)
create policy "GMs can manage NPC messages"
  on public.npc_messages for all
  using (
    exists (
      select 1 from public.npc_conversations nc
      join public.sessions s on s.id = nc.session_id
      join public.campaigns c on c.id = s.campaign_id
      where nc.id = npc_messages.conversation_id
      and c.gm_id = auth.uid()
    )
  );

-- Index for fast conversation message lookups
create index idx_npc_messages_conversation_id on public.npc_messages(conversation_id);
create index idx_npc_messages_status on public.npc_messages(status) where status = 'pending';
create index idx_npc_conversations_session_id on public.npc_conversations(session_id);

-- Updated-at trigger for conversations
create trigger set_npc_conversations_updated_at
  before update on public.npc_conversations
  for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/00004_npc_conversations.sql
git commit -m "feat(db): add NPC conversations and messages tables"
```

---

### Task 6: Game Runtime Integration — NPC Dialog Events

**Files:**
- Modify: `packages/game-runtime/src/types.ts`
- Modify: `packages/game-runtime/src/events.ts`
- Create: `packages/game-runtime/src/npc-dialog.ts`

- [ ] **Step 1: Add NPC dialog event types**

In `packages/game-runtime/src/types.ts`, add to the `GameEventType` union:
```ts
export type GameEventType =
  | 'mode_change'
  | 'encounter_start'
  | 'encounter_end'
  | 'initiative_rolled'
  | 'turn_start'
  | 'turn_end'
  | 'action_performed'
  | 'token_moved'
  | 'token_added'
  | 'token_removed'
  | 'damage_dealt'
  | 'healing_applied'
  | 'condition_added'
  | 'condition_removed'
  | 'round_start'
  | 'npc_dialog_started'
  | 'npc_dialog_message'
  | 'npc_dialog_approved'
  | 'npc_dialog_rejected'
  | 'npc_dialog_ended'
```

- [ ] **Step 2: Add format cases in events.ts**

In `packages/game-runtime/src/events.ts`, add cases to `formatEventAsText`:
```ts
    case 'npc_dialog_started':
      return `${event.data.playerName} started talking to ${event.data.npcName}`

    case 'npc_dialog_message':
      return `${event.data.senderName}: "${(event.data.content as string).slice(0, 80)}${(event.data.content as string).length > 80 ? '...' : ''}"`

    case 'npc_dialog_approved':
      return `GM approved ${event.data.npcName}'s response`

    case 'npc_dialog_rejected':
      return `GM rejected ${event.data.npcName}'s response`

    case 'npc_dialog_ended':
      return `Conversation with ${event.data.npcName} ended`
```

- [ ] **Step 3: Create NPC dialog game actions**

`packages/game-runtime/src/npc-dialog.ts`:
```ts
import { createEvent } from './events.js'
import type { GameEvent } from './types.js'

export interface StartDialogParams {
  npcId: string
  npcName: string
  playerId: string
  playerName: string
}

export interface DialogMessageParams {
  npcId: string
  senderName: string
  senderRole: 'player' | 'npc'
  content: string
}

export interface ApproveDialogParams {
  npcId: string
  npcName: string
  messageId: string
  edited: boolean
}

export interface RejectDialogParams {
  npcId: string
  npcName: string
  messageId: string
  reason?: string
}

export interface EndDialogParams {
  npcId: string
  npcName: string
  playerId: string
  playerName: string
}

/** Create event when a player initiates dialog with an NPC */
export function startNpcDialog(params: StartDialogParams): GameEvent {
  return createEvent('npc_dialog_started', {
    npcId: params.npcId,
    npcName: params.npcName,
    playerId: params.playerId,
    playerName: params.playerName,
  })
}

/** Create event when a message is sent in an NPC dialog */
export function npcDialogMessage(params: DialogMessageParams): GameEvent {
  return createEvent('npc_dialog_message', {
    npcId: params.npcId,
    senderName: params.senderName,
    senderRole: params.senderRole,
    content: params.content,
  })
}

/** Create event when GM approves an NPC response */
export function approveNpcDialog(params: ApproveDialogParams): GameEvent {
  return createEvent('npc_dialog_approved', {
    npcId: params.npcId,
    npcName: params.npcName,
    messageId: params.messageId,
    edited: params.edited,
  })
}

/** Create event when GM rejects an NPC response */
export function rejectNpcDialog(params: RejectDialogParams): GameEvent {
  return createEvent('npc_dialog_rejected', {
    npcId: params.npcId,
    npcName: params.npcName,
    messageId: params.messageId,
    reason: params.reason,
  })
}

/** Create event when a dialog conversation ends */
export function endNpcDialog(params: EndDialogParams): GameEvent {
  return createEvent('npc_dialog_ended', {
    npcId: params.npcId,
    npcName: params.npcName,
    playerId: params.playerId,
    playerName: params.playerName,
  })
}
```

- [ ] **Step 4: Export from game-runtime index**

Add to `packages/game-runtime/src/index.ts`:
```ts
export {
  startNpcDialog,
  npcDialogMessage,
  approveNpcDialog,
  rejectNpcDialog,
  endNpcDialog,
} from './npc-dialog.js'
export type {
  StartDialogParams,
  DialogMessageParams,
  ApproveDialogParams,
  RejectDialogParams,
  EndDialogParams,
} from './npc-dialog.js'
```

- [ ] **Step 5: Commit**

```bash
git add packages/game-runtime/src/types.ts packages/game-runtime/src/events.ts packages/game-runtime/src/npc-dialog.ts packages/game-runtime/src/index.ts
git commit -m "feat(game-runtime): add NPC dialog events and game actions"
```

---

### Task 7: API Routes for NPC Dialog

**Files:**
- Create: `apps/web/app/api/ai/npc-dialog/route.ts`
- Create: `apps/web/app/api/ai/npc-dialog/approve/route.ts`

- [ ] **Step 1: Create dialog generation endpoint**

`apps/web/app/api/ai/npc-dialog/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateNpcResponse } from '@dndmanager/ai-services'
import type { NpcDialogProfile, NpcMessage } from '@dndmanager/ai-services'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    sessionId: string
    npcId: string
    playerMessage: string
    npcProfile: NpcDialogProfile
    gmHint?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.sessionId || !body.npcId || !body.playerMessage?.trim()) {
    return NextResponse.json(
      { error: 'sessionId, npcId, and playerMessage are required' },
      { status: 400 }
    )
  }

  if (body.playerMessage.length > 1000) {
    return NextResponse.json(
      { error: 'Message must be under 1000 characters' },
      { status: 400 }
    )
  }

  try {
    // Get or create conversation
    let { data: conversation } = await supabase
      .from('npc_conversations')
      .select('id')
      .eq('session_id', body.sessionId)
      .eq('npc_id', body.npcId)
      .eq('player_id', user.id)
      .single()

    if (!conversation) {
      const { data: newConv, error: createErr } = await supabase
        .from('npc_conversations')
        .insert({
          session_id: body.sessionId,
          npc_id: body.npcId,
          player_id: user.id,
          npc_name: body.npcProfile.name,
          npc_profile: body.npcProfile,
        })
        .select('id')
        .single()

      if (createErr) throw createErr
      conversation = newConv
    }

    // Save player message
    await supabase.from('npc_messages').insert({
      conversation_id: conversation.id,
      role: 'player',
      content: body.playerMessage.trim(),
      status: 'approved',
    })

    // Fetch conversation history
    const { data: history } = await supabase
      .from('npc_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })

    const messages: NpcMessage[] = (history ?? []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      conversationId: m.conversation_id as string,
      role: m.role as 'player' | 'npc' | 'system',
      content: m.content as string,
      status: m.status as 'pending' | 'approved' | 'edited' | 'rejected',
      originalContent: m.original_content as string | undefined,
      createdAt: m.created_at as string,
    }))

    // Generate NPC response
    const result = await generateNpcResponse({
      npc: body.npcProfile,
      conversationHistory: messages,
      playerMessage: body.playerMessage.trim(),
      gmHint: body.gmHint,
    })

    // Save NPC response as pending (needs GM approval)
    const { data: npcMsg, error: msgErr } = await supabase
      .from('npc_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'npc',
        content: result.npcResponse,
        status: 'pending',
        token_count_input: result.inputTokens,
        token_count_output: result.outputTokens,
      })
      .select('id')
      .single()

    if (msgErr) throw msgErr

    return NextResponse.json({
      messageId: npcMsg.id,
      conversationId: conversation.id,
      npcMessage: result.npcResponse,
      status: 'pending',
    })
  } catch (error) {
    console.error('NPC dialog error:', error)
    return NextResponse.json(
      { error: 'Failed to generate NPC response. Please try again.' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Create GM approval endpoint**

`apps/web/app/api/ai/npc-dialog/approve/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    messageId: string
    action: 'approve' | 'edit' | 'reject'
    editedContent?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.messageId || !body.action) {
    return NextResponse.json(
      { error: 'messageId and action are required' },
      { status: 400 }
    )
  }

  if (body.action === 'edit' && !body.editedContent?.trim()) {
    return NextResponse.json(
      { error: 'editedContent is required when action is edit' },
      { status: 400 }
    )
  }

  try {
    // Verify the message exists and is pending
    const { data: message, error: fetchErr } = await supabase
      .from('npc_messages')
      .select('id, content, status, conversation_id')
      .eq('id', body.messageId)
      .single()

    if (fetchErr || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    if (message.status !== 'pending') {
      return NextResponse.json(
        { error: 'Message has already been reviewed' },
        { status: 409 }
      )
    }

    // Verify caller is the GM for this session
    const { data: conv } = await supabase
      .from('npc_conversations')
      .select('session_id')
      .eq('id', message.conversation_id)
      .single()

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('campaign_id')
      .eq('id', conv.session_id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('gm_id')
      .eq('id', session.campaign_id)
      .single()

    if (!campaign || campaign.gm_id !== user.id) {
      return NextResponse.json({ error: 'Only the GM can approve NPC messages' }, { status: 403 })
    }

    // Apply the action
    let updateData: Record<string, unknown>

    switch (body.action) {
      case 'approve':
        updateData = { status: 'approved' }
        break
      case 'edit':
        updateData = {
          status: 'edited',
          original_content: message.content,
          content: body.editedContent!.trim(),
        }
        break
      case 'reject':
        updateData = { status: 'rejected' }
        break
    }

    const { error: updateErr } = await supabase
      .from('npc_messages')
      .update(updateData)
      .eq('id', body.messageId)

    if (updateErr) throw updateErr

    return NextResponse.json({
      messageId: body.messageId,
      action: body.action,
      status: body.action === 'edit' ? 'edited' : body.action === 'approve' ? 'approved' : 'rejected',
    })
  } catch (error) {
    console.error('NPC approval error:', error)
    return NextResponse.json(
      { error: 'Failed to process approval. Please try again.' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/ai/npc-dialog/route.ts apps/web/app/api/ai/npc-dialog/approve/route.ts
git commit -m "feat(web): add NPC dialog API routes with GM approval"
```

---

### Task 8: Zustand Store for NPC Dialog State

**Files:**
- Create: `apps/web/lib/stores/npc-dialog-store.ts`

- [ ] **Step 1: Create the dialog store**

`apps/web/lib/stores/npc-dialog-store.ts`:
```ts
import { create } from 'zustand'
import type { NpcMessage, NpcDialogProfile, NpcDialogResponse } from '@dndmanager/ai-services'

interface NpcDialogState {
  /** Currently active conversation ID (null if no dialog open) */
  activeConversationId: string | null
  /** NPC we're currently talking to */
  activeNpc: NpcDialogProfile | null
  /** All messages in the current conversation */
  messages: NpcMessage[]
  /** Whether we're waiting for AI to generate a response */
  isGenerating: boolean
  /** Whether we're waiting for GM approval */
  isPendingApproval: boolean
  /** Error message if something went wrong */
  error: string | null

  // Actions
  openDialog: (npc: NpcDialogProfile, conversationId?: string) => void
  closeDialog: () => void
  setMessages: (messages: NpcMessage[]) => void
  addMessage: (message: NpcMessage) => void
  updateMessage: (messageId: string, updates: Partial<NpcMessage>) => void
  sendPlayerMessage: (sessionId: string, message: string) => Promise<void>
  setGenerating: (generating: boolean) => void
  setPendingApproval: (pending: boolean) => void
  setError: (error: string | null) => void
}

export const useNpcDialogStore = create<NpcDialogState>((set, get) => ({
  activeConversationId: null,
  activeNpc: null,
  messages: [],
  isGenerating: false,
  isPendingApproval: false,
  error: null,

  openDialog: (npc, conversationId) =>
    set({
      activeNpc: npc,
      activeConversationId: conversationId ?? null,
      messages: [],
      error: null,
    }),

  closeDialog: () =>
    set({
      activeConversationId: null,
      activeNpc: null,
      messages: [],
      isGenerating: false,
      isPendingApproval: false,
      error: null,
    }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
    })),

  sendPlayerMessage: async (sessionId, message) => {
    const { activeNpc, activeConversationId } = get()
    if (!activeNpc) return

    set({ isGenerating: true, error: null })

    // Optimistically add the player message
    const optimisticMsg: NpcMessage = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversationId ?? '',
      role: 'player',
      content: message,
      status: 'approved',
      createdAt: new Date().toISOString(),
    }
    set((state) => ({ messages: [...state.messages, optimisticMsg] }))

    try {
      const res = await fetch('/api/ai/npc-dialog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          npcId: activeNpc.npcId,
          playerMessage: message,
          npcProfile: activeNpc,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to send message')
      }

      const data: NpcDialogResponse = await res.json()

      // Update conversation ID if this was the first message
      if (!activeConversationId) {
        set({ activeConversationId: data.conversationId })
      }

      // NPC response is pending GM approval — player sees a "waiting" state
      set({ isGenerating: false, isPendingApproval: true })
    } catch (error) {
      set({
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Something went wrong',
      })
    }
  },

  setGenerating: (generating) => set({ isGenerating: generating }),
  setPendingApproval: (pending) => set({ isPendingApproval: pending }),
  setError: (error) => set({ error }),
}))
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/stores/npc-dialog-store.ts
git commit -m "feat(web): add Zustand store for NPC dialog state"
```

---

### Task 9: GM Approval UI Component

**Files:**
- Create: `apps/web/components/gm/NpcApprovalPanel.tsx`

- [ ] **Step 1: Build the approval panel**

`apps/web/components/gm/NpcApprovalPanel.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface PendingMessage {
  id: string
  conversation_id: string
  content: string
  created_at: string
  npc_name: string
  player_name: string
  npc_id: string
}

interface NpcApprovalPanelProps {
  sessionId: string
}

export function NpcApprovalPanel({ sessionId }: NpcApprovalPanelProps) {
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch pending messages and subscribe to realtime updates
  useEffect(() => {
    const fetchPending = async () => {
      const { data } = await supabase
        .from('npc_messages')
        .select(`
          id,
          conversation_id,
          content,
          created_at,
          npc_conversations!inner (
            npc_name,
            npc_id,
            session_id,
            profiles!npc_conversations_player_id_fkey ( display_name )
          )
        `)
        .eq('status', 'pending')
        .eq('role', 'npc')
        .eq('npc_conversations.session_id', sessionId)
        .order('created_at', { ascending: true })

      if (data) {
        setPendingMessages(
          data.map((m: Record<string, unknown>) => {
            const conv = m.npc_conversations as Record<string, unknown>
            const profile = conv.profiles as Record<string, unknown>
            return {
              id: m.id as string,
              conversation_id: m.conversation_id as string,
              content: m.content as string,
              created_at: m.created_at as string,
              npc_name: conv.npc_name as string,
              npc_id: conv.npc_id as string,
              player_name: profile.display_name as string,
            }
          })
        )
      }
    }

    fetchPending()

    // Subscribe to new pending messages
    const channel = supabase
      .channel(`npc-approval-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'npc_messages',
          filter: `status=eq.pending`,
        },
        () => {
          fetchPending()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, supabase])

  const handleAction = async (
    messageId: string,
    action: 'approve' | 'edit' | 'reject'
  ) => {
    setProcessing(messageId)
    try {
      const res = await fetch('/api/ai/npc-dialog/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          action,
          editedContent: action === 'edit' ? editText : undefined,
        }),
      })

      if (res.ok) {
        setPendingMessages((prev) => prev.filter((m) => m.id !== messageId))
        setEditingId(null)
        setEditText('')
      }
    } finally {
      setProcessing(null)
    }
  }

  if (pendingMessages.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        NPC Responses Pending Approval
      </h3>
      {pendingMessages.map((msg) => (
        <Card key={msg.id} className="p-4 border-amber-500/50 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">{msg.npc_name}</span>
            <span className="text-xs text-muted-foreground">
              responding to {msg.player_name}
            </span>
          </div>

          {editingId === msg.id ? (
            <textarea
              className="w-full min-h-[80px] p-2 rounded border bg-background text-sm resize-y"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
          ) : (
            <p className="text-sm mb-3 whitespace-pre-wrap italic">
              &ldquo;{msg.content}&rdquo;
            </p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={processing === msg.id}
              onClick={() =>
                editingId === msg.id
                  ? handleAction(msg.id, 'edit')
                  : handleAction(msg.id, 'approve')
              }
            >
              {editingId === msg.id ? 'Save Edit' : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={processing === msg.id}
              onClick={() => {
                if (editingId === msg.id) {
                  setEditingId(null)
                  setEditText('')
                } else {
                  setEditingId(msg.id)
                  setEditText(msg.content)
                }
              }}
            >
              {editingId === msg.id ? 'Cancel' : 'Edit'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={processing === msg.id}
              onClick={() => handleAction(msg.id, 'reject')}
            >
              Reject
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/gm/NpcApprovalPanel.tsx
git commit -m "feat(web): add GM NPC approval panel component"
```

---

### Task 10: Player Dialog UI Components

**Files:**
- Create: `apps/web/components/game/dialog/NpcDialogBubble.tsx`
- Create: `apps/web/components/game/dialog/NpcDialogInput.tsx`
- Create: `apps/web/components/game/dialog/NpcDialogPanel.tsx`

- [ ] **Step 1: Create message bubble component**

`apps/web/components/game/dialog/NpcDialogBubble.tsx`:
```tsx
'use client'

import { cn } from '@/lib/utils'
import type { NpcMessage } from '@dndmanager/ai-services'

interface NpcDialogBubbleProps {
  message: NpcMessage
  npcName: string
}

export function NpcDialogBubble({ message, npcName }: NpcDialogBubbleProps) {
  const isPlayer = message.role === 'player'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="text-center text-xs text-muted-foreground italic py-1">
        {message.content}
      </div>
    )
  }

  return (
    <div
      className={cn('flex flex-col gap-1 max-w-[80%]', {
        'self-end items-end': isPlayer,
        'self-start items-start': !isPlayer,
      })}
    >
      <span className="text-xs text-muted-foreground font-medium">
        {isPlayer ? 'You' : npcName}
      </span>
      <div
        className={cn('rounded-lg px-3 py-2 text-sm', {
          'bg-primary text-primary-foreground': isPlayer,
          'bg-muted': !isPlayer,
        })}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create message input component**

`apps/web/components/game/dialog/NpcDialogInput.tsx`:
```tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface NpcDialogInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function NpcDialogInput({
  onSend,
  disabled = false,
  placeholder = 'Say something...',
}: NpcDialogInputProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    inputRef.current?.focus()
  }, [text, disabled, onSend])

  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={1000}
        className="flex-1"
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        size="sm"
      >
        Send
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: Create main dialog panel**

`apps/web/components/game/dialog/NpcDialogPanel.tsx`:
```tsx
'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNpcDialogStore } from '@/lib/stores/npc-dialog-store'
import { NpcDialogBubble } from './NpcDialogBubble'
import { NpcDialogInput } from './NpcDialogInput'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { NpcMessage } from '@dndmanager/ai-services'

interface NpcDialogPanelProps {
  sessionId: string
}

export function NpcDialogPanel({ sessionId }: NpcDialogPanelProps) {
  const {
    activeNpc,
    activeConversationId,
    messages,
    isGenerating,
    isPendingApproval,
    error,
    sendPlayerMessage,
    addMessage,
    updateMessage,
    setPendingApproval,
    closeDialog,
    setMessages,
  } = useNpcDialogStore()

  const scrollRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  // Subscribe to message updates (for when GM approves/edits)
  useEffect(() => {
    if (!activeConversationId) return

    const channel = supabase
      .channel(`npc-dialog-${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'npc_messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const m = payload.new as Record<string, unknown>
          // Only add if it's a visible message (approved/edited npc, or player)
          const status = m.status as string
          const role = m.role as string
          if (role === 'player' || status === 'approved' || status === 'edited') {
            const msg: NpcMessage = {
              id: m.id as string,
              conversationId: m.conversation_id as string,
              role: role as 'player' | 'npc' | 'system',
              content: m.content as string,
              status: status as 'pending' | 'approved' | 'edited' | 'rejected',
              originalContent: m.original_content as string | undefined,
              createdAt: m.created_at as string,
            }
            addMessage(msg)
            if (role === 'npc') {
              setPendingApproval(false)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'npc_messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const m = payload.new as Record<string, unknown>
          const status = m.status as string
          const role = m.role as string

          if (status === 'approved' || status === 'edited') {
            // Message was approved — add it to visible messages
            const msg: NpcMessage = {
              id: m.id as string,
              conversationId: m.conversation_id as string,
              role: role as 'player' | 'npc' | 'system',
              content: m.content as string,
              status: status as 'approved' | 'edited',
              originalContent: m.original_content as string | undefined,
              createdAt: m.created_at as string,
            }
            // Check if we already have this message
            const existing = messages.find((em) => em.id === msg.id)
            if (existing) {
              updateMessage(msg.id, msg)
            } else {
              addMessage(msg)
            }
            setPendingApproval(false)
          } else if (status === 'rejected') {
            setPendingApproval(false)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConversationId, supabase, addMessage, updateMessage, setPendingApproval, messages])

  // Load existing conversation messages when dialog opens
  useEffect(() => {
    if (!activeConversationId) return

    const loadMessages = async () => {
      const { data } = await supabase
        .from('npc_messages')
        .select('*')
        .eq('conversation_id', activeConversationId)
        .in('status', ['approved', 'edited'])
        .order('created_at', { ascending: true })

      if (data) {
        setMessages(
          data.map((m: Record<string, unknown>) => ({
            id: m.id as string,
            conversationId: m.conversation_id as string,
            role: m.role as 'player' | 'npc' | 'system',
            content: m.content as string,
            status: m.status as 'approved' | 'edited',
            originalContent: m.original_content as string | undefined,
            createdAt: m.created_at as string,
          }))
        )
      }
    }

    loadMessages()
  }, [activeConversationId, supabase, setMessages])

  if (!activeNpc) return null

  // Filter to only show approved/edited NPC messages and all player messages
  const visibleMessages = messages.filter(
    (m) =>
      m.role === 'player' ||
      m.role === 'system' ||
      m.status === 'approved' ||
      m.status === 'edited'
  )

  return (
    <Card className="flex flex-col w-80 h-96 border shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div>
          <h3 className="font-semibold text-sm">{activeNpc.name}</h3>
          <p className="text-xs text-muted-foreground">In conversation</p>
        </div>
        <Button variant="ghost" size="sm" onClick={closeDialog}>
          Close
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-3"
      >
        {visibleMessages.map((msg) => (
          <NpcDialogBubble
            key={msg.id}
            message={msg}
            npcName={activeNpc.name}
          />
        ))}

        {isGenerating && (
          <div className="self-start text-xs text-muted-foreground italic">
            {activeNpc.name} is thinking...
          </div>
        )}

        {isPendingApproval && !isGenerating && (
          <div className="self-start text-xs text-muted-foreground italic">
            Waiting for GM approval...
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-1 text-xs text-destructive">{error}</div>
      )}

      {/* Input */}
      <div className="p-3 border-t">
        <NpcDialogInput
          onSend={(message) => sendPlayerMessage(sessionId, message)}
          disabled={isGenerating || isPendingApproval}
          placeholder={`Talk to ${activeNpc.name}...`}
        />
      </div>
    </Card>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/game/dialog/NpcDialogBubble.tsx apps/web/components/game/dialog/NpcDialogInput.tsx apps/web/components/game/dialog/NpcDialogPanel.tsx
git commit -m "feat(web): add player NPC dialog UI components"
```

---

### Task 11: Unit Tests

**Files:**
- Create: `packages/ai-services/__tests__/prompts/npc-dialog.test.ts`
- Create: `packages/game-runtime/src/__tests__/npc-dialog.test.ts`
- Create: `apps/web/__tests__/npc-dialog-store.test.ts`

- [ ] **Step 1: Test the context builder**

`packages/ai-services/__tests__/prompts/npc-dialog.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  buildNpcSystemPrompt,
  buildConversationMessages,
  buildGmContextInjection,
} from '../../src/prompts/npc-dialog'
import type { NpcDialogProfile, NpcMessage } from '../../src/types'

const goblinBoss: NpcDialogProfile = {
  npcId: 'goblin-boss',
  name: 'Grukk',
  personality: 'Feige aber laut. Versteckt sich hinter seinen Schergen.',
  knowledge: [
    'Hat den Handelskarren ueberfallen',
    'Hat 6 Goblins unter seinem Kommando',
    'Fuerchtet Feuer',
  ],
  dialogueStyle: 'Kreischt und droht in gebrochenem Common',
  monsterRef: 'pf2e:goblin-warrior',
}

describe('buildNpcSystemPrompt', () => {
  it('includes NPC personality in the prompt', () => {
    const prompt = buildNpcSystemPrompt(goblinBoss)
    expect(prompt).toContain('Feige aber laut')
  })

  it('includes all knowledge items', () => {
    const prompt = buildNpcSystemPrompt(goblinBoss)
    expect(prompt).toContain('Hat den Handelskarren ueberfallen')
    expect(prompt).toContain('Hat 6 Goblins unter seinem Kommando')
    expect(prompt).toContain('Fuerchtet Feuer')
  })

  it('includes dialogue style', () => {
    const prompt = buildNpcSystemPrompt(goblinBoss)
    expect(prompt).toContain('Kreischt und droht in gebrochenem Common')
  })

  it('includes monster reference when provided', () => {
    const prompt = buildNpcSystemPrompt(goblinBoss)
    expect(prompt).toContain('pf2e:goblin-warrior')
  })

  it('omits monster reference when not provided', () => {
    const npcWithoutMonster = { ...goblinBoss, monsterRef: undefined }
    const prompt = buildNpcSystemPrompt(npcWithoutMonster)
    expect(prompt).not.toContain('Creature Type')
  })

  it('includes roleplay rules', () => {
    const prompt = buildNpcSystemPrompt(goblinBoss)
    expect(prompt).toContain('Stay completely in character')
    expect(prompt).toContain('Never break the fourth wall')
  })
})

describe('buildConversationMessages', () => {
  const messages: NpcMessage[] = [
    {
      id: '1',
      conversationId: 'conv-1',
      role: 'player',
      content: 'Who are you?',
      status: 'approved',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      conversationId: 'conv-1',
      role: 'npc',
      content: '*growls* Me Grukk!',
      status: 'approved',
      createdAt: '2026-01-01T00:01:00Z',
    },
    {
      id: '3',
      conversationId: 'conv-1',
      role: 'npc',
      content: 'This was rejected',
      status: 'rejected',
      createdAt: '2026-01-01T00:02:00Z',
    },
    {
      id: '4',
      conversationId: 'conv-1',
      role: 'npc',
      content: 'GM edited this',
      status: 'edited',
      originalContent: 'Original AI text',
      createdAt: '2026-01-01T00:03:00Z',
    },
  ]

  it('includes player messages as user role', () => {
    const result = buildConversationMessages(messages)
    expect(result[0]).toEqual({ role: 'user', content: 'Who are you?' })
  })

  it('includes approved NPC messages as assistant role', () => {
    const result = buildConversationMessages(messages)
    expect(result[1]).toEqual({ role: 'assistant', content: '*growls* Me Grukk!' })
  })

  it('excludes rejected messages', () => {
    const result = buildConversationMessages(messages)
    expect(result.find((m) => m.content === 'This was rejected')).toBeUndefined()
  })

  it('includes edited messages with edited content', () => {
    const result = buildConversationMessages(messages)
    expect(result[2]).toEqual({ role: 'assistant', content: 'GM edited this' })
  })

  it('returns correct count (3 of 4 included)', () => {
    const result = buildConversationMessages(messages)
    expect(result).toHaveLength(3)
  })
})

describe('buildGmContextInjection', () => {
  it('wraps hint in GM context format', () => {
    const result = buildGmContextInjection('Guards are approaching')
    expect(result).toContain('GM CONTEXT')
    expect(result).toContain('Guards are approaching')
  })
})
```

- [ ] **Step 2: Test game runtime NPC dialog events**

`packages/game-runtime/src/__tests__/npc-dialog.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  startNpcDialog,
  npcDialogMessage,
  approveNpcDialog,
  rejectNpcDialog,
  endNpcDialog,
} from '../npc-dialog'
import { formatEventAsText } from '../events'

describe('NPC dialog events', () => {
  it('creates a start dialog event', () => {
    const event = startNpcDialog({
      npcId: 'goblin-boss',
      npcName: 'Grukk',
      playerId: 'player-1',
      playerName: 'Thorn',
    })
    expect(event.type).toBe('npc_dialog_started')
    expect(event.data.npcName).toBe('Grukk')
    expect(event.data.playerName).toBe('Thorn')
  })

  it('creates a message event', () => {
    const event = npcDialogMessage({
      npcId: 'goblin-boss',
      senderName: 'Thorn',
      senderRole: 'player',
      content: 'Who are you?',
    })
    expect(event.type).toBe('npc_dialog_message')
    expect(event.data.content).toBe('Who are you?')
  })

  it('creates an approval event', () => {
    const event = approveNpcDialog({
      npcId: 'goblin-boss',
      npcName: 'Grukk',
      messageId: 'msg-1',
      edited: false,
    })
    expect(event.type).toBe('npc_dialog_approved')
    expect(event.data.edited).toBe(false)
  })

  it('creates a rejection event', () => {
    const event = rejectNpcDialog({
      npcId: 'goblin-boss',
      npcName: 'Grukk',
      messageId: 'msg-1',
      reason: 'Out of character',
    })
    expect(event.type).toBe('npc_dialog_rejected')
    expect(event.data.reason).toBe('Out of character')
  })

  it('creates an end dialog event', () => {
    const event = endNpcDialog({
      npcId: 'goblin-boss',
      npcName: 'Grukk',
      playerId: 'player-1',
      playerName: 'Thorn',
    })
    expect(event.type).toBe('npc_dialog_ended')
  })

  it('formats dialog events as text', () => {
    const start = startNpcDialog({
      npcId: 'goblin-boss',
      npcName: 'Grukk',
      playerId: 'player-1',
      playerName: 'Thorn',
    })
    expect(formatEventAsText(start)).toBe('Thorn started talking to Grukk')
  })
})
```

- [ ] **Step 3: Test the Zustand store**

`apps/web/__tests__/npc-dialog-store.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useNpcDialogStore } from '../lib/stores/npc-dialog-store'
import type { NpcDialogProfile, NpcMessage } from '@dndmanager/ai-services'

const testNpc: NpcDialogProfile = {
  npcId: 'goblin-boss',
  name: 'Grukk',
  personality: 'Feige aber laut',
  knowledge: ['Hat den Handelskarren ueberfallen'],
  dialogueStyle: 'Kreischt in gebrochenem Common',
}

describe('useNpcDialogStore', () => {
  beforeEach(() => {
    useNpcDialogStore.setState({
      activeConversationId: null,
      activeNpc: null,
      messages: [],
      isGenerating: false,
      isPendingApproval: false,
      error: null,
    })
  })

  it('opens a dialog with an NPC', () => {
    useNpcDialogStore.getState().openDialog(testNpc, 'conv-1')
    const state = useNpcDialogStore.getState()
    expect(state.activeNpc?.npcId).toBe('goblin-boss')
    expect(state.activeConversationId).toBe('conv-1')
  })

  it('closes a dialog and resets state', () => {
    useNpcDialogStore.getState().openDialog(testNpc, 'conv-1')
    useNpcDialogStore.getState().closeDialog()
    const state = useNpcDialogStore.getState()
    expect(state.activeNpc).toBeNull()
    expect(state.activeConversationId).toBeNull()
    expect(state.messages).toEqual([])
  })

  it('adds a message', () => {
    const msg: NpcMessage = {
      id: '1',
      conversationId: 'conv-1',
      role: 'player',
      content: 'Hello',
      status: 'approved',
      createdAt: '2026-01-01T00:00:00Z',
    }
    useNpcDialogStore.getState().addMessage(msg)
    expect(useNpcDialogStore.getState().messages).toHaveLength(1)
    expect(useNpcDialogStore.getState().messages[0].content).toBe('Hello')
  })

  it('updates a message by ID', () => {
    const msg: NpcMessage = {
      id: '1',
      conversationId: 'conv-1',
      role: 'npc',
      content: 'Original',
      status: 'pending',
      createdAt: '2026-01-01T00:00:00Z',
    }
    useNpcDialogStore.getState().addMessage(msg)
    useNpcDialogStore.getState().updateMessage('1', {
      content: 'Edited',
      status: 'edited',
    })
    const updated = useNpcDialogStore.getState().messages[0]
    expect(updated.content).toBe('Edited')
    expect(updated.status).toBe('edited')
  })

  it('sets pending approval flag', () => {
    useNpcDialogStore.getState().setPendingApproval(true)
    expect(useNpcDialogStore.getState().isPendingApproval).toBe(true)
  })
})
```

- [ ] **Step 4: Commit**

```bash
git add packages/ai-services/__tests__/prompts/npc-dialog.test.ts packages/game-runtime/src/__tests__/npc-dialog.test.ts apps/web/__tests__/npc-dialog-store.test.ts
git commit -m "test: add NPC dialog engine unit tests"
```

---

### Task 12: Integration — Wire NPC Dialog into Game View

**Files:**
- Modify: `apps/web/app/(game)/play/[sessionId]/page.tsx`
- Modify: `apps/web/app/(gm)/dashboard/[sessionId]/page.tsx`

- [ ] **Step 1: Add NpcDialogPanel to player game view**

In `apps/web/app/(game)/play/[sessionId]/page.tsx`, import and add the dialog panel:

```ts
import { NpcDialogPanel } from '@/components/game/dialog/NpcDialogPanel'
```

Add inside the page layout, positioned as an overlay or sidebar panel:
```tsx
{/* NPC Dialog — shown when player clicks on an NPC token */}
<NpcDialogPanel sessionId={params.sessionId} />
```

- [ ] **Step 2: Add NpcApprovalPanel to GM dashboard**

In `apps/web/app/(gm)/dashboard/[sessionId]/page.tsx`, import and add the approval panel:

```ts
import { NpcApprovalPanel } from '@/components/gm/NpcApprovalPanel'
```

Add inside the GM sidebar/controls area:
```tsx
{/* NPC Approval Queue */}
<NpcApprovalPanel sessionId={params.sessionId} />
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(game\)/play/\[sessionId\]/page.tsx apps/web/app/\(gm\)/dashboard/\[sessionId\]/page.tsx
git commit -m "feat(web): integrate NPC dialog into game and GM views"
```
