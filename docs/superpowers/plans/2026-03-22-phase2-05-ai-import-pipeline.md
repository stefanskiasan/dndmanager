# Phase 2.5: AI Import Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an automated data import pipeline that fetches Pathfinder 2e Regelwerk data from the Foundry VTT pf2e-system GitHub repository (structured JSON), parses it into our domain schemas using Zod validation, and loads it into Supabase tables. This replaces hardcoded placeholder data throughout the platform with real PF2e content.

**Architecture:** The pipeline lives in `packages/ai-services/` and consists of four stages: Fetch (download JSON from GitHub), Parse (transform Foundry JSON into our schema), Validate (Zod schemas enforce data integrity), and Load (insert into Supabase). A CLI script orchestrates the full pipeline. For MVP we use the Foundry VTT pf2e JSON pack files which are structured and machine-readable — no HTML scraping needed.

**Tech Stack:** Node.js, Zod, Supabase JS client, vitest

**Data Source:** `https://github.com/foundryvtt/pf2e` — the official Foundry VTT PF2e system. Pack data lives in `packs/` as JSON files organized by type (ancestries, classes, feats, spells, equipment, bestiary).

---

## File Structure

```
packages/ai-services/
├── package.json                          → Add zod, @supabase/supabase-js deps
├── src/
│   ├── index.ts                          → Re-export public API
│   ├── schemas/
│   │   ├── ancestry.ts                   → Zod schema for Ancestry
│   │   ├── class.ts                      → Zod schema for Class
│   │   ├── feat.ts                       → Zod schema for Feat
│   │   ├── spell.ts                      → Zod schema for Spell
│   │   ├── item.ts                       → Zod schema for Item (equipment)
│   │   ├── monster.ts                    → Zod schema for Monster/NPC
│   │   └── index.ts                      → Re-export all schemas
│   ├── fetcher/
│   │   ├── github-fetcher.ts             → Download JSON packs from GitHub
│   │   └── index.ts                      → Re-export fetcher
│   ├── parser/
│   │   ├── foundry-parser.ts             → Transform Foundry JSON → our schemas
│   │   ├── ancestry-parser.ts            → Ancestry-specific parsing
│   │   ├── class-parser.ts               → Class-specific parsing
│   │   ├── feat-parser.ts                → Feat-specific parsing
│   │   ├── spell-parser.ts               → Spell-specific parsing
│   │   ├── item-parser.ts                → Item-specific parsing
│   │   ├── monster-parser.ts             → Monster-specific parsing
│   │   └── index.ts                      → Re-export parsers
│   ├── loader/
│   │   ├── supabase-loader.ts            → Batch upsert into Supabase tables
│   │   └── index.ts                      → Re-export loader
│   ├── pipeline.ts                       → Orchestrates fetch → parse → validate → load
│   └── cli.ts                            → CLI entry point for `pnpm data:import`
├── __tests__/
│   ├── schemas/
│   │   ├── ancestry.test.ts
│   │   ├── class.test.ts
│   │   ├── feat.test.ts
│   │   ├── spell.test.ts
│   │   ├── item.test.ts
│   │   └── monster.test.ts
│   ├── parser/
│   │   ├── ancestry-parser.test.ts
│   │   ├── class-parser.test.ts
│   │   ├── feat-parser.test.ts
│   │   ├── spell-parser.test.ts
│   │   ├── item-parser.test.ts
│   │   └── monster-parser.test.ts
│   ├── fetcher/
│   │   └── github-fetcher.test.ts
│   ├── loader/
│   │   └── supabase-loader.test.ts
│   └── pipeline.test.ts

supabase/migrations/
└── 00003_pf2e_data_tables.sql            → Tables for imported PF2e data
```

---

### Task 1: Zod Schemas for PF2e Data Types

**Files:**
- Create: `packages/ai-services/src/schemas/ancestry.ts`
- Create: `packages/ai-services/src/schemas/class.ts`
- Create: `packages/ai-services/src/schemas/feat.ts`
- Create: `packages/ai-services/src/schemas/spell.ts`
- Create: `packages/ai-services/src/schemas/item.ts`
- Create: `packages/ai-services/src/schemas/monster.ts`
- Create: `packages/ai-services/src/schemas/index.ts`
- Create: `packages/ai-services/__tests__/schemas/ancestry.test.ts`
- Create: `packages/ai-services/__tests__/schemas/class.test.ts`
- Create: `packages/ai-services/__tests__/schemas/feat.test.ts`
- Create: `packages/ai-services/__tests__/schemas/spell.test.ts`
- Create: `packages/ai-services/__tests__/schemas/item.test.ts`
- Create: `packages/ai-services/__tests__/schemas/monster.test.ts`
- Modify: `packages/ai-services/package.json`

- [ ] **Step 1: Add zod dependency**

Update `packages/ai-services/package.json`:
```json
{
  "name": "@dndmanager/ai-services",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "data:import": "tsx src/cli.ts"
  },
  "dependencies": {
    "@dndmanager/shared": "workspace:*",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "vitest": "^3.0.0"
  }
}
```

Run: `cd packages/ai-services && pnpm install`

- [ ] **Step 2: Create Ancestry schema**

`packages/ai-services/src/schemas/ancestry.ts`:
```ts
import { z } from 'zod'

export const AbilityBoostSchema = z.object({
  type: z.enum(['fixed', 'free']),
  ability: z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']).optional(),
})

export const AncestryFeatureSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
})

export const AncestrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceId: z.string().min(1),
  hp: z.number().int().positive(),
  size: z.enum(['tiny', 'small', 'medium', 'large']),
  speed: z.number().int().positive(),
  abilityBoosts: z.array(AbilityBoostSchema).min(1),
  abilityFlaws: z.array(AbilityBoostSchema).default([]),
  languages: z.array(z.string()).min(1),
  traits: z.array(z.string()).default([]),
  features: z.array(AncestryFeatureSchema).default([]),
  description: z.string().default(''),
  source: z.string().default('Pathfinder Core Rulebook'),
})

export type Ancestry = z.infer<typeof AncestrySchema>
export type AbilityBoost = z.infer<typeof AbilityBoostSchema>
```

- [ ] **Step 3: Create Class schema**

`packages/ai-services/src/schemas/class.ts`:
```ts
import { z } from 'zod'

export const ClassProficiencySchema = z.object({
  category: z.string().min(1),
  rank: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
})

export const ClassSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceId: z.string().min(1),
  hp: z.number().int().positive(),
  keyAbility: z.array(z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha'])).min(1),
  proficiencies: z.array(ClassProficiencySchema).default([]),
  skillTrainedCount: z.number().int().nonnegative(),
  attackProficiency: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
  defenseProficiency: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
  perception: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
  fortitude: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
  reflex: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
  will: z.enum(['untrained', 'trained', 'expert', 'master', 'legendary']),
  description: z.string().default(''),
  source: z.string().default('Pathfinder Core Rulebook'),
})

export type PF2eClass = z.infer<typeof ClassSchema>
```

- [ ] **Step 4: Create Feat schema**

`packages/ai-services/src/schemas/feat.ts`:
```ts
import { z } from 'zod'

export const FeatPrerequisiteSchema = z.object({
  type: z.enum(['skill', 'feat', 'ability', 'level', 'other']),
  value: z.string(),
})

export const FeatSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceId: z.string().min(1),
  level: z.number().int().nonnegative(),
  featType: z.enum(['ancestry', 'class', 'skill', 'general', 'archetype']),
  actionCost: z.enum(['free', 'reaction', '1', '2', '3', 'passive']).default('passive'),
  traits: z.array(z.string()).default([]),
  prerequisites: z.array(FeatPrerequisiteSchema).default([]),
  description: z.string().default(''),
  source: z.string().default('Pathfinder Core Rulebook'),
})

export type Feat = z.infer<typeof FeatSchema>
```

- [ ] **Step 5: Create Spell schema**

`packages/ai-services/src/schemas/spell.ts`:
```ts
import { z } from 'zod'

export const SpellDamageSchema = z.object({
  formula: z.string(),
  type: z.string(),
}).optional()

export const SpellAreaSchema = z.object({
  type: z.enum(['burst', 'cone', 'emanation', 'line', 'wall']),
  size: z.number().int().positive(),
}).optional()

export const SpellSaveSchema = z.object({
  type: z.enum(['fortitude', 'reflex', 'will']),
  basic: z.boolean().default(false),
}).optional()

export const SpellSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceId: z.string().min(1),
  level: z.number().int().min(0).max(10),
  traditions: z.array(z.enum(['arcane', 'divine', 'occult', 'primal'])).min(1),
  school: z.string().optional(),
  components: z.array(z.enum(['focus', 'material', 'somatic', 'verbal'])).default([]),
  castActions: z.union([z.enum(['free', 'reaction']), z.number().int().min(1).max(3)]),
  range: z.number().int().nonnegative().optional(),
  area: SpellAreaSchema,
  save: SpellSaveSchema,
  damage: SpellDamageSchema,
  duration: z.string().optional(),
  sustained: z.boolean().default(false),
  traits: z.array(z.string()).default([]),
  description: z.string().default(''),
  heightening: z.record(z.string(), z.string()).optional(),
  source: z.string().default('Pathfinder Core Rulebook'),
})

export type Spell = z.infer<typeof SpellSchema>
```

- [ ] **Step 6: Create Item schema**

