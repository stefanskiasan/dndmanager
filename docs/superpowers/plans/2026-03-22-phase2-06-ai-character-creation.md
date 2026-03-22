# Phase 2.6: AI-Assisted Character Creation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players describe their character concept in natural language (e.g. "a cunning elven wizard who specializes in illusion magic") and receive AI-generated PF2e suggestions for ancestry, class, background, ability scores, and skills. The player reviews suggestions, picks options, and saves to Supabase.

**Architecture:** The `@dndmanager/ai-services` package wraps the Claude API via `@anthropic-ai/sdk`. A Next.js API route in `apps/web` calls the service with the player's description, returns structured suggestions, and a multi-step wizard UI lets the player accept/modify them before saving.

**Tech Stack:** @anthropic-ai/sdk, @dndmanager/ai-services, @dndmanager/pf2e-engine, Next.js API routes, React, shadcn/ui, Supabase

---

## File Structure

```
packages/ai-services/
├── package.json                              → Add @anthropic-ai/sdk dependency
├── src/
│   ├── index.ts                              → Re-export public API
│   ├── client.ts                             → Claude API client singleton
│   ├── prompts/
│   │   └── character-creation.ts             → System + user prompt templates
│   ├── services/
│   │   └── character-suggestion.ts           → Suggest ancestry/class/background/abilities
│   └── types.ts                              → Shared AI response types

apps/web/
├── app/api/ai/character-suggest/
│   └── route.ts                              → POST endpoint calling ai-services
├── components/character/
│   ├── CharacterForm.tsx                     → Existing form (modified to integrate wizard)
│   ├── CharacterWizard.tsx                   → Multi-step wizard container
│   ├── steps/
│   │   ├── ConceptStep.tsx                   → Free-text character concept input
│   │   ├── SuggestionsStep.tsx               → Display AI suggestions, let player pick
│   │   ├── AbilitiesStep.tsx                 → Ability score assignment
│   │   └── ReviewStep.tsx                    → Final review before save
│   └── SuggestionCard.tsx                    → Reusable card for a single suggestion
```

---

### Task 1: Add @anthropic-ai/sdk to ai-services

**Files:**
- Modify: `packages/ai-services/package.json`

- [ ] **Step 1: Install dependency**

```bash
cd packages/ai-services && pnpm add @anthropic-ai/sdk
```

- [ ] **Step 2: Verify package.json**

`packages/ai-services/package.json` should now contain:
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@dndmanager/shared": "workspace:*"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/ai-services/package.json pnpm-lock.yaml
git commit -m "chore(ai-services): add @anthropic-ai/sdk dependency"
```

---

### Task 2: AI Response Types

**Files:**
- Create: `packages/ai-services/src/types.ts`

- [ ] **Step 1: Define suggestion types**

`packages/ai-services/src/types.ts`:
```ts
import type { AbilityId } from '@dndmanager/pf2e-engine'

/** A single ancestry/class/background option suggested by the AI */
export interface CharacterOption {
  name: string
  description: string
  reasoning: string // Why this fits the player's concept
}

/** Ability score boost suggestion */
export interface AbilityBoostSuggestion {
  ability: AbilityId
  priority: 'key' | 'high' | 'medium' | 'low'
  reasoning: string
}

/** Full AI suggestion response for character creation */
export interface CharacterSuggestion {
  /** Summary of how the AI interpreted the concept */
  conceptSummary: string

  /** Top 3 ancestry suggestions */
  ancestries: CharacterOption[]

  /** Top 3 class suggestions */
  classes: CharacterOption[]

  /** Top 3 background suggestions */
  backgrounds: CharacterOption[]

  /** Suggested ability score priorities */
  abilityBoosts: AbilityBoostSuggestion[]

  /** Suggested skill trainings */
  skills: CharacterOption[]

  /** Optional character name suggestions if not provided */
  nameSuggestions?: string[]
}

/** Request payload for the character suggestion endpoint */
export interface CharacterSuggestionRequest {
  concept: string
  level?: number
  campaignSetting?: string // optional context about the campaign
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/types.ts
git commit -m "feat(ai-services): add character suggestion types"
```

---

### Task 3: Claude API Client

**Files:**
- Create: `packages/ai-services/src/client.ts`

- [ ] **Step 1: Create client singleton**

`packages/ai-services/src/client.ts`:
```ts
import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

/**
 * Returns a singleton Anthropic client.
 * Requires ANTHROPIC_API_KEY environment variable.
 */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Add it to your .env.local file.'
      )
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

