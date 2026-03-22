# Phase 3.1: 3D Character Model Generation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Players describe their character in natural language and receive an AI-generated 3D GLB model. Claude optimizes the description into a Meshy API prompt, Meshy generates the model, and the GLB is stored in Supabase Storage. The R3F game view replaces cylinder token placeholders with actual 3D character models.

**Architecture:** The `@dndmanager/ai-services` package gains a Meshy API client (POST to create task, poll for completion, download GLB). Claude is used as a prompt optimizer — it transforms the player's character description + PF2e ancestry/class into an optimized Meshy prompt. The GLB is uploaded to Supabase Storage (`character-models` bucket) and the URL saved on the character record. The `TokenLayer` R3F component conditionally renders a GLTF model via `useGLTF` from `@react-three/drei` instead of the cylinder placeholder.

**Tech Stack:** @dndmanager/ai-services, Meshy API (meshy.ai), @anthropic-ai/sdk, @react-three/drei (useGLTF), @react-three/fiber, Supabase Storage, Next.js API routes, React, shadcn/ui

---

## File Structure

```
packages/ai-services/
├── src/
│   ├── index.ts                              → Add new exports
│   ├── types.ts                              → Add 3D generation types
│   ├── services/
│   │   ├── meshy-client.ts                   → Meshy API client (create, poll, download)
│   │   ├── meshy-client.mock.ts              → Mock client for testing without API key
│   │   └── model-prompt-optimizer.ts         → Claude prompt → optimized Meshy prompt
│   └── prompts/
│       └── model-generation.ts               → System prompt for 3D prompt optimization
├── __tests__/
│   ├── meshy-client.test.ts                  → Tests for Meshy client
│   └── model-prompt-optimizer.test.ts        → Tests for prompt optimizer

apps/web/
├── app/api/ai/model-generate/
│   └── route.ts                              → POST endpoint: trigger 3D generation
├── app/api/ai/model-status/
│   └── route.ts                              → GET endpoint: poll generation status
├── components/game/
│   ├── TokenLayer.tsx                        → Modify: conditionally load GLB model
│   ├── CharacterModel.tsx                    → GLB loader with useGLTF + fallback
│   └── ModelThumbnailRenderer.tsx            → Offscreen R3F canvas for thumbnail
├── components/character/
│   └── ModelGenerationPanel.tsx              → UI: trigger generation, progress, preview

supabase/
├── migrations/
│   └── 00004_character_model_fields.sql      → Add model_url, model_thumbnail_url, model_status to characters
```

---

### Task 1: Database Migration — Add Model Fields to Characters

**Files:**
- Create: `supabase/migrations/00004_character_model_fields.sql`

- [ ] **Step 1: Write migration**

`supabase/migrations/00004_character_model_fields.sql`:
```sql
-- Add 3D model fields to characters table
alter table public.characters
  add column model_url text,
  add column model_thumbnail_url text,
  add column model_status text not null default 'none'
    check (model_status in ('none', 'pending', 'processing', 'succeeded', 'failed'));

-- Create storage bucket for character models
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-models',
  'character-models',
  true,
  52428800, -- 50MB
  array['model/gltf-binary', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

-- Storage policies: owners can upload/update their character models
create policy "Character owners can upload models"
  on storage.objects for insert
  with check (
    bucket_id = 'character-models'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Character owners can update models"
  on storage.objects for update
  using (
    bucket_id = 'character-models'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Anyone can view character models"
  on storage.objects for select
  using (bucket_id = 'character-models');
```

- [ ] **Step 2: Apply migration locally**

```bash
pnpm supabase db reset
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/00004_character_model_fields.sql
git commit -m "feat(db): add model_url, model_thumbnail_url, model_status to characters"
```

---

### Task 2: 3D Generation Types

**Files:**
- Modify: `packages/ai-services/src/types.ts`

- [ ] **Step 1: Add 3D model generation types**

Append to `packages/ai-services/src/types.ts`:
```ts
// ─── 3D Model Generation ─────────────────────────────

/** Status of a Meshy generation task */
export type MeshyTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED'

/** Meshy API "Text to 3D" task creation request */
export interface MeshyCreateTaskRequest {
  mode: 'preview' | 'refine'
  prompt: string
  art_style: 'realistic' | 'cartoon' | 'low-poly' | 'sculpture' | 'pbr'
  negative_prompt?: string
  topology?: 'triangle' | 'quad'
  target_polycount?: number
}

/** Meshy API task response */
export interface MeshyTaskResponse {
  id: string
  model_urls: {
    glb: string
    fbx: string
    obj: string
    usdz: string
  }
  thumbnail_url: string
  prompt: string
  art_style: string
  negative_prompt: string
  status: MeshyTaskStatus
  created_at: number
  started_at: number
  finished_at: number
  expires_at: number
  task_error: { message: string } | null
  progress: number // 0-100
}

/** Request to generate a 3D model for a character */
export interface ModelGenerationRequest {
  characterId: string
  characterName: string
  characterDescription: string
  ancestry?: string
  className?: string
  artStyle?: MeshyCreateTaskRequest['art_style']
}

/** Optimized prompt output from Claude */
export interface OptimizedModelPrompt {
  prompt: string
  negativePrompt: string
  artStyle: MeshyCreateTaskRequest['art_style']
}

/** Status response returned to the frontend */
export interface ModelGenerationStatus {
  characterId: string
  meshyTaskId: string | null
  status: 'none' | 'optimizing' | 'pending' | 'processing' | 'succeeded' | 'failed'
  progress: number
  modelUrl: string | null
  thumbnailUrl: string | null
  error: string | null
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/types.ts
git commit -m "feat(ai-services): add 3D model generation types"
```