`packages/ai-services/src/schemas/item.ts`:
```ts
import { z } from 'zod'

export const WeaponStatsSchema = z.object({
  damage: z.string(),
  damageType: z.enum(['bludgeoning', 'piercing', 'slashing']),
  hands: z.enum(['1', '1+', '2']),
  range: z.number().int().nonnegative().optional(),
  reload: z.number().int().nonnegative().optional(),
  group: z.string(),
  category: z.enum(['simple', 'martial', 'advanced', 'unarmed']),
})

export const ArmorStatsSchema = z.object({
  acBonus: z.number().int().nonnegative(),
  dexCap: z.number().int().nonnegative().optional(),
  checkPenalty: z.number().int().nonpositive().default(0),
  speedPenalty: z.number().int().nonpositive().default(0),
  strength: z.number().int().nonnegative().optional(),
  group: z.string(),
  category: z.enum(['unarmored', 'light', 'medium', 'heavy']),
})

export const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceId: z.string().min(1),
  itemType: z.enum(['weapon', 'armor', 'shield', 'consumable', 'equipment', 'treasure']),
  level: z.number().int().nonnegative().default(0),
  price: z.object({
    gp: z.number().nonnegative().default(0),
    sp: z.number().nonnegative().default(0),
    cp: z.number().nonnegative().default(0),
  }).default({ gp: 0, sp: 0, cp: 0 }),
  bulk: z.union([z.number().nonnegative(), z.literal('L')]).default(0),
  traits: z.array(z.string()).default([]),
  weaponStats: WeaponStatsSchema.optional(),
  armorStats: ArmorStatsSchema.optional(),
  description: z.string().default(''),
  source: z.string().default('Pathfinder Core Rulebook'),
})

export type Item = z.infer<typeof ItemSchema>
```

- [ ] **Step 7: Create Monster schema**

`packages/ai-services/src/schemas/monster.ts`:
```ts
import { z } from 'zod'

export const MonsterAbilityScoresSchema = z.object({
  str: z.number().int(),
  dex: z.number().int(),
  con: z.number().int(),
  int: z.number().int(),
  wis: z.number().int(),
  cha: z.number().int(),
})

export const MonsterStrikeSchema = z.object({
  name: z.string().min(1),
  attackBonus: z.number().int(),
  damage: z.string(),
  damageType: z.string(),
  traits: z.array(z.string()).default([]),
})

export const MonsterSpellcastingSchema = z.object({
  tradition: z.enum(['arcane', 'divine', 'occult', 'primal']),
  dc: z.number().int(),
  attack: z.number().int().optional(),
  spells: z.record(z.string(), z.array(z.string())),
})

export const MonsterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceId: z.string().min(1),
  level: z.number().int(),
  traits: z.array(z.string()).default([]),
  size: z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']),
  alignment: z.string().optional(),
  hp: z.number().int().positive(),
  ac: z.number().int().positive(),
  fortitude: z.number().int(),
  reflex: z.number().int(),
  will: z.number().int(),
  perception: z.number().int(),
  speed: z.number().int().nonnegative(),
  abilities: MonsterAbilityScoresSchema,
  immunities: z.array(z.string()).default([]),
  resistances: z.record(z.string(), z.number()).default({}),
  weaknesses: z.record(z.string(), z.number()).default({}),
  strikes: z.array(MonsterStrikeSchema).default([]),
  spellcasting: MonsterSpellcastingSchema.optional(),
  specialAbilities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    actionCost: z.enum(['free', 'reaction', '1', '2', '3', 'passive']).default('passive'),
  })).default([]),
  description: z.string().default(''),
  source: z.string().default('Pathfinder Bestiary'),
})

export type Monster = z.infer<typeof MonsterSchema>
```

- [ ] **Step 8: Create schemas index**

`packages/ai-services/src/schemas/index.ts`:
```ts
export { AncestrySchema, AbilityBoostSchema, AncestryFeatureSchema } from './ancestry'
export type { Ancestry, AbilityBoost } from './ancestry'

export { ClassSchema, ClassProficiencySchema } from './class'
export type { PF2eClass } from './class'

export { FeatSchema, FeatPrerequisiteSchema } from './feat'
export type { Feat } from './feat'

export { SpellSchema, SpellDamageSchema, SpellAreaSchema, SpellSaveSchema } from './spell'
export type { Spell } from './spell'

export { ItemSchema, WeaponStatsSchema, ArmorStatsSchema } from './item'
export type { Item } from './item'

export { MonsterSchema, MonsterAbilityScoresSchema, MonsterStrikeSchema } from './monster'
export type { Monster } from './monster'
```

- [ ] **Step 9: Write schema tests**

`packages/ai-services/__tests__/schemas/ancestry.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { AncestrySchema } from '../../src/schemas/ancestry'

describe('AncestrySchema', () => {
  const validAncestry = {
    id: 'human',
    name: 'Human',
    sourceId: 'foundry-human',
    hp: 8,
    size: 'medium',
    speed: 25,
    abilityBoosts: [
      { type: 'free' },
      { type: 'free' },
    ],
    languages: ['Common'],
    traits: ['human', 'humanoid'],
  }

  it('accepts valid ancestry data', () => {
    const result = AncestrySchema.safeParse(validAncestry)
    expect(result.success).toBe(true)
  })

  it('rejects ancestry without name', () => {
    const result = AncestrySchema.safeParse({ ...validAncestry, name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid size', () => {
    const result = AncestrySchema.safeParse({ ...validAncestry, size: 'colossal' })
    expect(result.success).toBe(false)
  })

  it('rejects negative hp', () => {
    const result = AncestrySchema.safeParse({ ...validAncestry, hp: -1 })
    expect(result.success).toBe(false)
  })

  it('applies defaults for optional fields', () => {
    const result = AncestrySchema.parse(validAncestry)
    expect(result.abilityFlaws).toEqual([])
    expect(result.features).toEqual([])
    expect(result.traits).toEqual(['human', 'humanoid'])
    expect(result.source).toBe('Pathfinder Core Rulebook')
  })
})
```

`packages/ai-services/__tests__/schemas/class.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { ClassSchema } from '../../src/schemas/class'

describe('ClassSchema', () => {
  const validClass = {
    id: 'fighter',
    name: 'Fighter',
    sourceId: 'foundry-fighter',
    hp: 10,
    keyAbility: ['str', 'dex'],
    skillTrainedCount: 3,
    attackProficiency: 'expert',
    defenseProficiency: 'trained',
    perception: 'expert',
    fortitude: 'expert',
    reflex: 'expert',
    will: 'trained',
  }

  it('accepts valid class data', () => {
    const result = ClassSchema.safeParse(validClass)
    expect(result.success).toBe(true)
  })

  it('rejects class with zero hp', () => {
    const result = ClassSchema.safeParse({ ...validClass, hp: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects empty keyAbility', () => {
    const result = ClassSchema.safeParse({ ...validClass, keyAbility: [] })
    expect(result.success).toBe(false)
  })
})
```

`packages/ai-services/__tests__/schemas/feat.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { FeatSchema } from '../../src/schemas/feat'

describe('FeatSchema', () => {
  const validFeat = {
    id: 'power-attack',
    name: 'Power Attack',
    sourceId: 'foundry-power-attack',
    level: 1,
    featType: 'class',
    actionCost: '2',
    traits: ['fighter', 'flourish'],
    description: 'Make a mighty strike',
  }

  it('accepts valid feat data', () => {
    const result = FeatSchema.safeParse(validFeat)
    expect(result.success).toBe(true)
  })

  it('rejects negative level', () => {
    const result = FeatSchema.safeParse({ ...validFeat, level: -1 })
    expect(result.success).toBe(false)
  })

  it('defaults to passive if no actionCost', () => {
    const { actionCost, ...noAction } = validFeat
    const result = FeatSchema.parse(noAction)
    expect(result.actionCost).toBe('passive')
  })
})
```

`packages/ai-services/__tests__/schemas/spell.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { SpellSchema } from '../../src/schemas/spell'

describe('SpellSchema', () => {
  const validSpell = {
    id: 'fireball',
    name: 'Fireball',
    sourceId: 'foundry-fireball',
    level: 3,
    traditions: ['arcane', 'primal'],
    components: ['somatic', 'verbal'],
    castActions: 2,
    range: 500,
    area: { type: 'burst', size: 20 },
    save: { type: 'reflex', basic: true },
    damage: { formula: '6d6', type: 'fire' },
  }

  it('accepts valid spell data', () => {
    const result = SpellSchema.safeParse(validSpell)
    expect(result.success).toBe(true)
  })

  it('rejects level above 10', () => {
    const result = SpellSchema.safeParse({ ...validSpell, level: 11 })
    expect(result.success).toBe(false)
  })

  it('rejects empty traditions', () => {
    const result = SpellSchema.safeParse({ ...validSpell, traditions: [] })
    expect(result.success).toBe(false)
  })

  it('accepts cantrips at level 0', () => {
    const cantrip = { ...validSpell, level: 0, id: 'daze', name: 'Daze' }
    const result = SpellSchema.safeParse(cantrip)
    expect(result.success).toBe(true)
  })
})
```

`packages/ai-services/__tests__/schemas/item.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { ItemSchema } from '../../src/schemas/item'

describe('ItemSchema', () => {
  const validWeapon = {
    id: 'longsword',
    name: 'Longsword',
    sourceId: 'foundry-longsword',
    itemType: 'weapon',
    level: 0,
    price: { gp: 1, sp: 0, cp: 0 },
    bulk: 1,
    traits: ['versatile P'],
    weaponStats: {
      damage: '1d8',
      damageType: 'slashing',
      hands: '1',
      group: 'sword',
      category: 'martial',
    },
  }

  it('accepts valid weapon', () => {
    const result = ItemSchema.safeParse(validWeapon)
    expect(result.success).toBe(true)
  })

  it('accepts L bulk for light items', () => {
    const result = ItemSchema.safeParse({ ...validWeapon, bulk: 'L' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid item type', () => {
    const result = ItemSchema.safeParse({ ...validWeapon, itemType: 'invalid' })
    expect(result.success).toBe(false)
  })
})
```