/** Reset client (useful for testing) */
export function resetClient(): void {
  client = null
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/client.ts
git commit -m "feat(ai-services): add Anthropic client singleton"
```

---

### Task 4: Character Creation Prompt Templates

**Files:**
- Create: `packages/ai-services/src/prompts/character-creation.ts`

- [ ] **Step 1: Create prompt templates**

`packages/ai-services/src/prompts/character-creation.ts`:
```ts
export const CHARACTER_CREATION_SYSTEM_PROMPT = `You are a Pathfinder 2nd Edition character creation assistant. Your job is to suggest character options that match a player's concept description.

RULES:
- Only suggest official PF2e options from the Core Rulebook and Advanced Player's Guide.
- Always suggest exactly 3 options each for ancestry, class, and background.
- Rank suggestions by how well they fit the concept (best fit first).
- For ability boosts, suggest all 6 abilities with priority rankings.
- Keep reasoning brief (1-2 sentences).
- If the concept is vague, make reasonable assumptions and explain them.

VALID ANCESTRIES: Human, Elf, Dwarf, Gnome, Goblin, Halfling, Half-Elf, Half-Orc, Leshy, Catfolk, Kobold, Orc, Ratfolk, Tengu, Aasimar, Tiefling

VALID CLASSES: Alchemist, Barbarian, Bard, Champion, Cleric, Druid, Fighter, Gunslinger, Inventor, Investigator, Kineticist, Magus, Monk, Oracle, Psychic, Ranger, Rogue, Sorcerer, Summoner, Swashbuckler, Thaumaturge, Witch, Wizard

VALID BACKGROUNDS: Acolyte, Acrobat, Animal Whisperer, Artisan, Artist, Barkeep, Barrister, Bounty Hunter, Charlatan, Criminal, Detective, Emissary, Entertainer, Farmhand, Field Medic, Fortune Teller, Gambler, Gladiator, Guard, Herbalist, Hermit, Hunter, Laborer, Martial Disciple, Merchant, Miner, Noble, Nomad, Prisoner, Sailor, Scholar, Scout, Street Urchin, Tinker, Warrior

VALID SKILLS: Acrobatics, Arcana, Athletics, Crafting, Deception, Diplomacy, Intimidation, Medicine, Nature, Occultism, Performance, Religion, Society, Stealth, Survival, Thievery

You MUST respond with valid JSON matching this exact structure:
{
  "conceptSummary": "string",
  "ancestries": [{ "name": "string", "description": "string", "reasoning": "string" }],
  "classes": [{ "name": "string", "description": "string", "reasoning": "string" }],
  "backgrounds": [{ "name": "string", "description": "string", "reasoning": "string" }],
  "abilityBoosts": [{ "ability": "str|dex|con|int|wis|cha", "priority": "key|high|medium|low", "reasoning": "string" }],
  "skills": [{ "name": "string", "description": "string", "reasoning": "string" }],
  "nameSuggestions": ["string"]
}

Do not include any text outside the JSON object.`

export function buildUserPrompt(
  concept: string,
  level: number = 1,
  campaignSetting?: string
): string {
  let prompt = `Create a Level ${level} Pathfinder 2e character based on this concept:\n\n"${concept}"`

  if (campaignSetting) {
    prompt += `\n\nCampaign setting context: ${campaignSetting}`
  }

  return prompt
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai-services/src/prompts/
git commit -m "feat(ai-services): add PF2e character creation prompt templates"
```

---

### Task 5: Character Suggestion Service

**Files:**
- Create: `packages/ai-services/src/services/character-suggestion.ts`
- Modify: `packages/ai-services/src/index.ts`

- [ ] **Step 1: Create the suggestion service**

`packages/ai-services/src/services/character-suggestion.ts`:
```ts
import { getAnthropicClient } from '../client'
import {
  CHARACTER_CREATION_SYSTEM_PROMPT,
  buildUserPrompt,
} from '../prompts/character-creation'
import type {
  CharacterSuggestion,
  CharacterSuggestionRequest,
} from '../types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2048

/**
 * Calls Claude to generate PF2e character suggestions based on a
 * natural-language concept description.
 */
export async function suggestCharacter(
  request: CharacterSuggestionRequest
): Promise<CharacterSuggestion> {
  const client = getAnthropicClient()

  const userPrompt = buildUserPrompt(
    request.concept,
    request.level,
    request.campaignSetting
  )

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: CHARACTER_CREATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  // Extract text from the response
  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Parse JSON response
  let suggestion: CharacterSuggestion
  try {
    suggestion = JSON.parse(textBlock.text) as CharacterSuggestion
  } catch {
    throw new Error(
      `Failed to parse Claude response as JSON: ${textBlock.text.slice(0, 200)}`
    )
  }

  // Basic validation
  if (
    !suggestion.ancestries?.length ||
    !suggestion.classes?.length ||
    !suggestion.backgrounds?.length
  ) {
    throw new Error('Incomplete suggestion: missing ancestries, classes, or backgrounds')
  }

  return suggestion
}
```

- [ ] **Step 2: Update index.ts exports**

`packages/ai-services/src/index.ts`:
```ts
export { AI_SERVICES_VERSION } from './version'
export { getAnthropicClient, resetClient } from './client'
export { suggestCharacter } from './services/character-suggestion'
export {
  CHARACTER_CREATION_SYSTEM_PROMPT,
  buildUserPrompt,
} from './prompts/character-creation'
export type {
  CharacterSuggestion,
  CharacterSuggestionRequest,
  CharacterOption,
  AbilityBoostSuggestion,
} from './types'
```

Note: Move the existing `AI_SERVICES_VERSION` constant to a new file `packages/ai-services/src/version.ts` to keep index.ts clean:

`packages/ai-services/src/version.ts`:
```ts
export const AI_SERVICES_VERSION = '0.0.1'
```

- [ ] **Step 3: Commit**

```bash
git add packages/ai-services/src/
git commit -m "feat(ai-services): add character suggestion service with Claude integration"
```

---

### Task 6: Next.js API Route

**Files:**
- Create: `apps/web/app/api/ai/character-suggest/route.ts`

- [ ] **Step 1: Create the API route**

`apps/web/app/api/ai/character-suggest/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { suggestCharacter } from '@dndmanager/ai-services'
import type { CharacterSuggestionRequest } from '@dndmanager/ai-services'

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse request body
  let body: CharacterSuggestionRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  // Validate concept text
  if (!body.concept || body.concept.trim().length < 10) {
    return NextResponse.json(
      { error: 'Concept must be at least 10 characters long' },
      { status: 400 }
    )
  }

  if (body.concept.length > 2000) {
    return NextResponse.json(
      { error: 'Concept must be under 2000 characters' },
      { status: 400 }
    )
  }

  // Call AI service
  try {
    const suggestion = await suggestCharacter({
      concept: body.concept.trim(),
      level: body.level ?? 1,
      campaignSetting: body.campaignSetting,
    })

    return NextResponse.json(suggestion)
  } catch (error) {
    console.error('AI suggestion error:', error)
    return NextResponse.json(
      { error: 'Failed to generate character suggestions. Please try again.' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: Add ANTHROPIC_API_KEY to .env.local**

Ensure `apps/web/.env.local` contains:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Also add to `.env.example` (without the actual key):
```
ANTHROPIC_API_KEY=
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/ai/character-suggest/
git commit -m "feat(web): add API route for AI character suggestions"
```

---

### Task 7: SuggestionCard Component

**Files:**
- Create: `apps/web/components/character/SuggestionCard.tsx`

- [ ] **Step 1: Create suggestion card**

`apps/web/components/character/SuggestionCard.tsx`:
```tsx
'use client'

import { cn } from '@/lib/utils'

interface SuggestionCardProps {
  name: string
  description: string
  reasoning: string
  selected: boolean
  onSelect: () => void
}

export function SuggestionCard({
  name,
  description,
  reasoning,
  selected,
  onSelect,
}: SuggestionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border p-4 text-left transition-colors',
        selected
          ? 'border-amber-500 bg-amber-500/10 text-white'
          : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-500'
      )}
    >
      <div className="mb-1 text-sm font-semibold">{name}</div>
      <div className="mb-2 text-xs text-neutral-400">{description}</div>
      <div className="text-xs italic text-neutral-500">{reasoning}</div>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/character/SuggestionCard.tsx
git commit -m "feat(web): add SuggestionCard component for AI character options"
```

---

### Task 8: Wizard Step Components

**Files:**
- Create: `apps/web/components/character/steps/ConceptStep.tsx`
- Create: `apps/web/components/character/steps/SuggestionsStep.tsx`
- Create: `apps/web/components/character/steps/AbilitiesStep.tsx`
- Create: `apps/web/components/character/steps/ReviewStep.tsx`

- [ ] **Step 1: ConceptStep — free-text input**

`apps/web/components/character/steps/ConceptStep.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ConceptStepProps {
  initialConcept: string
  loading: boolean
  onSubmit: (concept: string) => void
}

export function ConceptStep({ initialConcept, loading, onSubmit }: ConceptStepProps) {
  const [concept, setConcept] = useState(initialConcept)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Beschreibe deinen Charakter</h2>
        <p className="text-sm text-neutral-400">
          Beschreibe dein Charakterkonzept in eigenen Worten. Die KI schlaegt passende
          PF2e-Optionen vor.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept">Charakterkonzept</Label>
        <textarea
          id="concept"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="z.B. Ein hinterlistiger Elfenmagier, der sich auf Illusionsmagie spezialisiert hat und frueher als Strassendieb gelebt hat..."
          rows={4}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          minLength={10}
          maxLength={2000}
          required
        />
        <div className="text-xs text-neutral-500">{concept.length}/2000</div>
      </div>

      <Button
        onClick={() => onSubmit(concept)}
        disabled={concept.trim().length < 10 || loading}
        className="w-full"
      >
        {loading ? 'KI denkt nach...' : 'Vorschlaege generieren'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: SuggestionsStep — display and pick AI suggestions**

`apps/web/components/character/steps/SuggestionsStep.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SuggestionCard } from '../SuggestionCard'
import type { CharacterSuggestion } from '@dndmanager/ai-services'

interface SuggestionsStepProps {
  suggestion: CharacterSuggestion
  onConfirm: (picks: { ancestry: string; class_: string; background: string; skills: string[] }) => void
  onBack: () => void
}

export function SuggestionsStep({ suggestion, onConfirm, onBack }: SuggestionsStepProps) {
  const [selectedAncestry, setSelectedAncestry] = useState(suggestion.ancestries[0]?.name ?? '')
  const [selectedClass, setSelectedClass] = useState(suggestion.classes[0]?.name ?? '')
  const [selectedBackground, setSelectedBackground] = useState(suggestion.backgrounds[0]?.name ?? '')
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    suggestion.skills.slice(0, 3).map((s) => s.name)
  )

  function toggleSkill(name: string) {
    setSelectedSkills((prev) =>
      prev.includes(name)
        ? prev.filter((s) => s !== name)
        : prev.length < 5
          ? [...prev, name]
          : prev
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">KI-Vorschlaege</h2>
        <p className="text-sm text-neutral-400">{suggestion.conceptSummary}</p>
      </div>

      {/* Ancestry */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-300">Abstammung (Ancestry)</h3>
        <div className="grid gap-2">
          {suggestion.ancestries.map((a) => (
            <SuggestionCard
              key={a.name}
              name={a.name}
              description={a.description}
              reasoning={a.reasoning}
              selected={selectedAncestry === a.name}
              onSelect={() => setSelectedAncestry(a.name)}
            />
          ))}
        </div>
      </div>

      {/* Class */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-300">Klasse (Class)</h3>
        <div className="grid gap-2">
          {suggestion.classes.map((c) => (
            <SuggestionCard
              key={c.name}
              name={c.name}
              description={c.description}
              reasoning={c.reasoning}
              selected={selectedClass === c.name}
              onSelect={() => setSelectedClass(c.name)}
            />
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-300">Hintergrund (Background)</h3>
        <div className="grid gap-2">
          {suggestion.backgrounds.map((b) => (
            <SuggestionCard
              key={b.name}
              name={b.name}
              description={b.description}
              reasoning={b.reasoning}
              selected={selectedBackground === b.name}
              onSelect={() => setSelectedBackground(b.name)}
            />
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-300">
          Fertigkeiten (max. 5 auswaehlen)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {suggestion.skills.map((s) => (
            <SuggestionCard
              key={s.name}
              name={s.name}
              description={s.description}
              reasoning={s.reasoning}
              selected={selectedSkills.includes(s.name)}
              onSelect={() => toggleSkill(s.name)}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Zurueck
        </Button>
        <Button
          onClick={() =>
            onConfirm({
              ancestry: selectedAncestry,
              class_: selectedClass,
              background: selectedBackground,
              skills: selectedSkills,
            })
          }
          className="flex-1"
        >
          Weiter
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: AbilitiesStep — ability score assignment**

`apps/web/components/character/steps/AbilitiesStep.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AbilityId } from '@dndmanager/pf2e-engine'
import type { AbilityBoostSuggestion } from '@dndmanager/ai-services'

const ABILITY_LABELS: Record<AbilityId, string> = {
  str: 'Staerke (STR)',
  dex: 'Geschicklichkeit (DEX)',
  con: 'Konstitution (CON)',
  int: 'Intelligenz (INT)',
  wis: 'Weisheit (WIS)',
  cha: 'Charisma (CHA)',
}

const BASE_SCORE = 10
const BOOST_VALUE = 2
const FREE_BOOSTS = 4

interface AbilitiesStepProps {
  suggestions: AbilityBoostSuggestion[]
  onConfirm: (scores: Record<AbilityId, number>) => void
  onBack: () => void
}

export function AbilitiesStep({ suggestions, onConfirm, onBack }: AbilitiesStepProps) {
  // Pre-select boosts based on AI suggestion priorities
  const initialBoosts = new Set<AbilityId>(
    suggestions
      .filter((s) => s.priority === 'key' || s.priority === 'high')
      .slice(0, FREE_BOOSTS)
      .map((s) => s.ability)
  )

  const [boosts, setBoosts] = useState<Set<AbilityId>>(initialBoosts)

  function toggleBoost(ability: AbilityId) {
    setBoosts((prev) => {
      const next = new Set(prev)
      if (next.has(ability)) {
        next.delete(ability)
      } else if (next.size < FREE_BOOSTS) {
        next.add(ability)
      }
      return next
    })
  }

  function getScore(ability: AbilityId): number {
    return BASE_SCORE + (boosts.has(ability) ? BOOST_VALUE : 0)
  }

  function getModifier(score: number): string {
    const mod = Math.floor((score - 10) / 2)
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  function handleConfirm() {
    const scores = {} as Record<AbilityId, number>
    for (const id of Object.keys(ABILITY_LABELS) as AbilityId[]) {
      scores[id] = getScore(id)
    }
    onConfirm(scores)
  }

  const priorityLabel: Record<string, string> = {
    key: 'Primaer',
    high: 'Hoch',
    medium: 'Mittel',
    low: 'Niedrig',
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Attributswerte</h2>
        <p className="text-sm text-neutral-400">
          Waehle {FREE_BOOSTS} Attribute fuer freie Boosts (+{BOOST_VALUE}).
          Die KI-Empfehlung ist vorausgewaehlt.
        </p>
      </div>

      <div className="space-y-2">
        {(Object.keys(ABILITY_LABELS) as AbilityId[]).map((ability) => {
          const aiSuggestion = suggestions.find((s) => s.ability === ability)
          const score = getScore(ability)
          const isSelected = boosts.has(ability)

          return (
            <button
              key={ability}
              type="button"
              onClick={() => toggleBoost(ability)}
              className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-neutral-700 bg-neutral-800 hover:border-neutral-500'
              }`}
            >
              <div>
                <span className="text-sm font-medium text-white">
                  {ABILITY_LABELS[ability]}
                </span>
                {aiSuggestion && (
                  <span className="ml-2 text-xs text-neutral-500">
                    KI: {priorityLabel[aiSuggestion.priority]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-neutral-300">{score}</span>
                <span className="text-xs font-mono text-neutral-500">
                  ({getModifier(score)})
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="text-xs text-neutral-500">
        {boosts.size}/{FREE_BOOSTS} Boosts gewaehlt
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Zurueck
        </Button>
        <Button onClick={handleConfirm} disabled={boosts.size !== FREE_BOOSTS} className="flex-1">
          Weiter
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: ReviewStep — final review and save**

`apps/web/components/character/steps/ReviewStep.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AbilityId } from '@dndmanager/pf2e-engine'

const ABILITY_LABELS: Record<AbilityId, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
}

interface ReviewStepProps {
  ancestry: string
  class_: string
  background: string
  skills: string[]
  abilityScores: Record<AbilityId, number>
  nameSuggestions?: string[]
  saving: boolean
  onSave: (name: string) => void
  onBack: () => void
}

export function ReviewStep({
  ancestry,
  class_,
  background,
  skills,
  abilityScores,
  nameSuggestions,
  saving,
  onSave,
  onBack,
}: ReviewStepProps) {
  const [name, setName] = useState('')

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Zusammenfassung</h2>

      <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Abstammung</span>
          <span className="text-white font-medium">{ancestry}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Klasse</span>
          <span className="text-white font-medium">{class_}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Hintergrund</span>
          <span className="text-white font-medium">{background}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Fertigkeiten</span>
          <span className="text-white font-medium">{skills.join(', ')}</span>
        </div>
        <div className="border-t border-neutral-700 pt-2">
          <div className="grid grid-cols-6 gap-2 text-center">
            {(Object.keys(ABILITY_LABELS) as AbilityId[]).map((id) => (
              <div key={id}>
                <div className="text-xs text-neutral-500">{ABILITY_LABELS[id]}</div>
                <div className="text-sm font-mono text-white">{abilityScores[id]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="charName">Charaktername</Label>
        <Input
          id="charName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Thorin Eisenschild"
          required
        />
        {nameSuggestions && nameSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-neutral-500">Vorschlaege:</span>
            {nameSuggestions.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setName(n)}
                className="rounded bg-neutral-700 px-2 py-0.5 text-xs text-neutral-300 hover:bg-neutral-600"
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Zurueck
        </Button>
        <Button
          onClick={() => onSave(name)}
          disabled={!name.trim() || saving}
          className="flex-1"
        >
          {saving ? 'Speichern...' : 'Charakter erstellen'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/character/steps/
git commit -m "feat(web): add character wizard step components (Concept, Suggestions, Abilities, Review)"
```

---

### Task 9: Character Wizard Container

**Files:**
- Create: `apps/web/components/character/CharacterWizard.tsx`

- [ ] **Step 1: Create the wizard container**

`apps/web/components/character/CharacterWizard.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConceptStep } from './steps/ConceptStep'
import { SuggestionsStep } from './steps/SuggestionsStep'
import { AbilitiesStep } from './steps/AbilitiesStep'
import { ReviewStep } from './steps/ReviewStep'
import type { CharacterSuggestion } from '@dndmanager/ai-services'
import type { AbilityId } from '@dndmanager/pf2e-engine'

type WizardStep = 'concept' | 'suggestions' | 'abilities' | 'review'

interface CharacterWizardProps {
  campaignId: string
}

export function CharacterWizard({ campaignId }: CharacterWizardProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<WizardStep>('concept')
  const [concept, setConcept] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI response
  const [suggestion, setSuggestion] = useState<CharacterSuggestion | null>(null)

  // Player picks
  const [picks, setPicks] = useState<{
    ancestry: string
    class_: string
    background: string
    skills: string[]
  } | null>(null)
  const [abilityScores, setAbilityScores] = useState<Record<AbilityId, number> | null>(null)

  async function handleConceptSubmit(text: string) {
    setConcept(text)
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/character-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept: text, level: 1 }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Anfrage fehlgeschlagen')
      }

      const data: CharacterSuggestion = await res.json()
      setSuggestion(data)
      setStep('suggestions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  function handleSuggestionsConfirm(chosen: {
    ancestry: string
    class_: string
    background: string
    skills: string[]
  }) {
    setPicks(chosen)
    setStep('abilities')
  }

  function handleAbilitiesConfirm(scores: Record<AbilityId, number>) {
    setAbilityScores(scores)
    setStep('review')
  }

  async function handleSave(name: string) {
    if (!picks || !abilityScores) return

    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Nicht angemeldet')
      setSaving(false)
      return
    }

    const characterData = {
      concept,
      ancestry: picks.ancestry,
      class: picks.class_,
      background: picks.background,
      skills: picks.skills,
      abilityScores,
    }

    const { error: dbError } = await supabase.from('characters').insert({
      name,
      owner_id: user.id,
      campaign_id: campaignId,
      level: 1,
      xp: 0,
      data: characterData,
    })

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    router.push(`/campaigns/${campaignId}`)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress indicator */}
      <div className="mb-6 flex gap-1">
        {(['concept', 'suggestions', 'abilities', 'review'] as WizardStep[]).map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              i <= ['concept', 'suggestions', 'abilities', 'review'].indexOf(step)
                ? 'bg-amber-500'
                : 'bg-neutral-700'
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {step === 'concept' && (
        <ConceptStep
          initialConcept={concept}
          loading={loading}
          onSubmit={handleConceptSubmit}
        />
      )}

      {step === 'suggestions' && suggestion && (
        <SuggestionsStep
          suggestion={suggestion}
          onConfirm={handleSuggestionsConfirm}
          onBack={() => setStep('concept')}
        />
      )}

      {step === 'abilities' && suggestion && (
        <AbilitiesStep
          suggestions={suggestion.abilityBoosts}
          onConfirm={handleAbilitiesConfirm}
          onBack={() => setStep('suggestions')}
        />
      )}

      {step === 'review' && picks && abilityScores && (
        <ReviewStep
          ancestry={picks.ancestry}
          class_={picks.class_}
          background={picks.background}
          skills={picks.skills}
          abilityScores={abilityScores}
          nameSuggestions={suggestion?.nameSuggestions}
          saving={saving}
          onSave={handleSave}
          onBack={() => setStep('abilities')}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/character/CharacterWizard.tsx
git commit -m "feat(web): add CharacterWizard multi-step container with AI integration"
```

---

### Task 10: Integrate Wizard into CharacterForm

**Files:**
- Modify: `apps/web/components/character/CharacterForm.tsx`

- [ ] **Step 1: Update CharacterForm to offer both paths**

Replace the contents of `apps/web/components/character/CharacterForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CharacterWizard } from './CharacterWizard'

interface CharacterFormProps {
  campaignId: string
}

export function CharacterForm({ campaignId }: CharacterFormProps) {
  const [mode, setMode] = useState<'choose' | 'ai' | 'manual'>('choose')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleManualSubmit(e: React.FormEvent) {
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

  // Mode selection screen
  if (mode === 'choose') {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Wie moechtest du deinen Charakter erstellen?</h2>
        <div className="grid gap-3">
          <button
            onClick={() => setMode('ai')}
            className="rounded-lg border border-amber-700 bg-amber-900/20 p-4 text-left transition-colors hover:bg-amber-900/40"
          >
            <div className="font-medium text-amber-400">KI-Assistent</div>
            <div className="text-sm text-neutral-400">
              Beschreibe dein Charakterkonzept und erhalte passende PF2e-Vorschlaege.
            </div>
          </button>
          <button
            onClick={() => setMode('manual')}
            className="rounded-lg border border-neutral-700 bg-neutral-800 p-4 text-left transition-colors hover:border-neutral-500"
          >
            <div className="font-medium text-neutral-300">Manuell</div>
            <div className="text-sm text-neutral-500">
              Erstelle einen einfachen Charakter mit Name.
            </div>
          </button>
        </div>
      </div>
    )
  }

  // AI wizard
  if (mode === 'ai') {
    return (
      <div>
        <button
          onClick={() => setMode('choose')}
          className="mb-4 text-sm text-neutral-500 hover:text-neutral-300"
        >
          &larr; Zurueck zur Auswahl
        </button>
        <CharacterWizard campaignId={campaignId} />
      </div>
    )
  }

  // Manual form (existing behavior)
  return (
    <div>
      <button
        onClick={() => setMode('choose')}
        className="mb-4 text-sm text-neutral-500 hover:text-neutral-300"
      >
        &larr; Zurueck zur Auswahl
      </button>
      <form onSubmit={handleManualSubmit} className="space-y-4">
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
          Weitere Charakter-Optionen (Ancestry, Class, Abilities) koennen ueber den KI-Assistenten
          gewaehlt werden.
        </p>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Erstellen...' : 'Charakter erstellen'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/character/CharacterForm.tsx
git commit -m "feat(web): integrate AI wizard into CharacterForm with mode selection"
```

---

### Task 11: Add ai-services dependency to web app

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add workspace dependency**

```bash
cd apps/web && pnpm add @dndmanager/ai-services@workspace:*
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): add @dndmanager/ai-services workspace dependency"
```

---

### Task 12: Final verification

- [ ] **Step 1: Run typecheck**

```bash
pnpm turbo typecheck
```

- [ ] **Step 2: Run tests**

```bash
pnpm turbo test
```

- [ ] **Step 3: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: resolve type/lint issues from AI character creation integration"
```