---

### Task 3: Meshy API Client

**Files:**
- Create: `packages/ai-services/src/services/meshy-client.ts`
- Create: `packages/ai-services/src/services/meshy-client.mock.ts`
- Create: `packages/ai-services/__tests__/meshy-client.test.ts`

- [ ] **Step 1: Write tests first**

`packages/ai-services/__tests__/meshy-client.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('MeshyClient', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('MESHY_API_KEY', 'test-key-123')
    mockFetch.mockReset()
  })

  it('createTextTo3DTask sends correct request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 'task-abc-123' }),
    })

    const { createMeshyClient } = await import('../src/services/meshy-client')
    const client = createMeshyClient()
    const taskId = await client.createTextTo3DTask({
      mode: 'preview',
      prompt: 'a brave elven warrior',
      art_style: 'realistic',
      negative_prompt: 'blurry, low quality',
    })

    expect(taskId).toBe('task-abc-123')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.meshy.ai/openapi/v2/text-to-3d',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key-123',
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('getTask returns parsed task response', async () => {
    const taskResponse = {
      id: 'task-abc-123',
      status: 'SUCCEEDED',
      progress: 100,
      model_urls: { glb: 'https://assets.meshy.ai/model.glb', fbx: '', obj: '', usdz: '' },
      thumbnail_url: 'https://assets.meshy.ai/thumb.png',
      prompt: 'test',
      art_style: 'realistic',
      negative_prompt: '',
      created_at: 1000,
      started_at: 1001,
      finished_at: 1050,
      expires_at: 9999,
      task_error: null,
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => taskResponse,
    })

    const { createMeshyClient } = await import('../src/services/meshy-client')
    const client = createMeshyClient()
    const task = await client.getTask('task-abc-123')

    expect(task.status).toBe('SUCCEEDED')
    expect(task.model_urls.glb).toContain('.glb')
  })

  it('pollUntilComplete resolves on success', async () => {
    const pendingResponse = {
      id: 'task-1',
      status: 'IN_PROGRESS',
      progress: 50,
      model_urls: { glb: '', fbx: '', obj: '', usdz: '' },
      thumbnail_url: '',
      prompt: 'test',
      art_style: 'realistic',
      negative_prompt: '',
      created_at: 1000,
      started_at: 1001,
      finished_at: 0,
      expires_at: 9999,
      task_error: null,
    }
    const doneResponse = {
      ...pendingResponse,
      status: 'SUCCEEDED',
      progress: 100,
      model_urls: { glb: 'https://assets.meshy.ai/model.glb', fbx: '', obj: '', usdz: '' },
    }

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => pendingResponse })
      .mockResolvedValueOnce({ ok: true, json: async () => doneResponse })

    const { createMeshyClient } = await import('../src/services/meshy-client')
    const client = createMeshyClient()
    const result = await client.pollUntilComplete('task-1', { intervalMs: 10, maxAttempts: 5 })

    expect(result.status).toBe('SUCCEEDED')
  })

  it('throws on missing API key', async () => {
    vi.stubEnv('MESHY_API_KEY', '')

    const { createMeshyClient } = await import('../src/services/meshy-client')
    expect(() => createMeshyClient()).toThrow('MESHY_API_KEY')
  })
})

describe('MockMeshyClient', () => {
  it('simulates a full generation cycle', async () => {
    const { createMockMeshyClient } = await import('../src/services/meshy-client.mock')
    const client = createMockMeshyClient()

    const taskId = await client.createTextTo3DTask({
      mode: 'preview',
      prompt: 'test character',
      art_style: 'realistic',
    })
    expect(taskId).toMatch(/^mock-task-/)

    const result = await client.pollUntilComplete(taskId, { intervalMs: 10, maxAttempts: 3 })
    expect(result.status).toBe('SUCCEEDED')
    expect(result.model_urls.glb).toContain('.glb')
  })
})
```

- [ ] **Step 2: Implement Meshy client**