`packages/ai-services/__tests__/schemas/monster.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { MonsterSchema } from '../../src/schemas/monster'

describe('MonsterSchema', () => {
  const validMonster = {
    id: 'goblin-warrior',
    name: 'Goblin Warrior',
    sourceId: 'foundry-goblin-warrior',
    level: -1,
    traits: ['goblin', 'humanoid'],
    size: 'small',
    hp: 6,
    ac: 16,
    fortitude: 2,
    reflex: 7,
    will: 3,
    perception: 3,
    speed: 25,
    abilities: { str: 0, dex: 3, con: 0, int: -1, wis: 1, cha: -1 },
    strikes: [
      {
        name: 'Dogslicer',
        attackBonus: 8,
        damage: '1d6+1',
        damageType: 'slashing',
        traits: ['agile', 'backstabber', 'finesse'],
      },
    ],
  }

  it('accepts valid monster data', () => {
    const result = MonsterSchema.safeParse(validMonster)
    expect(result.success).toBe(true)
  })

  it('accepts negative level for weak creatures', () => {
    const result = MonsterSchema.safeParse(validMonster)
    expect(result.success).toBe(true)
    expect(result.data?.level).toBe(-1)
  })

  it('rejects zero hp', () => {
    const result = MonsterSchema.safeParse({ ...validMonster, hp: 0 })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 10: Run tests**

```bash
cd packages/ai-services && pnpm test
```

Expected: All schema tests pass.

- [ ] **Step 11: Commit**

```bash
git add packages/ai-services/
git commit -m "feat(ai-services): add Zod schemas for PF2e data types (Ancestry, Class, Feat, Spell, Item, Monster)"
```

---

### Task 2: GitHub Fetcher Module

**Files:**
- Create: `packages/ai-services/src/fetcher/github-fetcher.ts`
- Create: `packages/ai-services/src/fetcher/index.ts`
- Create: `packages/ai-services/__tests__/fetcher/github-fetcher.test.ts`

- [ ] **Step 1: Create GitHub fetcher**

`packages/ai-services/src/fetcher/github-fetcher.ts`:
```ts
/**
 * Fetches PF2e data pack JSON files from the Foundry VTT pf2e GitHub repository.
 * Uses the GitHub raw content URLs to download JSON pack data.
 *
 * Source: https://github.com/foundryvtt/pf2e
 * Pack data: packs/ directory, organized by type
 */

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/foundryvtt/pf2e/master'

export type PackType = 'ancestries' | 'classes' | 'feats' | 'spells' | 'equipment' | 'bestiary'

/** Maps our pack types to the Foundry repo paths */
const PACK_PATHS: Record<PackType, string> = {
  ancestries: 'packs/ancestries',
  classes: 'packs/classes',
  feats: 'packs/feats',
  spells: 'packs/spells',
  equipment: 'packs/equipment',
  bestiary: 'packs/pathfinder-bestiary',
}

export interface FetchResult {
  packType: PackType
  items: unknown[]
  fetchedAt: string
  errors: string[]
}

/**
 * Fetches the directory listing from GitHub API to discover JSON files,
 * then downloads each file.
 */