`packages/ai-services/src/services/meshy-client.ts`:
```ts
import type {
  MeshyCreateTaskRequest,
  MeshyTaskResponse,
} from '../types'

const MESHY_BASE_URL = 'https://api.meshy.ai/openapi/v2'

export interface PollOptions {
  intervalMs?: number
  maxAttempts?: number
  onProgress?: (progress: number, status: string) => void
}

export interface MeshyClient {
  createTextTo3DTask(request: MeshyCreateTaskRequest): Promise<string>
  getTask(taskId: string): Promise<MeshyTaskResponse>
  pollUntilComplete(taskId: string, options?: PollOptions): Promise<MeshyTaskResponse>
  downloadGlb(url: string): Promise<Buffer>
}

/**
 * Creates a Meshy API client.
 * Requires MESHY_API_KEY environment variable.
 */
export function createMeshyClient(): MeshyClient {
  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) {
    throw new Error(
      'MESHY_API_KEY is not set. Add it to your .env.local file.'
    )
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  async function createTextTo3DTask(request: MeshyCreateTaskRequest): Promise<string> {
    const response = await fetch(`${MESHY_BASE_URL}/text-to-3d`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Meshy API error (${response.status}): ${body}`)
    }

    const data = await response.json() as { result: string }
    return data.result
  }

  async function getTask(taskId: string): Promise<MeshyTaskResponse> {
    const response = await fetch(`${MESHY_BASE_URL}/text-to-3d/${taskId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Meshy API error (${response.status}): ${body}`)
    }

    return response.json() as Promise<MeshyTaskResponse>
  }

  async function pollUntilComplete(
    taskId: string,
    options: PollOptions = {}
  ): Promise<MeshyTaskResponse> {
    const { intervalMs = 5000, maxAttempts = 120, onProgress } = options

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const task = await getTask(taskId)

      onProgress?.(task.progress, task.status)

      if (task.status === 'SUCCEEDED') return task
      if (task.status === 'FAILED') {
        throw new Error(`Meshy task failed: ${task.task_error?.message ?? 'unknown error'}`)
      }
      if (task.status === 'EXPIRED') {
        throw new Error('Meshy task expired')
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    throw new Error(`Meshy task timed out after ${maxAttempts} attempts`)
  }

  async function downloadGlb(url: string): Promise<Buffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download GLB: ${response.status}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  return { createTextTo3DTask, getTask, pollUntilComplete, downloadGlb }
}
```

- [ ] **Step 3: Implement mock client for testing**

`packages/ai-services/src/services/meshy-client.mock.ts`:
```ts
import type { MeshyTaskResponse } from '../types'
import type { MeshyClient, PollOptions } from './meshy-client'

/**
 * Mock Meshy client for development/testing without an API key.
 * Returns a placeholder GLB URL after a simulated delay.
 */