export async function fetchPack(
  packType: PackType,
  options?: { signal?: AbortSignal; limit?: number }
): Promise<FetchResult> {
  const errors: string[] = []
  const path = PACK_PATHS[packType]

  // Use GitHub API to list directory contents
  const apiUrl = `https://api.github.com/repos/foundryvtt/pf2e/contents/${path}`
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'dndmanager-import',
  }

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const dirResponse = await fetch(apiUrl, {
    headers,
    signal: options?.signal,
  })

  if (!dirResponse.ok) {
    throw new Error(`Failed to list pack directory ${path}: ${dirResponse.status} ${dirResponse.statusText}`)
  }

  const dirEntries = (await dirResponse.json()) as Array<{
    name: string
    download_url: string
  }>

  const jsonFiles = dirEntries
    .filter((e) => e.name.endsWith('.json'))
    .slice(0, options?.limit)

  const items: unknown[] = []

  for (const file of jsonFiles) {
    try {
      const res = await fetch(file.download_url, { signal: options?.signal })
      if (!res.ok) {
        errors.push(`Failed to fetch ${file.name}: ${res.status}`)
        continue
      }
      const data = await res.json()
      items.push(data)
    } catch (err) {
      errors.push(`Error fetching ${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return {
    packType,
    items,
    fetchedAt: new Date().toISOString(),
    errors,
  }
}

/**
 * Fetches all pack types. Returns results keyed by pack type.
 */
export async function fetchAllPacks(
  options?: { signal?: AbortSignal; limit?: number; types?: PackType[] }
): Promise<Map<PackType, FetchResult>> {
  const types = options?.types ?? (['ancestries', 'classes', 'feats', 'spells', 'equipment', 'bestiary'] as PackType[])
  const results = new Map<PackType, FetchResult>()

  for (const type of types) {
    console.log(`Fetching ${type}...`)
    const result = await fetchPack(type, options)
    results.set(type, result)
    console.log(`  → ${result.items.length} items, ${result.errors.length} errors`)
  }

  return results
}
```

`packages/ai-services/src/fetcher/index.ts`:
```ts
export { fetchPack, fetchAllPacks } from './github-fetcher'
export type { PackType, FetchResult } from './github-fetcher'
```

- [ ] **Step 2: Write fetcher tests (mocked)**

`packages/ai-services/__tests__/fetcher/github-fetcher.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPack } from '../../src/fetcher/github-fetcher'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('fetchPack', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches JSON files from GitHub API', async () => {
    // Mock directory listing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { name: 'human.json', download_url: 'https://raw.example.com/human.json' },
        { name: 'elf.json', download_url: 'https://raw.example.com/elf.json' },
      ],
    })

    // Mock file downloads
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Human', type: 'ancestry' }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Elf', type: 'ancestry' }),
    })

    const result = await fetchPack('ancestries')

    expect(result.packType).toBe('ancestries')
    expect(result.items).toHaveLength(2)
    expect(result.errors).toHaveLength(0)
    expect(result.fetchedAt).toBeDefined()
  })

  it('respects limit option', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { name: 'a.json', download_url: 'https://example.com/a.json' },
        { name: 'b.json', download_url: 'https://example.com/b.json' },
        { name: 'c.json', download_url: 'https://example.com/c.json' },
      ],
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'A' }),
    })

    const result = await fetchPack('ancestries', { limit: 1 })
    expect(result.items).toHaveLength(1)
  })

  it('collects errors without throwing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { name: 'good.json', download_url: 'https://example.com/good.json' },
        { name: 'bad.json', download_url: 'https://example.com/bad.json' },
      ],
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Good' }),
    })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    const result = await fetchPack('ancestries')
    expect(result.items).toHaveLength(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('bad.json')
  })

  it('throws if directory listing fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    })

    await expect(fetchPack('ancestries')).rejects.toThrow('Failed to list pack directory')
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd packages/ai-services && pnpm test
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/ai-services/src/fetcher/ packages/ai-services/__tests__/fetcher/
git commit -m "feat(ai-services): add GitHub fetcher for Foundry VTT PF2e pack data"
```

---

### Task 3: Parser Module (Foundry JSON to Our Schemas)

**Files:**
- Create: `packages/ai-services/src/parser/foundry-parser.ts`
- Create: `packages/ai-services/src/parser/ancestry-parser.ts`
- Create: `packages/ai-services/src/parser/class-parser.ts`
- Create: `packages/ai-services/src/parser/feat-parser.ts`
- Create: `packages/ai-services/src/parser/spell-parser.ts`
- Create: `packages/ai-services/src/parser/item-parser.ts`
- Create: `packages/ai-services/src/parser/monster-parser.ts`
- Create: `packages/ai-services/src/parser/index.ts`
- Create: `packages/ai-services/__tests__/parser/ancestry-parser.test.ts`
- Create: `packages/ai-services/__tests__/parser/class-parser.test.ts`
- Create: `packages/ai-services/__tests__/parser/feat-parser.test.ts`
- Create: `packages/ai-services/__tests__/parser/spell-parser.test.ts`
- Create: `packages/ai-services/__tests__/parser/item-parser.test.ts`
- Create: `packages/ai-services/__tests__/parser/monster-parser.test.ts`

- [ ] **Step 1: Create utility for stripping HTML from Foundry descriptions**

`packages/ai-services/src/parser/foundry-parser.ts`:
```ts
/**
 * Shared utilities for parsing Foundry VTT PF2e JSON data.
 * Foundry stores descriptions as HTML strings — we strip tags for plain text.
 */

/** Strip HTML tags from Foundry description strings */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Generate a slug-style ID from a Foundry item name */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Safely extract nested value from Foundry JSON */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}
```

- [ ] **Step 2: Create ancestry parser**

`packages/ai-services/src/parser/ancestry-parser.ts`:
```ts
import { AncestrySchema, type Ancestry } from '../schemas/ancestry'
import { stripHtml, toSlug } from './foundry-parser'

/**
 * Parses a Foundry VTT ancestry JSON object into our Ancestry schema.
 *
 * Foundry ancestry structure (simplified):
 * {
 *   name: "Human",
 *   type: "ancestry",
 *   system: {
 *     hp: 8,
 *     size: "med",
 *     speed: 25,
 *     boosts: { "0": { value: ["str"] }, "1": { value: [] } },
 *     flaws: { ... },
 *     languages: { value: ["common"] },
 *     traits: { value: ["human", "humanoid"] },
 *     description: { value: "<p>...</p>" },
 *     source: { value: "Pathfinder Core Rulebook" }
 *   }
 * }
 */

const SIZE_MAP: Record<string, string> = {
  tiny: 'tiny',
  sm: 'small',
  med: 'medium',
  lg: 'large',
}

export function parseAncestry(raw: Record<string, unknown>): Ancestry | null {
  try {
    const system = raw.system as Record<string, unknown>
    if (!system) return null

    const boosts = system.boosts as Record<string, { value: string[] }> | undefined
    const flaws = system.flaws as Record<string, { value: string[] }> | undefined
    const languages = system.languages as { value: string[] } | undefined
    const traits = system.traits as { value: string[] } | undefined
    const description = system.description as { value: string } | undefined
    const source = system.source as { value: string } | undefined

    const abilityBoosts = boosts
      ? Object.values(boosts).map((b) => {
          if (b.value.length === 0) return { type: 'free' as const }
          return { type: 'fixed' as const, ability: b.value[0] as Ancestry['abilityBoosts'][0]['ability'] }
        })
      : [{ type: 'free' as const }]

    const abilityFlaws = flaws
      ? Object.values(flaws)
          .filter((f) => f.value.length > 0)
          .map((f) => ({ type: 'fixed' as const, ability: f.value[0] as Ancestry['abilityBoosts'][0]['ability'] }))
      : []

    const data = {
      id: toSlug(String(raw.name)),
      name: String(raw.name),
      sourceId: String(raw._id ?? toSlug(String(raw.name))),
      hp: Number(system.hp),
      size: SIZE_MAP[String(system.size)] ?? 'medium',
      speed: Number(system.speed),
      abilityBoosts,
      abilityFlaws,
      languages: languages?.value ?? ['Common'],
      traits: traits?.value ?? [],
      features: [],
      description: description?.value ? stripHtml(description.value) : '',
      source: source?.value ?? 'Pathfinder Core Rulebook',
    }

    return AncestrySchema.parse(data)
  } catch (err) {
    console.warn(`Failed to parse ancestry "${raw.name}":`, err instanceof Error ? err.message : err)
    return null
  }
}
```

- [ ] **Step 3: Create class parser**

`packages/ai-services/src/parser/class-parser.ts`:
```ts
import { ClassSchema, type PF2eClass } from '../schemas/class'
import { stripHtml, toSlug } from './foundry-parser'

const PROF_MAP: Record<number, string> = {
  0: 'untrained',
  1: 'trained',
  2: 'expert',
  3: 'master',
  4: 'legendary',
}

export function parseClass(raw: Record<string, unknown>): PF2eClass | null {
  try {
    const system = raw.system as Record<string, unknown>
    if (!system) return null

    const keyAbility = system.keyAbility as { value: string[] } | undefined
    const description = system.description as { value: string } | undefined
    const source = system.source as { value: string } | undefined
    const defenses = system.defenses as Record<string, unknown> | undefined
    const perception = system.perception as unknown

    const savesRaw = defenses as Record<string, { rank?: number }> | undefined
    const attacksRaw = system.attacks as Record<string, { rank?: number }> | undefined

    const data = {
      id: toSlug(String(raw.name)),
      name: String(raw.name),
      sourceId: String(raw._id ?? toSlug(String(raw.name))),
      hp: Number(system.hp),
      keyAbility: (keyAbility?.value ?? ['str']) as PF2eClass['keyAbility'],
      proficiencies: [],
      skillTrainedCount: Number(system.trainedSkills && typeof system.trainedSkills === 'object'
        ? (system.trainedSkills as Record<string, unknown>).additional ?? 0
        : 0),
      attackProficiency: (PROF_MAP[Number(attacksRaw?.simple?.rank ?? 1)] ?? 'trained') as PF2eClass['attackProficiency'],
      defenseProficiency: (PROF_MAP[Number(savesRaw?.unarmored?.rank ?? 1)] ?? 'trained') as PF2eClass['defenseProficiency'],
      perception: (PROF_MAP[Number(typeof perception === 'object' && perception !== null ? (perception as Record<string, unknown>).rank : 1)] ?? 'trained') as PF2eClass['perception'],
      fortitude: (PROF_MAP[Number(savesRaw?.fortitude?.rank ?? 1)] ?? 'trained') as PF2eClass['fortitude'],
      reflex: (PROF_MAP[Number(savesRaw?.reflex?.rank ?? 1)] ?? 'trained') as PF2eClass['reflex'],
      will: (PROF_MAP[Number(savesRaw?.will?.rank ?? 1)] ?? 'trained') as PF2eClass['will'],
      description: description?.value ? stripHtml(description.value) : '',
      source: source?.value ?? 'Pathfinder Core Rulebook',
    }

    return ClassSchema.parse(data)
  } catch (err) {
    console.warn(`Failed to parse class "${raw.name}":`, err instanceof Error ? err.message : err)
    return null
  }
}
```

- [ ] **Step 4: Create feat parser**

`packages/ai-services/src/parser/feat-parser.ts`:
```ts
import { FeatSchema, type Feat } from '../schemas/feat'
import { stripHtml, toSlug } from './foundry-parser'

const ACTION_MAP: Record<string, string> = {
  free: 'free',
  reaction: 'reaction',
  1: '1',
  2: '2',
  3: '3',
}

function parseFeatType(traits: string[]): Feat['featType'] {
  if (traits.includes('ancestry')) return 'ancestry'
  if (traits.includes('class')) return 'class'
  if (traits.includes('skill')) return 'skill'
  if (traits.includes('archetype')) return 'archetype'
  return 'general'
}

export function parseFeat(raw: Record<string, unknown>): Feat | null {
  try {
    const system = raw.system as Record<string, unknown>
    if (!system) return null

    const traits = system.traits as { value: string[] } | undefined
    const description = system.description as { value: string } | undefined
    const source = system.source as { value: string } | undefined
    const actions = system.actionType as { value: string } | undefined
    const actionCount = system.actions as { value: number | string | null } | undefined
    const level = system.level as { value: number } | undefined
    const prereqs = system.prerequisites as { value: Array<{ value: string }> } | undefined

    const traitValues = traits?.value ?? []
    let actionCost: string = 'passive'
    const actionType = actions?.value

    if (actionType === 'free') {
      actionCost = 'free'
    } else if (actionType === 'reaction') {
      actionCost = 'reaction'
    } else if (actionType === 'action' && actionCount?.value) {
      actionCost = ACTION_MAP[String(actionCount.value)] ?? '1'
    }

    const data = {
      id: toSlug(String(raw.name)),
      name: String(raw.name),
      sourceId: String(raw._id ?? toSlug(String(raw.name))),
      level: Number(level?.value ?? 0),
      featType: parseFeatType(traitValues),
      actionCost,
      traits: traitValues,
      prerequisites: prereqs?.value?.map((p) => ({
        type: 'other' as const,
        value: p.value,
      })) ?? [],
      description: description?.value ? stripHtml(description.value) : '',
      source: source?.value ?? 'Pathfinder Core Rulebook',
    }

    return FeatSchema.parse(data)
  } catch (err) {
    console.warn(`Failed to parse feat "${raw.name}":`, err instanceof Error ? err.message : err)
    return null
  }
}
```

- [ ] **Step 5: Create spell parser**

`packages/ai-services/src/parser/spell-parser.ts`:
```ts
import { SpellSchema, type Spell } from '../schemas/spell'
import { stripHtml, toSlug } from './foundry-parser'

export function parseSpell(raw: Record<string, unknown>): Spell | null {
  try {
    const system = raw.system as Record<string, unknown>
    if (!system) return null

    const traits = system.traits as { value: string[]; traditions?: string[] } | undefined
    const traditions = (traits?.traditions ?? system.traditions as { value: string[] } | undefined)
    const description = system.description as { value: string } | undefined
    const source = system.source as { value: string } | undefined
    const time = system.time as { value: string } | undefined
    const components = system.components as Record<string, boolean> | undefined
    const range = system.range as { value: string } | undefined
    const area = system.area as { type: string; value: number } | undefined
    const save = system.save as { value: string; basic: boolean } | undefined
    const damage = system.damage as Record<string, { formula: string; type: string }> | undefined
    const duration = system.duration as { value: string; sustained: boolean } | undefined
    const level = system.level as { value: number } | undefined

    // Parse cast actions
    let castActions: Spell['castActions'] = 2
    const timeValue = time?.value
    if (timeValue === 'free') castActions = 'free'
    else if (timeValue === 'reaction') castActions = 'reaction'
    else if (timeValue) {
      const num = parseInt(timeValue, 10)
      if (num >= 1 && num <= 3) castActions = num as 1 | 2 | 3
    }

    // Parse components
    const spellComponents: Spell['components'] = []
    if (components?.focus) spellComponents.push('focus')
    if (components?.material) spellComponents.push('material')
    if (components?.somatic) spellComponents.push('somatic')
    if (components?.verbal) spellComponents.push('verbal')

    // Parse range to number
    let rangeNum: number | undefined
    if (range?.value) {
      const parsed = parseInt(range.value, 10)
      if (!isNaN(parsed)) rangeNum = parsed
    }

    // Parse damage (take first entry)
    let damageObj: { formula: string; type: string } | undefined
    if (damage) {
      const firstEntry = Object.values(damage)[0]
      if (firstEntry?.formula) {
        damageObj = { formula: firstEntry.formula, type: firstEntry.type ?? 'untyped' }
      }
    }

    // Parse traditions
    const traditionValues = Array.isArray(traditions)
      ? traditions
      : (traditions as { value?: string[] })?.value ?? []
    const validTraditions = traditionValues.filter(
      (t: string) => ['arcane', 'divine', 'occult', 'primal'].includes(t)
    )

    if (validTraditions.length === 0) return null // Skip spells with no tradition (focus spells etc.)

    const data: Record<string, unknown> = {
      id: toSlug(String(raw.name)),
      name: String(raw.name),
      sourceId: String(raw._id ?? toSlug(String(raw.name))),
      level: Number(level?.value ?? 0),
      traditions: validTraditions,
      components: spellComponents,
      castActions,
      traits: traits?.value ?? [],
      description: description?.value ? stripHtml(description.value) : '',
      source: source?.value ?? 'Pathfinder Core Rulebook',
    }

    if (rangeNum !== undefined) data.range = rangeNum
    if (area) data.area = { type: area.type, size: area.value }
    if (save?.value) data.save = { type: save.value, basic: save.basic ?? false }
    if (damageObj) data.damage = damageObj
    if (duration?.value) data.duration = duration.value
    if (duration?.sustained) data.sustained = true

    return SpellSchema.parse(data)
  } catch (err) {
    console.warn(`Failed to parse spell "${raw.name}":`, err instanceof Error ? err.message : err)
    return null
  }
}
```

- [ ] **Step 6: Create item parser**

`packages/ai-services/src/parser/item-parser.ts`:
```ts
import { ItemSchema, type Item } from '../schemas/item'
import { stripHtml, toSlug } from './foundry-parser'

function mapItemType(foundryType: string): Item['itemType'] | null {
  const map: Record<string, Item['itemType']> = {
    weapon: 'weapon',
    armor: 'armor',
    shield: 'shield',
    consumable: 'consumable',
    equipment: 'equipment',
    treasure: 'treasure',
    backpack: 'equipment',
  }
  return map[foundryType] ?? null
}

export function parseItem(raw: Record<string, unknown>): Item | null {
  try {
    const system = raw.system as Record<string, unknown>
    if (!system) return null

    const foundryType = String(raw.type)
    const itemType = mapItemType(foundryType)
    if (!itemType) return null

    const traits = system.traits as { value: string[] } | undefined
    const description = system.description as { value: string } | undefined
    const source = system.source as { value: string } | undefined
    const level = system.level as { value: number } | undefined
    const price = system.price as { value: { gp?: number; sp?: number; cp?: number } } | undefined
    const bulk = system.bulk as { value: number | string } | undefined

    const data: Record<string, unknown> = {
      id: toSlug(String(raw.name)),
      name: String(raw.name),
      sourceId: String(raw._id ?? toSlug(String(raw.name))),
      itemType,
      level: Number(level?.value ?? 0),
      price: {
        gp: Number(price?.value?.gp ?? 0),
        sp: Number(price?.value?.sp ?? 0),
        cp: Number(price?.value?.cp ?? 0),
      },
      bulk: bulk?.value === 'L' ? 'L' : Number(bulk?.value ?? 0),
      traits: traits?.value ?? [],
      description: description?.value ? stripHtml(description.value) : '',
      source: source?.value ?? 'Pathfinder Core Rulebook',
    }

    // Parse weapon stats
    if (itemType === 'weapon') {
      const weaponDamage = system.damage as { dice: number; die: string; damageType: string } | undefined
      const weaponGroup = system.group as string | undefined
      const weaponCategory = system.category as string | undefined
      const hands = system.usage as { value: string } | undefined

      if (weaponDamage) {
        data.weaponStats = {
          damage: `${weaponDamage.dice}${weaponDamage.die}`,
          damageType: weaponDamage.damageType ?? 'slashing',
          hands: hands?.value?.includes('two') ? '2' : '1',
          group: weaponGroup ?? 'other',
          category: weaponCategory ?? 'simple',
        }
      }
    }

    // Parse armor stats
    if (itemType === 'armor') {
      const acBonus = system.acBonus as number | undefined
      const dexCap = system.dexCap as number | undefined
      const checkPenalty = system.checkPenalty as number | undefined
      const speedPenalty = system.speedPenalty as number | undefined
      const strength = system.strength as number | undefined
      const armorGroup = system.group as string | undefined
      const armorCategory = system.category as string | undefined

      data.armorStats = {
        acBonus: Number(acBonus ?? 0),
        dexCap: dexCap ?? undefined,
        checkPenalty: Number(checkPenalty ?? 0),
        speedPenalty: Number(speedPenalty ?? 0),
        strength: strength ?? undefined,
        group: armorGroup ?? 'other',
        category: armorCategory ?? 'light',
      }
    }

    return ItemSchema.parse(data)
  } catch (err) {
    console.warn(`Failed to parse item "${raw.name}":`, err instanceof Error ? err.message : err)
    return null
  }
}
```

- [ ] **Step 7: Create monster parser**

`packages/ai-services/src/parser/monster-parser.ts`:
```ts
import { MonsterSchema, type Monster } from '../schemas/monster'
import { stripHtml, toSlug } from './foundry-parser'

const SIZE_MAP: Record<string, string> = {
  tiny: 'tiny',
  sm: 'small',
  med: 'medium',
  lg: 'large',
  huge: 'huge',
  grg: 'gargantuan',
}

export function parseMonster(raw: Record<string, unknown>): Monster | null {
  try {
    const system = raw.system as Record<string, unknown>
    if (!system) return null

    const traits = system.traits as { value: string[] } | undefined
    const description = system.description as { value: string } | undefined
    const source = system.source as { value: string } | undefined
    const details = system.details as Record<string, unknown> | undefined
    const attributes = system.attributes as Record<string, unknown> | undefined
    const saves = system.saves as Record<string, { value: number }> | undefined
    const perception = system.perception as { value?: number; mod?: number } | undefined
    const abilities = system.abilities as Record<string, { mod: number }> | undefined

    const hp = attributes?.hp as { value: number; max: number } | undefined
    const ac = attributes?.ac as { value: number } | undefined
    const speed = attributes?.speed as { value: number } | undefined

    // Parse strikes from items
    const items = raw.items as Array<Record<string, unknown>> | undefined
    const strikes = (items ?? [])
      .filter((item) => item.type === 'melee' || item.type === 'ranged')
      .map((item) => {
        const itemSystem = item.system as Record<string, unknown>
        const bonus = itemSystem?.bonus as { value: number } | undefined
        const damageRolls = itemSystem?.damageRolls as Record<string, { damage: string; damageType: string }> | undefined
        const firstDamage = damageRolls ? Object.values(damageRolls)[0] : undefined
        const strikeTraits = itemSystem?.traits as { value: string[] } | undefined

        return {
          name: String(item.name),
          attackBonus: Number(bonus?.value ?? 0),
          damage: firstDamage?.damage ?? '1d4',
          damageType: firstDamage?.damageType ?? 'untyped',
          traits: strikeTraits?.value ?? [],
        }
      })

    const data = {
      id: toSlug(String(raw.name)),
      name: String(raw.name),
      sourceId: String(raw._id ?? toSlug(String(raw.name))),
      level: Number(details?.level?.value ?? (system.details as Record<string, unknown>)?.level ?? 0),
      traits: traits?.value ?? [],
      size: (SIZE_MAP[String(traits?.size ?? system.traits && (system.traits as Record<string, unknown>).size)] ?? 'medium') as Monster['size'],
      hp: Number(hp?.max ?? hp?.value ?? 1),
      ac: Number(ac?.value ?? 10),
      fortitude: Number(saves?.fortitude?.value ?? 0),
      reflex: Number(saves?.reflex?.value ?? 0),
      will: Number(saves?.will?.value ?? 0),
      perception: Number(perception?.mod ?? perception?.value ?? 0),
      speed: Number(speed?.value ?? 0),
      abilities: {
        str: Number(abilities?.str?.mod ?? 0),
        dex: Number(abilities?.dex?.mod ?? 0),
        con: Number(abilities?.con?.mod ?? 0),
        int: Number(abilities?.int?.mod ?? 0),
        wis: Number(abilities?.wis?.mod ?? 0),
        cha: Number(abilities?.cha?.mod ?? 0),
      },
      immunities: [],
      resistances: {},
      weaknesses: {},
      strikes,
      description: description?.value ? stripHtml(description.value) : '',
      source: source?.value ?? 'Pathfinder Bestiary',
    }

    return MonsterSchema.parse(data)
  } catch (err) {
    console.warn(`Failed to parse monster "${raw.name}":`, err instanceof Error ? err.message : err)
    return null
  }
}
```

- [ ] **Step 8: Create parsers index**

`packages/ai-services/src/parser/index.ts`:
```ts
export { parseAncestry } from './ancestry-parser'
export { parseClass } from './class-parser'
export { parseFeat } from './feat-parser'
export { parseSpell } from './spell-parser'
export { parseItem } from './item-parser'
export { parseMonster } from './monster-parser'
export { stripHtml, toSlug, getNestedValue } from './foundry-parser'
```

- [ ] **Step 9: Write parser tests**

`packages/ai-services/__tests__/parser/ancestry-parser.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseAncestry } from '../../src/parser/ancestry-parser'

describe('parseAncestry', () => {
  const foundryHuman = {
    _id: 'abc123',
    name: 'Human',
    type: 'ancestry',
    system: {
      hp: 8,
      size: 'med',
      speed: 25,
      boosts: {
        '0': { value: [] },
        '1': { value: [] },
      },
      flaws: {},
      languages: { value: ['common'] },
      traits: { value: ['human', 'humanoid'] },
      description: { value: '<p>Humans are <b>versatile</b></p>' },
      source: { value: 'Pathfinder Core Rulebook' },
    },
  }

  it('parses a Foundry ancestry into our schema', () => {
    const result = parseAncestry(foundryHuman)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Human')
    expect(result!.hp).toBe(8)
    expect(result!.size).toBe('medium')
    expect(result!.speed).toBe(25)
    expect(result!.traits).toEqual(['human', 'humanoid'])
  })

  it('strips HTML from description', () => {
    const result = parseAncestry(foundryHuman)
    expect(result!.description).not.toContain('<p>')
    expect(result!.description).not.toContain('<b>')
    expect(result!.description).toContain('versatile')
  })

  it('maps free boosts correctly', () => {
    const result = parseAncestry(foundryHuman)
    expect(result!.abilityBoosts).toEqual([
      { type: 'free' },
      { type: 'free' },
    ])
  })

  it('returns null for invalid data', () => {
    const result = parseAncestry({ name: 'Bad', system: null } as unknown as Record<string, unknown>)
    expect(result).toBeNull()
  })
})
```

`packages/ai-services/__tests__/parser/class-parser.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseClass } from '../../src/parser/class-parser'

describe('parseClass', () => {
  const foundryFighter = {
    _id: 'fighter-123',
    name: 'Fighter',
    type: 'class',
    system: {
      hp: 10,
      keyAbility: { value: ['str', 'dex'] },
      trainedSkills: { additional: 3, value: ['acrobatics', 'athletics'] },
      attacks: { simple: { rank: 2 }, martial: { rank: 2 } },
      defenses: {
        unarmored: { rank: 1 },
        fortitude: { rank: 2 },
        reflex: { rank: 2 },
        will: { rank: 1 },
      },
      perception: { rank: 2 },
      description: { value: '<p>Fighting experts</p>' },
      source: { value: 'Pathfinder Core Rulebook' },
    },
  }

  it('parses a Foundry class into our schema', () => {
    const result = parseClass(foundryFighter)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Fighter')
    expect(result!.hp).toBe(10)
    expect(result!.keyAbility).toEqual(['str', 'dex'])
  })

  it('maps proficiency ranks correctly', () => {
    const result = parseClass(foundryFighter)
    expect(result!.attackProficiency).toBe('expert')
    expect(result!.perception).toBe('expert')
    expect(result!.fortitude).toBe('expert')
  })
})
```

`packages/ai-services/__tests__/parser/feat-parser.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseFeat } from '../../src/parser/feat-parser'

describe('parseFeat', () => {
  const foundryPowerAttack = {
    _id: 'pa-123',
    name: 'Power Attack',
    type: 'feat',
    system: {
      level: { value: 1 },
      actionType: { value: 'action' },
      actions: { value: 2 },
      traits: { value: ['fighter', 'flourish'] },
      prerequisites: { value: [{ value: 'trained in martial weapons' }] },
      description: { value: '<p>Make a devastating attack.</p>' },
      source: { value: 'Pathfinder Core Rulebook' },
    },
  }

  it('parses a Foundry feat into our schema', () => {
    const result = parseFeat(foundryPowerAttack)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Power Attack')
    expect(result!.level).toBe(1)
    expect(result!.actionCost).toBe('2')
    expect(result!.featType).toBe('class')
  })

  it('parses prerequisites', () => {
    const result = parseFeat(foundryPowerAttack)
    expect(result!.prerequisites).toHaveLength(1)
    expect(result!.prerequisites[0].value).toContain('martial weapons')
  })
})
```

`packages/ai-services/__tests__/parser/spell-parser.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseSpell } from '../../src/parser/spell-parser'

describe('parseSpell', () => {
  const foundryFireball = {
    _id: 'fb-123',
    name: 'Fireball',
    type: 'spell',
    system: {
      level: { value: 3 },
      traits: { value: ['evocation', 'fire'], traditions: ['arcane', 'primal'] },
      time: { value: '2' },
      components: { somatic: true, verbal: true, material: false, focus: false },
      range: { value: '500' },
      area: { type: 'burst', value: 20 },
      save: { value: 'reflex', basic: true },
      damage: { abc: { formula: '6d6', type: 'fire' } },
      duration: { value: '', sustained: false },
      description: { value: '<p>A burst of fire</p>' },
      source: { value: 'Pathfinder Core Rulebook' },
    },
  }

  it('parses a Foundry spell into our schema', () => {
    const result = parseSpell(foundryFireball)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Fireball')
    expect(result!.level).toBe(3)
    expect(result!.traditions).toEqual(['arcane', 'primal'])
    expect(result!.castActions).toBe(2)
  })

  it('parses area and save', () => {
    const result = parseSpell(foundryFireball)
    expect(result!.area).toEqual({ type: 'burst', size: 20 })
    expect(result!.save).toEqual({ type: 'reflex', basic: true })
  })

  it('parses damage', () => {
    const result = parseSpell(foundryFireball)
    expect(result!.damage).toEqual({ formula: '6d6', type: 'fire' })
  })

  it('returns null for focus spells without tradition', () => {
    const focusSpell = {
      ...foundryFireball,
      system: {
        ...foundryFireball.system,
        traits: { value: ['focus'], traditions: [] },
      },
    }
    const result = parseSpell(focusSpell)
    expect(result).toBeNull()
  })
})
```

`packages/ai-services/__tests__/parser/item-parser.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseItem } from '../../src/parser/item-parser'

describe('parseItem', () => {
  const foundryLongsword = {
    _id: 'ls-123',
    name: 'Longsword',
    type: 'weapon',
    system: {
      level: { value: 0 },
      price: { value: { gp: 1, sp: 0, cp: 0 } },
      bulk: { value: 1 },
      traits: { value: ['versatile P'] },
      damage: { dice: 1, die: 'd8', damageType: 'slashing' },
      group: 'sword',
      category: 'martial',
      usage: { value: 'held-in-one-hand' },
      description: { value: '<p>A versatile sword</p>' },
      source: { value: 'Pathfinder Core Rulebook' },
    },
  }

  it('parses a Foundry weapon into our schema', () => {
    const result = parseItem(foundryLongsword)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Longsword')
    expect(result!.itemType).toBe('weapon')
  })

  it('parses weapon stats', () => {
    const result = parseItem(foundryLongsword)
    expect(result!.weaponStats).toBeDefined()
    expect(result!.weaponStats!.damage).toBe('1d8')
    expect(result!.weaponStats!.damageType).toBe('slashing')
    expect(result!.weaponStats!.hands).toBe('1')
  })

  it('returns null for unsupported item types', () => {
    const result = parseItem({ ...foundryLongsword, type: 'lore' })
    expect(result).toBeNull()
  })
})
```

`packages/ai-services/__tests__/parser/monster-parser.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseMonster } from '../../src/parser/monster-parser'

describe('parseMonster', () => {
  const foundryGoblin = {
    _id: 'gob-123',
    name: 'Goblin Warrior',
    type: 'npc',
    system: {
      details: { level: { value: -1 } },
      traits: { value: ['goblin', 'humanoid'], size: 'sm' },
      attributes: {
        hp: { value: 6, max: 6 },
        ac: { value: 16 },
        speed: { value: 25 },
      },
      saves: {
        fortitude: { value: 2 },
        reflex: { value: 7 },
        will: { value: 3 },
      },
      perception: { mod: 3 },
      abilities: {
        str: { mod: 0 },
        dex: { mod: 3 },
        con: { mod: 0 },
        int: { mod: -1 },
        wis: { mod: 1 },
        cha: { mod: -1 },
      },
      description: { value: '<p>A weak goblin</p>' },
      source: { value: 'Pathfinder Bestiary' },
    },
    items: [
      {
        name: 'Dogslicer',
        type: 'melee',
        system: {
          bonus: { value: 8 },
          damageRolls: { abc: { damage: '1d6+1', damageType: 'slashing' } },
          traits: { value: ['agile', 'backstabber', 'finesse'] },
        },
      },
    ],
  }

  it('parses a Foundry monster into our schema', () => {
    const result = parseMonster(foundryGoblin)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Goblin Warrior')
    expect(result!.level).toBe(-1)
    expect(result!.size).toBe('small')
    expect(result!.hp).toBe(6)
    expect(result!.ac).toBe(16)
  })

  it('parses strikes from items', () => {
    const result = parseMonster(foundryGoblin)
    expect(result!.strikes).toHaveLength(1)
    expect(result!.strikes[0].name).toBe('Dogslicer')
    expect(result!.strikes[0].attackBonus).toBe(8)
    expect(result!.strikes[0].traits).toContain('agile')
  })

  it('parses ability modifiers', () => {
    const result = parseMonster(foundryGoblin)
    expect(result!.abilities.dex).toBe(3)
    expect(result!.abilities.int).toBe(-1)
  })
})
```

- [ ] **Step 10: Run tests**

```bash
cd packages/ai-services && pnpm test
```

Expected: All parser tests pass.

- [ ] **Step 11: Commit**

```bash
git add packages/ai-services/src/parser/ packages/ai-services/__tests__/parser/
git commit -m "feat(ai-services): add Foundry VTT JSON parsers for all PF2e data types"
```

---

### Task 4: Database Migration for PF2e Data Tables

**Files:**
- Create: `supabase/migrations/00003_pf2e_data_tables.sql`

- [ ] **Step 1: Create migration**

`supabase/migrations/00003_pf2e_data_tables.sql`:
```sql
-- ============================================================
-- PF2e Regelwerk Data Tables
-- Stores imported Pathfinder 2e game data
-- ============================================================

-- Ancestries
create table public.pf2e_ancestries (
  id text primary key,
  name text not null,
  source_id text not null unique,
  hp integer not null,
  size text not null check (size in ('tiny', 'small', 'medium', 'large')),
  speed integer not null,
  ability_boosts jsonb not null default '[]',
  ability_flaws jsonb not null default '[]',
  languages jsonb not null default '[]',
  traits jsonb not null default '[]',
  features jsonb not null default '[]',
  description text not null default '',
  source text not null default 'Pathfinder Core Rulebook',
  imported_at timestamptz not null default now()
);

-- Classes
create table public.pf2e_classes (
  id text primary key,
  name text not null,
  source_id text not null unique,
  hp integer not null,
  key_ability jsonb not null,
  proficiencies jsonb not null default '[]',
  skill_trained_count integer not null default 0,
  attack_proficiency text not null,
  defense_proficiency text not null,
  perception text not null,
  fortitude text not null,
  reflex text not null,
  will text not null,
  description text not null default '',
  source text not null default 'Pathfinder Core Rulebook',
  imported_at timestamptz not null default now()
);

-- Feats
create table public.pf2e_feats (
  id text primary key,
  name text not null,
  source_id text not null unique,
  level integer not null default 0,
  feat_type text not null check (feat_type in ('ancestry', 'class', 'skill', 'general', 'archetype')),
  action_cost text not null default 'passive',
  traits jsonb not null default '[]',
  prerequisites jsonb not null default '[]',
  description text not null default '',
  source text not null default 'Pathfinder Core Rulebook',
  imported_at timestamptz not null default now()
);

create index idx_pf2e_feats_level on public.pf2e_feats(level);
create index idx_pf2e_feats_feat_type on public.pf2e_feats(feat_type);

-- Spells
create table public.pf2e_spells (
  id text primary key,
  name text not null,
  source_id text not null unique,
  level integer not null default 0,
  traditions jsonb not null default '[]',
  school text,
  components jsonb not null default '[]',
  cast_actions text not null,
  range integer,
  area jsonb,
  save jsonb,
  damage jsonb,
  duration text,
  sustained boolean not null default false,
  traits jsonb not null default '[]',
  description text not null default '',
  heightening jsonb,
  source text not null default 'Pathfinder Core Rulebook',
  imported_at timestamptz not null default now()
);

create index idx_pf2e_spells_level on public.pf2e_spells(level);
create index idx_pf2e_spells_traditions on public.pf2e_spells using gin(traditions);

-- Items (weapons, armor, equipment)
create table public.pf2e_items (
  id text primary key,
  name text not null,
  source_id text not null unique,
  item_type text not null check (item_type in ('weapon', 'armor', 'shield', 'consumable', 'equipment', 'treasure')),
  level integer not null default 0,
  price jsonb not null default '{"gp": 0, "sp": 0, "cp": 0}',
  bulk text not null default '0',
  traits jsonb not null default '[]',
  weapon_stats jsonb,
  armor_stats jsonb,
  description text not null default '',
  source text not null default 'Pathfinder Core Rulebook',
  imported_at timestamptz not null default now()
);

create index idx_pf2e_items_item_type on public.pf2e_items(item_type);
create index idx_pf2e_items_level on public.pf2e_items(level);

-- Monsters / NPCs
create table public.pf2e_monsters (
  id text primary key,
  name text not null,
  source_id text not null unique,
  level integer not null,
  traits jsonb not null default '[]',
  size text not null check (size in ('tiny', 'small', 'medium', 'large', 'huge', 'gargantuan')),
  alignment text,
  hp integer not null,
  ac integer not null,
  fortitude integer not null,
  reflex integer not null,
  will integer not null,
  perception integer not null,
  speed integer not null,
  abilities jsonb not null,
  immunities jsonb not null default '[]',
  resistances jsonb not null default '{}',
  weaknesses jsonb not null default '{}',
  strikes jsonb not null default '[]',
  spellcasting jsonb,
  special_abilities jsonb not null default '[]',
  description text not null default '',
  source text not null default 'Pathfinder Bestiary',
  imported_at timestamptz not null default now()
);

create index idx_pf2e_monsters_level on public.pf2e_monsters(level);

-- ============================================================
-- RLS: PF2e data is read-only for all authenticated users
-- ============================================================

alter table public.pf2e_ancestries enable row level security;
alter table public.pf2e_classes enable row level security;
alter table public.pf2e_feats enable row level security;
alter table public.pf2e_spells enable row level security;
alter table public.pf2e_items enable row level security;
alter table public.pf2e_monsters enable row level security;

-- All authenticated users can read PF2e data
create policy "Anyone can read ancestries" on public.pf2e_ancestries for select using (true);
create policy "Anyone can read classes" on public.pf2e_classes for select using (true);
create policy "Anyone can read feats" on public.pf2e_feats for select using (true);
create policy "Anyone can read spells" on public.pf2e_spells for select using (true);
create policy "Anyone can read items" on public.pf2e_items for select using (true);
create policy "Anyone can read monsters" on public.pf2e_monsters for select using (true);

-- Only service role can write (used by import pipeline)
create policy "Service role can insert ancestries" on public.pf2e_ancestries for insert with check (true);
create policy "Service role can update ancestries" on public.pf2e_ancestries for update using (true);
create policy "Service role can insert classes" on public.pf2e_classes for insert with check (true);
create policy "Service role can update classes" on public.pf2e_classes for update using (true);
create policy "Service role can insert feats" on public.pf2e_feats for insert with check (true);
create policy "Service role can update feats" on public.pf2e_feats for update using (true);
create policy "Service role can insert spells" on public.pf2e_spells for insert with check (true);
create policy "Service role can update spells" on public.pf2e_spells for update using (true);
create policy "Service role can insert items" on public.pf2e_items for insert with check (true);
create policy "Service role can update items" on public.pf2e_items for update using (true);
create policy "Service role can insert monsters" on public.pf2e_monsters for insert with check (true);
create policy "Service role can update monsters" on public.pf2e_monsters for update using (true);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/00003_pf2e_data_tables.sql
git commit -m "feat(db): add PF2e data tables migration for import pipeline"
```

---

### Task 5: Supabase Loader Module

**Files:**
- Create: `packages/ai-services/src/loader/supabase-loader.ts`
- Create: `packages/ai-services/src/loader/index.ts`
- Create: `packages/ai-services/__tests__/loader/supabase-loader.test.ts`
- Modify: `packages/ai-services/package.json` (add @supabase/supabase-js)

- [ ] **Step 1: Add Supabase dependency**

Add `"@supabase/supabase-js": "^2.45.0"` to `packages/ai-services/package.json` dependencies.

Run: `cd packages/ai-services && pnpm install`

- [ ] **Step 2: Create Supabase loader**

`packages/ai-services/src/loader/supabase-loader.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Ancestry } from '../schemas/ancestry'
import type { PF2eClass } from '../schemas/class'
import type { Feat } from '../schemas/feat'
import type { Spell } from '../schemas/spell'
import type { Item } from '../schemas/item'
import type { Monster } from '../schemas/monster'

export interface LoaderConfig {
  supabaseUrl: string
  supabaseServiceKey: string
  batchSize?: number
}

export interface LoadResult {
  table: string
  inserted: number
  updated: number
  errors: string[]
}

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    result[snakeKey] = value
  }
  return result
}

export class SupabaseLoader {
  private client: SupabaseClient
  private batchSize: number

  constructor(config: LoaderConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false },
    })
    this.batchSize = config.batchSize ?? 100
  }

  private async upsertBatch(
    table: string,
    items: Record<string, unknown>[],
    conflictColumn: string = 'id'
  ): Promise<LoadResult> {
    const result: LoadResult = { table, inserted: 0, updated: 0, errors: [] }

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize).map(toSnakeCase)

      const { error, count } = await this.client
        .from(table)
        .upsert(batch, { onConflict: conflictColumn })

      if (error) {
        result.errors.push(`Batch ${Math.floor(i / this.batchSize)}: ${error.message}`)
      } else {
        result.inserted += batch.length
      }
    }

    return result
  }

  async loadAncestries(items: Ancestry[]): Promise<LoadResult> {
    return this.upsertBatch('pf2e_ancestries', items as unknown as Record<string, unknown>[])
  }

  async loadClasses(items: PF2eClass[]): Promise<LoadResult> {
    return this.upsertBatch('pf2e_classes', items as unknown as Record<string, unknown>[])
  }

  async loadFeats(items: Feat[]): Promise<LoadResult> {
    return this.upsertBatch('pf2e_feats', items as unknown as Record<string, unknown>[])
  }

  async loadSpells(items: Spell[]): Promise<LoadResult> {
    return this.upsertBatch('pf2e_spells', items as unknown as Record<string, unknown>[])
  }

  async loadItems(items: Item[]): Promise<LoadResult> {
    return this.upsertBatch('pf2e_items', items as unknown as Record<string, unknown>[])
  }

  async loadMonsters(items: Monster[]): Promise<LoadResult> {
    return this.upsertBatch('pf2e_monsters', items as unknown as Record<string, unknown>[])
  }
}
```

`packages/ai-services/src/loader/index.ts`:
```ts
export { SupabaseLoader } from './supabase-loader'
export type { LoaderConfig, LoadResult } from './supabase-loader'
```

- [ ] **Step 3: Write loader tests (mocked)**

`packages/ai-services/__tests__/loader/supabase-loader.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SupabaseLoader } from '../../src/loader/supabase-loader'

// Mock supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null, count: 1 }),
    })),
  })),
}))

describe('SupabaseLoader', () => {
  let loader: SupabaseLoader

  beforeEach(() => {
    loader = new SupabaseLoader({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      batchSize: 2,
    })
  })

  it('loads ancestries', async () => {
    const items = [
      {
        id: 'human',
        name: 'Human',
        sourceId: 'f-human',
        hp: 8,
        size: 'medium' as const,
        speed: 25,
        abilityBoosts: [{ type: 'free' as const }],
        abilityFlaws: [],
        languages: ['Common'],
        traits: ['human', 'humanoid'],
        features: [],
        description: 'Versatile people',
        source: 'Core Rulebook',
      },
    ]

    const result = await loader.loadAncestries(items)
    expect(result.table).toBe('pf2e_ancestries')
    expect(result.errors).toHaveLength(0)
  })

  it('loads spells', async () => {
    const items = [
      {
        id: 'fireball',
        name: 'Fireball',
        sourceId: 'f-fireball',
        level: 3,
        traditions: ['arcane' as const, 'primal' as const],
        components: ['somatic' as const, 'verbal' as const],
        castActions: 2 as const,
        traits: ['evocation', 'fire'],
        description: 'A burst of fire',
        sustained: false,
        source: 'Core Rulebook',
      },
    ]

    const result = await loader.loadSpells(items)
    expect(result.table).toBe('pf2e_spells')
    expect(result.errors).toHaveLength(0)
  })
})
```

- [ ] **Step 4: Run tests**

```bash
cd packages/ai-services && pnpm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/ai-services/src/loader/ packages/ai-services/__tests__/loader/ packages/ai-services/package.json
git commit -m "feat(ai-services): add Supabase loader for batch upserting PF2e data"
```

---

### Task 6: Pipeline Orchestrator and CLI

**Files:**
- Create: `packages/ai-services/src/pipeline.ts`
- Create: `packages/ai-services/src/cli.ts`
- Create: `packages/ai-services/__tests__/pipeline.test.ts`
- Modify: `packages/ai-services/src/index.ts`
- Modify: `package.json` (root — add `data:import` script)

- [ ] **Step 1: Create pipeline orchestrator**

`packages/ai-services/src/pipeline.ts`:
```ts
import { fetchPack, type PackType } from './fetcher'
import { parseAncestry } from './parser/ancestry-parser'
import { parseClass } from './parser/class-parser'
import { parseFeat } from './parser/feat-parser'
import { parseSpell } from './parser/spell-parser'
import { parseItem } from './parser/item-parser'
import { parseMonster } from './parser/monster-parser'
import { SupabaseLoader, type LoaderConfig, type LoadResult } from './loader'

export interface PipelineOptions {
  types?: PackType[]
  limit?: number
  dryRun?: boolean
  loaderConfig?: LoaderConfig
}

export interface PipelineResult {
  fetchedCounts: Record<string, number>
  parsedCounts: Record<string, number>
  parseErrors: Record<string, number>
  loadResults: LoadResult[]
  totalDuration: number
}

type ParserFn = (raw: Record<string, unknown>) => unknown | null

const PARSERS: Record<PackType, ParserFn> = {
  ancestries: parseAncestry,
  classes: parseClass,
  feats: parseFeat,
  spells: parseSpell,
  equipment: parseItem,
  bestiary: parseMonster,
}

const TABLE_LOADERS: Record<PackType, string> = {
  ancestries: 'loadAncestries',
  classes: 'loadClasses',
  feats: 'loadFeats',
  spells: 'loadSpells',
  equipment: 'loadItems',
  bestiary: 'loadMonsters',
}

export async function runPipeline(options: PipelineOptions = {}): Promise<PipelineResult> {
  const start = Date.now()
  const types = options.types ?? ['ancestries', 'classes', 'feats', 'spells', 'equipment', 'bestiary']

  const result: PipelineResult = {
    fetchedCounts: {},
    parsedCounts: {},
    parseErrors: {},
    loadResults: [],
    totalDuration: 0,
  }

  // Stage 1: Fetch
  console.log('\n=== Stage 1: Fetch ===')
  const fetchResults = new Map<PackType, unknown[]>()

  for (const type of types) {
    console.log(`Fetching ${type}...`)
    const fetchResult = await fetchPack(type, { limit: options.limit })
    fetchResults.set(type, fetchResult.items)
    result.fetchedCounts[type] = fetchResult.items.length

    if (fetchResult.errors.length > 0) {
      console.warn(`  Fetch errors for ${type}:`, fetchResult.errors)
    }
    console.log(`  → ${fetchResult.items.length} items fetched`)
  }

  // Stage 2: Parse + Validate (Zod validation happens inside parsers)
  console.log('\n=== Stage 2: Parse & Validate ===')
  const parsedData = new Map<PackType, unknown[]>()

  for (const type of types) {
    const rawItems = fetchResults.get(type) ?? []
    const parser = PARSERS[type]
    const parsed: unknown[] = []
    let errors = 0

    for (const raw of rawItems) {
      const item = parser(raw as Record<string, unknown>)
      if (item) {
        parsed.push(item)
      } else {
        errors++
      }
    }

    parsedData.set(type, parsed)
    result.parsedCounts[type] = parsed.length
    result.parseErrors[type] = errors
    console.log(`  ${type}: ${parsed.length} parsed, ${errors} errors`)
  }

  // Stage 3: Load into database
  if (!options.dryRun && options.loaderConfig) {
    console.log('\n=== Stage 3: Load ===')
    const loader = new SupabaseLoader(options.loaderConfig)

    for (const type of types) {
      const items = parsedData.get(type) ?? []
      if (items.length === 0) continue

      const methodName = TABLE_LOADERS[type] as keyof SupabaseLoader
      const loadFn = loader[methodName] as (items: unknown[]) => Promise<LoadResult>
      const loadResult = await loadFn.call(loader, items)
      result.loadResults.push(loadResult)
      console.log(`  ${type}: ${loadResult.inserted} loaded, ${loadResult.errors.length} errors`)
    }
  } else if (options.dryRun) {
    console.log('\n=== Stage 3: Load (DRY RUN — skipped) ===')
  } else {
    console.log('\n=== Stage 3: Load (skipped — no loader config) ===')
  }

  result.totalDuration = Date.now() - start
  console.log(`\nPipeline completed in ${result.totalDuration}ms`)

  return result
}
```

- [ ] **Step 2: Create CLI entry point**

`packages/ai-services/src/cli.ts`:
```ts
#!/usr/bin/env node

import { runPipeline, type PipelineOptions } from './pipeline'
import type { PackType } from './fetcher'

async function main() {
  const args = process.argv.slice(2)

  const options: PipelineOptions = {
    dryRun: args.includes('--dry-run'),
    limit: undefined,
    types: undefined,
  }

  // Parse --limit=N
  const limitArg = args.find((a) => a.startsWith('--limit='))
  if (limitArg) {
    options.limit = parseInt(limitArg.split('=')[1], 10)
  }

  // Parse --types=ancestries,classes
  const typesArg = args.find((a) => a.startsWith('--types='))
  if (typesArg) {
    options.types = typesArg.split('=')[1].split(',') as PackType[]
  }

  // Load Supabase config from environment
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseServiceKey && !options.dryRun) {
    options.loaderConfig = {
      supabaseUrl,
      supabaseServiceKey,
    }
  } else if (!options.dryRun) {
    console.warn('⚠ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set — running in dry-run mode')
    options.dryRun = true
  }

  console.log('PF2e Data Import Pipeline')
  console.log('========================')
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (options.limit) console.log(`Limit: ${options.limit} items per pack`)
  if (options.types) console.log(`Types: ${options.types.join(', ')}`)
  console.log('')

  try {
    const result = await runPipeline(options)

    console.log('\n========================')
    console.log('Summary:')
    for (const type of Object.keys(result.fetchedCounts)) {
      console.log(`  ${type}: ${result.fetchedCounts[type]} fetched → ${result.parsedCounts[type]} parsed (${result.parseErrors[type]} errors)`)
    }
    console.log(`Total duration: ${result.totalDuration}ms`)
  } catch (err) {
    console.error('Pipeline failed:', err)
    process.exit(1)
  }
}

main()
```

- [ ] **Step 3: Update index.ts exports**

`packages/ai-services/src/index.ts`:
```ts
export const AI_SERVICES_VERSION = '0.0.1'

// Schemas
export * from './schemas'

// Fetcher
export * from './fetcher'

// Parser
export * from './parser'

// Loader
export * from './loader'

// Pipeline
export { runPipeline } from './pipeline'
export type { PipelineOptions, PipelineResult } from './pipeline'
```

- [ ] **Step 4: Add data:import script to root package.json**

Add to the root `package.json` scripts:
```json
"data:import": "pnpm --filter @dndmanager/ai-services data:import"
```

- [ ] **Step 5: Write pipeline tests**

`packages/ai-services/__tests__/pipeline.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runPipeline } from '../src/pipeline'

// Mock the fetcher
vi.mock('../src/fetcher', () => ({
  fetchPack: vi.fn().mockResolvedValue({
    packType: 'ancestries',
    items: [
      {
        _id: 'human-123',
        name: 'Human',
        type: 'ancestry',
        system: {
          hp: 8,
          size: 'med',
          speed: 25,
          boosts: { '0': { value: [] }, '1': { value: [] } },
          flaws: {},
          languages: { value: ['common'] },
          traits: { value: ['human', 'humanoid'] },
          description: { value: 'Humans are versatile' },
          source: { value: 'Pathfinder Core Rulebook' },
        },
      },
    ],
    fetchedAt: new Date().toISOString(),
    errors: [],
  }),
}))

describe('runPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs a dry-run pipeline successfully', async () => {
    const result = await runPipeline({
      types: ['ancestries'],
      dryRun: true,
    })

    expect(result.fetchedCounts.ancestries).toBe(1)
    expect(result.parsedCounts.ancestries).toBe(1)
    expect(result.parseErrors.ancestries).toBe(0)
    expect(result.loadResults).toHaveLength(0) // dry run
    expect(result.totalDuration).toBeGreaterThanOrEqual(0)
  })

  it('tracks parse errors', async () => {
    const { fetchPack } = await import('../src/fetcher')
    vi.mocked(fetchPack).mockResolvedValueOnce({
      packType: 'ancestries',
      items: [
        { name: 'Bad', system: null }, // will fail parsing
      ],
      fetchedAt: new Date().toISOString(),
      errors: [],
    })

    const result = await runPipeline({
      types: ['ancestries'],
      dryRun: true,
    })

    expect(result.parsedCounts.ancestries).toBe(0)
    expect(result.parseErrors.ancestries).toBe(1)
  })
})
```

- [ ] **Step 6: Run all tests**

```bash
cd packages/ai-services && pnpm test
```

Expected: All tests pass.

- [ ] **Step 7: Verify dry-run works**

```bash
cd packages/ai-services && pnpm data:import --dry-run --types=ancestries --limit=3
```

Expected: Pipeline runs, fetches 3 ancestries from GitHub, parses them, prints summary.

- [ ] **Step 8: Commit**

```bash
git add packages/ai-services/ supabase/migrations/00003_pf2e_data_tables.sql package.json
git commit -m "feat(ai-services): add import pipeline orchestrator and CLI with dry-run support"
```