export function createMockMeshyClient(): MeshyClient {
  const tasks = new Map<string, MeshyTaskResponse>()
  let callCount = new Map<string, number>()

  function createTextTo3DTask(): Promise<string> {
    const taskId = `mock-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const now = Date.now()

    tasks.set(taskId, {
      id: taskId,
      model_urls: {
        glb: '',
        fbx: '',
        obj: '',
        usdz: '',
      },
      thumbnail_url: '',
      prompt: '',
      art_style: 'realistic',
      negative_prompt: '',
      status: 'PENDING',
      created_at: now,
      started_at: 0,
      finished_at: 0,
      expires_at: now + 86400000,
      task_error: null,
      progress: 0,
    })
    callCount.set(taskId, 0)

    return Promise.resolve(taskId)
  }

  function getTask(taskId: string): Promise<MeshyTaskResponse> {
    const task = tasks.get(taskId)
    if (!task) {
      return Promise.reject(new Error(`Mock task not found: ${taskId}`))
    }

    const count = (callCount.get(taskId) ?? 0) + 1
    callCount.set(taskId, count)

    // Simulate progression: first call → IN_PROGRESS, second call → SUCCEEDED
    if (count === 1) {
      task.status = 'IN_PROGRESS'
      task.progress = 50
      task.started_at = Date.now()
    } else {
      task.status = 'SUCCEEDED'
      task.progress = 100
      task.finished_at = Date.now()
      task.model_urls = {
        glb: 'https://mock.meshy.ai/models/placeholder.glb',
        fbx: 'https://mock.meshy.ai/models/placeholder.fbx',
        obj: 'https://mock.meshy.ai/models/placeholder.obj',
        usdz: 'https://mock.meshy.ai/models/placeholder.usdz',
      }
      task.thumbnail_url = 'https://mock.meshy.ai/thumbnails/placeholder.png'
    }

    return Promise.resolve({ ...task })
  }

  async function pollUntilComplete(
    taskId: string,
    options: PollOptions = {}
  ): Promise<MeshyTaskResponse> {
    const { intervalMs = 100, maxAttempts = 10, onProgress } = options

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const task = await getTask(taskId)
      onProgress?.(task.progress, task.status)
      if (task.status === 'SUCCEEDED') return task
      if (task.status === 'FAILED') throw new Error('Mock task failed')
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
    throw new Error('Mock task timed out')
  }

  function downloadGlb(): Promise<Buffer> {
    // Return a minimal valid GLB header (12 bytes) for testing
    const header = Buffer.alloc(12)
    header.writeUInt32LE(0x46546C67, 0) // magic: glTF
    header.writeUInt32LE(2, 4)           // version: 2
    header.writeUInt32LE(12, 8)          // length: 12
    return Promise.resolve(header)
  }

  return { createTextTo3DTask, getTask, pollUntilComplete, downloadGlb }
}
```

- [ ] **Step 4: Run tests**

```bash
cd packages/ai-services && pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add packages/ai-services/src/services/meshy-client.ts packages/ai-services/src/services/meshy-client.mock.ts packages/ai-services/__tests__/meshy-client.test.ts
git commit -m "feat(ai-services): add Meshy API client with mock for testing"
```

---

### Task 4: Claude Prompt Optimizer for 3D Generation

**Files:**
- Create: `packages/ai-services/src/prompts/model-generation.ts`
- Create: `packages/ai-services/src/services/model-prompt-optimizer.ts`
- Create: `packages/ai-services/__tests__/model-prompt-optimizer.test.ts`

- [ ] **Step 1: Write tests first**

`packages/ai-services/__tests__/model-prompt-optimizer.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('model-prompt-optimizer', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('buildModelUserPrompt includes character details', async () => {
    const { buildModelUserPrompt } = await import('../src/prompts/model-generation')
    const prompt = buildModelUserPrompt({
      characterName: 'Thorin Ironfist',
      characterDescription: 'A stout dwarf with a braided red beard and heavy plate armor',
      ancestry: 'Dwarf',
      className: 'Champion',
    })

    expect(prompt).toContain('Thorin Ironfist')
    expect(prompt).toContain('Dwarf')
    expect(prompt).toContain('Champion')
    expect(prompt).toContain('braided red beard')
  })

  it('optimizeModelPrompt returns structured prompt', async () => {
    // Mock the Anthropic client
    vi.doMock('../src/client', () => ({
      getAnthropicClient: () => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  prompt: 'fantasy dwarf warrior, heavy plate armor, braided red beard, battle stance, medieval fantasy RPG character, full body, high detail',
                  negativePrompt: 'blurry, low quality, modern clothing, guns, text, watermark',
                  artStyle: 'realistic',
                }),
              },
            ],
          }),
        },
      }),
    }))

    const { optimizeModelPrompt } = await import('../src/services/model-prompt-optimizer')
    const result = await optimizeModelPrompt({
      characterName: 'Thorin',
      characterDescription: 'A dwarf champion with plate armor',
      ancestry: 'Dwarf',
      className: 'Champion',
    })

    expect(result.prompt).toContain('dwarf')
    expect(result.negativePrompt).toBeTruthy()
    expect(result.artStyle).toBe('realistic')
  })
})
```

- [ ] **Step 2: Create the system prompt**

`packages/ai-services/src/prompts/model-generation.ts`:
```ts
export const MODEL_GENERATION_SYSTEM_PROMPT = `You are an expert at writing prompts for AI 3D model generation (Meshy API).

Your job: take a Pathfinder 2e character description and produce an optimized prompt for generating a 3D miniature-style character model.

Rules:
- Output ONLY valid JSON with keys: "prompt", "negativePrompt", "artStyle"
- The "prompt" should be a comma-separated list of descriptive terms, 30-60 words
- Focus on: character race/species, body type, armor/clothing, weapons, pose, visual style
- Use terms that work well for 3D generation: "full body", "T-pose" or "battle stance", "high detail"
- Include "tabletop miniature" or "RPG character" for correct scale and style
- The "negativePrompt" should list things to avoid: "blurry, low quality, modern clothing, guns, text, watermark, NSFW, multiple characters"
- The "artStyle" should be one of: "realistic", "cartoon", "low-poly", "sculpture", "pbr"
  - Default to "realistic" for serious/dark characters
  - Use "cartoon" for lighthearted/comedic characters
  - Use "sculpture" for undead/stone/elemental characters
- Keep the total prompt concise — Meshy works best with focused, descriptive prompts
- Do NOT include the character's name in the prompt (names confuse 3D generators)
- DO include ancestry-specific physical traits (pointed ears for elves, stocky build for dwarves, etc.)
`

export function buildModelUserPrompt(input: {
  characterName: string
  characterDescription: string
  ancestry?: string
  className?: string
}): string {
  const parts = [
    `Character Name: ${input.characterName}`,
    `Description: ${input.characterDescription}`,
  ]
  if (input.ancestry) parts.push(`Ancestry/Race: ${input.ancestry}`)
  if (input.className) parts.push(`Class: ${input.className}`)

  return parts.join('\n')
}
```

- [ ] **Step 3: Create the optimizer service**

`packages/ai-services/src/services/model-prompt-optimizer.ts`:
```ts
import { getAnthropicClient } from '../client'
import {
  MODEL_GENERATION_SYSTEM_PROMPT,
  buildModelUserPrompt,
} from '../prompts/model-generation'
import type { OptimizedModelPrompt } from '../types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 512

/**
 * Uses Claude to optimize a character description into a Meshy-friendly prompt.
 */
export async function optimizeModelPrompt(input: {
  characterName: string
  characterDescription: string
  ancestry?: string
  className?: string
  artStyle?: string
}): Promise<OptimizedModelPrompt> {
  const client = getAnthropicClient()

  const userPrompt = buildModelUserPrompt(input)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: MODEL_GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let result: OptimizedModelPrompt
  try {
    result = JSON.parse(textBlock.text) as OptimizedModelPrompt
  } catch {
    throw new Error(
      `Failed to parse Claude response as JSON: ${textBlock.text.slice(0, 200)}`
    )
  }

  // Validate required fields
  if (!result.prompt || typeof result.prompt !== 'string') {
    throw new Error('Invalid optimized prompt: missing "prompt" field')
  }

  // Apply defaults
  result.negativePrompt ??= 'blurry, low quality, text, watermark'
  result.artStyle ??= 'realistic'

  return result
}
```

- [ ] **Step 4: Run tests**

```bash
cd packages/ai-services && pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add packages/ai-services/src/prompts/model-generation.ts packages/ai-services/src/services/model-prompt-optimizer.ts packages/ai-services/__tests__/model-prompt-optimizer.test.ts
git commit -m "feat(ai-services): add Claude prompt optimizer for 3D model generation"
```

---

### Task 5: Update ai-services Exports

**Files:**
- Modify: `packages/ai-services/src/index.ts`

- [ ] **Step 1: Add new exports**

Append to `packages/ai-services/src/index.ts`:
```ts
// 3D Model Generation
export { createMeshyClient } from './services/meshy-client'
export type { MeshyClient, PollOptions } from './services/meshy-client'
export { createMockMeshyClient } from './services/meshy-client.mock'
export { optimizeModelPrompt } from './services/model-prompt-optimizer'
export {
  MODEL_GENERATION_SYSTEM_PROMPT,
  buildModelUserPrompt,
} from './prompts/model-generation'
export type {
  MeshyTaskStatus,
  MeshyCreateTaskRequest,
  MeshyTaskResponse,
  ModelGenerationRequest,
  OptimizedModelPrompt,
  ModelGenerationStatus,
} from './types'
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/index.ts
git commit -m "feat(ai-services): export 3D model generation API"
```

---

### Task 6: Model Generation API Route

**Files:**
- Create: `apps/web/app/api/ai/model-generate/route.ts`
- Create: `apps/web/app/api/ai/model-status/route.ts`

- [ ] **Step 1: Create generation endpoint**

`apps/web/app/api/ai/model-generate/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createMeshyClient,
  createMockMeshyClient,
  optimizeModelPrompt,
} from '@dndmanager/ai-services'
import type { MeshyClient } from '@dndmanager/ai-services'

function getMeshyClient(): MeshyClient {
  if (process.env.MESHY_API_KEY) {
    return createMeshyClient()
  }
  console.warn('[model-generate] No MESHY_API_KEY — using mock client')
  return createMockMeshyClient()
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { characterId } = body as { characterId: string }

  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
  }

  // Fetch character (verifies ownership via RLS)
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('id, name, data, owner_id, model_status')
    .eq('id', characterId)
    .single()

  if (charError || !character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 })
  }

  if (character.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your character' }, { status: 403 })
  }

  if (character.model_status === 'pending' || character.model_status === 'processing') {
    return NextResponse.json({ error: 'Generation already in progress' }, { status: 409 })
  }

  // Mark as pending
  await supabase
    .from('characters')
    .update({ model_status: 'pending' })
    .eq('id', characterId)

  // Extract character details from JSONB data
  const charData = (character.data ?? {}) as Record<string, string>
  const description = charData.description ?? charData.concept ?? character.name
  const ancestry = charData.ancestry ?? ''
  const className = charData.class ?? ''

  try {
    // Step 1: Optimize prompt via Claude
    const optimized = await optimizeModelPrompt({
      characterName: character.name,
      characterDescription: description,
      ancestry,
      className,
    })

    // Step 2: Create Meshy task
    const meshyClient = getMeshyClient()
    const taskId = await meshyClient.createTextTo3DTask({
      mode: 'preview',
      prompt: optimized.prompt,
      art_style: optimized.artStyle,
      negative_prompt: optimized.negativePrompt,
    })

    // Step 3: Update status to processing
    await supabase
      .from('characters')
      .update({ model_status: 'processing' })
      .eq('id', characterId)

    // Step 4: Poll in background (fire-and-forget for the API response)
    // The client will poll /api/ai/model-status for updates
    pollAndStore(meshyClient, taskId, characterId, user.id, supabase).catch((err) => {
      console.error(`[model-generate] Background poll failed for ${characterId}:`, err)
    })

    return NextResponse.json({
      meshyTaskId: taskId,
      status: 'processing',
    })
  } catch (err) {
    await supabase
      .from('characters')
      .update({ model_status: 'failed' })
      .eq('id', characterId)

    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Background task: poll Meshy, download GLB, upload to Supabase Storage,
 * update the character record.
 */
async function pollAndStore(
  meshyClient: MeshyClient,
  taskId: string,
  characterId: string,
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const task = await meshyClient.pollUntilComplete(taskId, {
    intervalMs: 5000,
    maxAttempts: 120, // ~10 min max
  })

  // Download the GLB
  const glbBuffer = await meshyClient.downloadGlb(task.model_urls.glb)

  // Upload GLB to Supabase Storage
  const glbPath = `${userId}/${characterId}/model.glb`
  const { error: uploadError } = await supabase.storage
    .from('character-models')
    .upload(glbPath, glbBuffer, {
      contentType: 'model/gltf-binary',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`Failed to upload GLB: ${uploadError.message}`)
  }

  // Get public URL
  const { data: { publicUrl: modelUrl } } = supabase.storage
    .from('character-models')
    .getPublicUrl(glbPath)

  // Download and upload thumbnail
  let thumbnailUrl: string | null = null
  if (task.thumbnail_url) {
    const thumbResponse = await fetch(task.thumbnail_url)
    const thumbBuffer = Buffer.from(await thumbResponse.arrayBuffer())
    const thumbPath = `${userId}/${characterId}/thumbnail.png`

    await supabase.storage
      .from('character-models')
      .upload(thumbPath, thumbBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    thumbnailUrl = supabase.storage
      .from('character-models')
      .getPublicUrl(thumbPath).data.publicUrl
  }

  // Update character record
  await supabase
    .from('characters')
    .update({
      model_url: modelUrl,
      model_thumbnail_url: thumbnailUrl,
      model_status: 'succeeded',
    })
    .eq('id', characterId)
}
```

- [ ] **Step 2: Create status polling endpoint**

`apps/web/app/api/ai/model-status/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const characterId = request.nextUrl.searchParams.get('characterId')
  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: character, error } = await supabase
    .from('characters')
    .select('id, model_url, model_thumbnail_url, model_status')
    .eq('id', characterId)
    .single()

  if (error || !character) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 })
  }

  return NextResponse.json({
    characterId: character.id,
    status: character.model_status,
    modelUrl: character.model_url,
    thumbnailUrl: character.model_thumbnail_url,
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/ai/model-generate/route.ts apps/web/app/api/ai/model-status/route.ts
git commit -m "feat(web): add model generation and status API routes"
```

---

### Task 7: R3F Character Model Component

**Files:**
- Create: `apps/web/components/game/CharacterModel.tsx`
- Modify: `apps/web/components/game/TokenLayer.tsx`

- [ ] **Step 1: Create CharacterModel component**

`apps/web/components/game/CharacterModel.tsx`:
```tsx
'use client'

import { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

interface CharacterModelProps {
  url: string
  scale?: number
  rotation?: [number, number, number]
}

function LoadedModel({ url, scale = 1, rotation = [0, 0, 0] }: CharacterModelProps) {
  const { scene } = useGLTF(url)
  const ref = useRef<THREE.Group>(null)

  // Clone the scene so multiple tokens can use the same model
  const clonedScene = scene.clone(true)

  // Normalize model size: compute bounding box and scale to fit TOKEN_HEIGHT
  const box = new THREE.Box3().setFromObject(clonedScene)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  const normalizedScale = maxDim > 0 ? (0.8 / maxDim) * scale : scale

  // Center the model
  const center = new THREE.Vector3()
  box.getCenter(center)

  return (
    <group scale={normalizedScale} rotation={rotation}>
      <primitive
        ref={ref}
        object={clonedScene}
        position={[-center.x, -box.min.y, -center.z]}
      />
    </group>
  )
}

/**
 * Fallback cylinder shown while the GLB is loading.
 */
function CylinderFallback({ color }: { color: string }) {
  return (
    <mesh>
      <cylinderGeometry args={[0.35, 0.35, 0.8, 16]} />
      <meshStandardMaterial color={color} opacity={0.5} transparent />
    </mesh>
  )
}

/**
 * Renders a 3D character model from a GLB URL, with a cylinder fallback
 * while loading or if no URL is provided.
 */
export function CharacterModel({
  url,
  fallbackColor = '#9ca3af',
  scale,
  rotation,
}: CharacterModelProps & { fallbackColor?: string }) {
  if (!url) {
    return <CylinderFallback color={fallbackColor} />
  }

  return (
    <Suspense fallback={<CylinderFallback color={fallbackColor} />}>
      <LoadedModel url={url} scale={scale} rotation={rotation} />
    </Suspense>
  )
}
```

- [ ] **Step 2: Update TokenLayer to use CharacterModel**

Replace the Token type import and `TokenMesh` body in `apps/web/components/game/TokenLayer.tsx`. The `Token` interface in `game-runtime` will need a `modelUrl` optional field (see step 3). For now, read it from an extended local type:

`apps/web/components/game/TokenLayer.tsx` — full replacement:
```tsx
'use client'

import { useRef } from 'react'
import * as THREE from 'three'
import { useGameStore } from '@/lib/stores/game-store'
import { CharacterModel } from './CharacterModel'
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

  // modelUrl may exist on the token data (added in this phase)
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

  return (
    <group name="token-layer">
      {tokens.map((token) => (
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
```

- [ ] **Step 3: Add modelUrl to Token type in game-runtime**

Modify `packages/game-runtime/src/types.ts` — add to the `Token` interface:

```ts
  modelUrl?: string     // URL to GLB 3D model (from Meshy generation)
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/game/CharacterModel.tsx apps/web/components/game/TokenLayer.tsx packages/game-runtime/src/types.ts
git commit -m "feat(web): add CharacterModel R3F component, replace cylinder placeholders"
```

---

### Task 8: Model Generation UI Panel

**Files:**
- Create: `apps/web/components/character/ModelGenerationPanel.tsx`

- [ ] **Step 1: Create the panel component**

`apps/web/components/character/ModelGenerationPanel.tsx`:
```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface ModelGenerationPanelProps {
  characterId: string
  initialStatus: 'none' | 'pending' | 'processing' | 'succeeded' | 'failed'
  initialModelUrl?: string | null
  initialThumbnailUrl?: string | null
}

export function ModelGenerationPanel({
  characterId,
  initialStatus,
  initialModelUrl,
  initialThumbnailUrl,
}: ModelGenerationPanelProps) {
  const [status, setStatus] = useState(initialStatus)
  const [modelUrl, setModelUrl] = useState(initialModelUrl ?? null)
  const [thumbnailUrl, setThumbnailUrl] = useState(initialThumbnailUrl ?? null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Poll for status when processing
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/ai/model-status?characterId=${characterId}`)
      if (!res.ok) return

      const data = await res.json()
      setStatus(data.status)
      if (data.modelUrl) setModelUrl(data.modelUrl)
      if (data.thumbnailUrl) setThumbnailUrl(data.thumbnailUrl)
    } catch {
      // Silently ignore poll errors
    }
  }, [characterId])

  useEffect(() => {
    if (status !== 'pending' && status !== 'processing') return

    const interval = setInterval(pollStatus, 3000)
    return () => clearInterval(interval)
  }, [status, pollStatus])

  async function handleGenerate() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/model-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Generation failed')
      }

      setStatus('processing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">3D Modell</CardTitle>
        <CardDescription>
          Generiere ein 3D-Modell deines Charakters mit KI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview */}
        {thumbnailUrl && (
          <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden border border-neutral-700">
            <img
              src={thumbnailUrl}
              alt="3D Model Vorschau"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Status indicator */}
        {(status === 'pending' || status === 'processing') && (
          <div className="space-y-2">
            <p className="text-sm text-neutral-400">
              {status === 'pending' ? 'Prompt wird optimiert...' : '3D Modell wird generiert...'}
            </p>
            <Progress value={status === 'pending' ? 15 : 60} className="h-2" />
          </div>
        )}

        {status === 'succeeded' && (
          <p className="text-sm text-green-400">Modell erfolgreich generiert!</p>
        )}

        {status === 'failed' && (
          <p className="text-sm text-red-400">{error ?? 'Generierung fehlgeschlagen'}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {(status === 'none' || status === 'failed' || status === 'succeeded') && (
            <Button
              onClick={handleGenerate}
              disabled={loading}
              variant={status === 'succeeded' ? 'outline' : 'default'}
              size="sm"
            >
              {loading
                ? 'Wird gestartet...'
                : status === 'succeeded'
                  ? 'Neu generieren'
                  : '3D Modell generieren'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/character/ModelGenerationPanel.tsx
git commit -m "feat(web): add ModelGenerationPanel component with progress polling"
```

---

### Task 9: Thumbnail Generation from 3D Model

**Files:**
- Create: `apps/web/components/game/ModelThumbnailRenderer.tsx`

- [ ] **Step 1: Create offscreen thumbnail renderer**

This uses an offscreen R3F canvas to render the 3D model and capture a 2D thumbnail. In practice, the Meshy API already provides a `thumbnail_url` which we store in Task 6. This component is for generating custom thumbnails (e.g., from a specific angle) client-side.

`apps/web/components/game/ModelThumbnailRenderer.tsx`:
```tsx
'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CharacterModel } from './CharacterModel'

interface ThumbnailCaptureProps {
  onCapture: (dataUrl: string) => void
  delay?: number
}

/**
 * Inner component that captures the canvas after the model loads.
 */
function ThumbnailCapture({ onCapture, delay = 500 }: ThumbnailCaptureProps) {
  const { gl } = useThree()
  const captured = useRef(false)

  useEffect(() => {
    if (captured.current) return
    const timer = setTimeout(() => {
      captured.current = true
      const dataUrl = gl.domElement.toDataURL('image/png')
      onCapture(dataUrl)
    }, delay)
    return () => clearTimeout(timer)
  }, [gl, onCapture, delay])

  return null
}

interface ModelThumbnailRendererProps {
  modelUrl: string
  width?: number
  height?: number
  onThumbnailReady: (dataUrl: string) => void
}

/**
 * Renders a 3D model in a hidden canvas and captures a PNG thumbnail.
 * Mount this temporarily, capture, then unmount.
 */
export function ModelThumbnailRenderer({
  modelUrl,
  width = 256,
  height = 256,
  onThumbnailReady,
}: ModelThumbnailRendererProps) {
  const handleCapture = useCallback(
    (dataUrl: string) => {
      onThumbnailReady(dataUrl)
    },
    [onThumbnailReady]
  )

  return (
    <div
      style={{
        width,
        height,
        position: 'absolute',
        left: -9999,
        top: -9999,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: [0, 0.5, 2], fov: 40 }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 3, 2]} intensity={1} />
        <CharacterModel url={modelUrl} fallbackColor="#666" />
        <ThumbnailCapture onCapture={handleCapture} delay={1000} />
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/ModelThumbnailRenderer.tsx
git commit -m "feat(web): add ModelThumbnailRenderer for client-side 3D thumbnail capture"
```

---

### Task 10: Integration — Wire Generation Panel into Character Page

**Files:**
- Modify: `apps/web/app/(lobby)/campaigns/[campaignId]/characters/new/page.tsx` (or create a character detail page)

- [ ] **Step 1: Add ModelGenerationPanel to character detail view**

If a character detail page exists at `[characterId]/page.tsx`, add the panel there. Otherwise, create a minimal character detail page.

Create `apps/web/app/(lobby)/campaigns/[campaignId]/characters/[characterId]/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ModelGenerationPanel } from '@/components/character/ModelGenerationPanel'

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string; characterId: string }>
}) {
  const { campaignId, characterId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .single()

  if (!character) redirect(`/campaigns/${campaignId}`)

  const isOwner = character.owner_id === user.id

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">{character.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-400">Level {character.level}</p>
        </CardContent>
      </Card>

      {isOwner && (
        <div className="w-full max-w-md">
          <ModelGenerationPanel
            characterId={character.id}
            initialStatus={character.model_status ?? 'none'}
            initialModelUrl={character.model_url}
            initialThumbnailUrl={character.model_thumbnail_url}
          />
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(lobby\)/campaigns/\[campaignId\]/characters/\[characterId\]/page.tsx
git commit -m "feat(web): add character detail page with 3D model generation panel"
```

---

### Task 11: Environment Variables & Configuration

**Files:**
- Modify: `.env.local.example` (or `.env.example`)

- [ ] **Step 1: Document required env vars**

Add to `.env.local.example`:
```env
# 3D Model Generation (Meshy API)
# Sign up at https://meshy.ai and get an API key
# Leave empty to use mock client (for development)
MESHY_API_KEY=
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "docs: add MESHY_API_KEY to env example"
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MESHY_API_KEY` | No (mock used if absent) | Meshy API key from https://meshy.ai |
| `ANTHROPIC_API_KEY` | Yes (existing) | Used for prompt optimization |

## Testing Strategy

1. **Unit tests** (`packages/ai-services/__tests__/`):
   - `meshy-client.test.ts` — Tests API calls with mocked `fetch`, validates request format and response parsing
   - `model-prompt-optimizer.test.ts` — Tests prompt construction and Claude response parsing with mocked Anthropic client

2. **Mock client** (`meshy-client.mock.ts`):
   - Full `MeshyClient` interface implementation returning fake data
   - Simulates PENDING → IN_PROGRESS → SUCCEEDED lifecycle
   - Used automatically when `MESHY_API_KEY` is not set

3. **Manual integration test flow**:
   - Start dev server: `pnpm dev`
   - Create a character in a campaign
   - Navigate to character detail page
   - Click "3D Modell generieren"
   - Observe progress polling (mock completes in ~1s, real Meshy takes 1-5 min)
   - Verify model appears in game view (TokenLayer)

## API Reference: Meshy Text-to-3D v2

```
POST https://api.meshy.ai/openapi/v2/text-to-3d
Authorization: Bearer <API_KEY>
Content-Type: application/json

{
  "mode": "preview",
  "prompt": "a fantasy dwarf warrior, heavy plate armor, battle stance",
  "art_style": "realistic",
  "negative_prompt": "blurry, low quality, modern"
}

Response: { "result": "<task_id>" }

GET https://api.meshy.ai/openapi/v2/text-to-3d/<task_id>
Response: MeshyTaskResponse (see types above)
```

## Estimated Effort

| Task | Estimate |
|---|---|
| 1. DB Migration | 15 min |
| 2. Types | 15 min |
| 3. Meshy Client + Mock + Tests | 45 min |
| 4. Prompt Optimizer + Tests | 30 min |
| 5. Export Updates | 5 min |
| 6. API Routes | 30 min |
| 7. R3F CharacterModel + TokenLayer | 30 min |
| 8. Generation UI Panel | 25 min |
| 9. Thumbnail Renderer | 20 min |
| 10. Character Detail Page | 15 min |
| 11. Env Config | 5 min |
| **Total** | **~4 hours** |
