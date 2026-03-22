# Phase 2.7: Pathbuilder 2e Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import Pathbuilder 2e JSON character exports into the platform. One-way import: parse the JSON, map it to our character schema, validate against pf2e-engine rules, and save to Supabase. No bidirectional sync.

**Architecture:** A new `pathbuilder` package-local module in `packages/pf2e-engine/src/` handles schema types and mapping logic (pure functions, fully testable). The web app gets a Next.js API route for processing and a client-side import UI with file upload, preview, and confirm flow.

**Tech Stack:** TypeScript strict, Vitest, Next.js App Router, Supabase, shadcn/ui, Zod

---

## File Structure

```
packages/pf2e-engine/src/
├── pathbuilder/
│   ├── schema.ts                     → Pathbuilder JSON export type definitions
│   ├── mapper.ts                     → Converts Pathbuilder data → our character format
│   ├── validator.ts                  → Validates mapped data against pf2e-engine rules
│   └── index.ts                      → Re-exports
├── __tests__/
│   ├── pathbuilder-schema.test.ts
│   ├── pathbuilder-mapper.test.ts
│   └── pathbuilder-validator.test.ts

apps/web/
├── app/
│   ├── api/characters/import/
│   │   └── route.ts                  → POST endpoint: validate + save imported character
│   └── (lobby)/campaigns/[campaignId]/characters/
│       └── import/
│           └── page.tsx              → Import UI page (server component shell)
├── components/character/
│   ├── PathbuilderImport.tsx         → Client component: upload + preview + confirm
│   └── PathbuilderPreview.tsx        → Read-only preview of parsed character data
├── lib/
│   └── schemas/
│       └── pathbuilder.ts            → Zod schema for runtime validation of uploaded JSON
```

---

### Task 1: Pathbuilder JSON Schema Types

**Files:**
- Create: `packages/pf2e-engine/src/pathbuilder/schema.ts`
- Test: `packages/pf2e-engine/src/__tests__/pathbuilder-schema.test.ts`

Pathbuilder 2e exports a JSON object with a `build` key. We type the subset we actually use.

- [ ] **Step 1: Define the Pathbuilder export types**

`packages/pf2e-engine/src/pathbuilder/schema.ts`:
```typescript
/**
 * Types representing the Pathbuilder 2e JSON export format.
 * Only fields we consume are typed — the rest is ignored.
 * Reference: Pathbuilder 2e export via "Export JSON" button.
 */

export interface PathbuilderAbilities {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface PathbuilderProficiencies {
  classDC: number
  perception: number
  fortitude: number
  reflex: number
  will: number
  heavy: number
  medium: number
  light: number
  unarmored: number
  advanced: number
  martial: number
  simple: number
  unarmed: number
  castingArcane: number
  castingDivine: number
  castingOccult: number
  castingPrimal: number
}

export interface PathbuilderWeapon {
  name: string
  qty: number
  prof: string
  die: string
  pot: number       // potency rune (+1/+2/+3)
  str: string       // striking rune
  mat: string | null
  display: string
  rpieces: string | null
  damageType: string
  weight: string
  range: number | null
}

export interface PathbuilderArmor {
  name: string
  qty: number
  prof: string
  pot: number
  res: string
  mat: string | null
  display: string
  worn: boolean
  rpieces: string | null
}

export interface PathbuilderSpellcaster {
  name: string
  magicTradition: string
  spellcastingType: string       // 'prepared' | 'spontaneous'
  ability: string                // e.g. 'cha', 'int'
  proficiency: number
  focusPoints: number
  spells: PathbuilderSpellLevel[]
  perDay: number[]               // slots per level [cantrips, 1st, 2nd, ...]
}

export interface PathbuilderSpellLevel {
  spellLevel: number
  list: string[]                 // spell names
}

export interface PathbuilderFeat {
  name: string
  sourceId?: string
  displayName?: string
}

export interface PathbuilderLore {
  name: string
  proficiency: number
}

export interface PathbuilderBuild {
  name: string
  class: string
  dualClass: string | null
  level: number
  ancestry: string
  heritage: string
  background: string
  alignment: string
  gender: string
  age: string
  deity: string
  size: number                   // 0=tiny, 1=small, 2=medium, 3=large, 4=huge
  keyability: string
  languages: string[]
  rituals: string[]
  resistances: string[]
  inventorMods: string[]
  attributes: PathbuilderAbilities
  abilities: PathbuilderAbilities
  proficiencies: PathbuilderProficiencies
  feats: [string, string | null, string | null, number][]  // [name, source, note, level]
  specials: string[]
  lores: [string, number][]     // [loreName, proficiencyRank]
  equipment: [string, number][] // [itemName, quantity]
  specificProficiencies: {
    trained: string[]
    expert: string[]
    master: string[]
    legendary: string[]
  }
  weapons: PathbuilderWeapon[]
  money: { pp: number; gp: number; sp: number; cp: number }
  armor: PathbuilderArmor[]
  spellCasters: PathbuilderSpellcaster[]
  focusPoints: number
  focus: Record<string, { focusCantrips: string[]; focusSpells: string[] }>
  pets: unknown[]
  acTotal: {
    acProfBonus: number
    acAbilityBonus: number
    acItemBonus: number
    acTotal: number
    shieldBonus: number | null
  }
  skills: Record<string, number> // skill name → proficiency rank (0-4)
  hitpoints: number
  familiars: unknown[]
  formula: string[]
  bulk: number
}

/** Top-level Pathbuilder 2e JSON export shape */
export interface PathbuilderExport {
  success: boolean
  build: PathbuilderBuild
}
```

- [ ] **Step 2: Write tests that validate the type structure against a fixture**

`packages/pf2e-engine/src/__tests__/pathbuilder-schema.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import type { PathbuilderExport } from '../pathbuilder/schema.js'

// Minimal valid fixture matching the Pathbuilder export shape
const FIXTURE: PathbuilderExport = {
  success: true,
  build: {
    name: 'Valeros',
    class: 'Fighter',
    dualClass: null,
    level: 5,
    ancestry: 'Human',
    heritage: 'Versatile Human',
    background: 'Gladiator',
    alignment: 'NG',
    gender: 'Male',
    age: '28',
    deity: 'Gorum',
    size: 2,
    keyability: 'str',
    languages: ['Common', 'Orcish'],
    rituals: [],
    resistances: [],
    inventorMods: [],
    attributes: { str: 19, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
    abilities: { str: 19, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
    proficiencies: {
      classDC: 4, perception: 4,
      fortitude: 4, reflex: 4, will: 2,
      heavy: 2, medium: 2, light: 2, unarmored: 2,
      advanced: 2, martial: 4, simple: 4, unarmed: 4,
      castingArcane: 0, castingDivine: 0, castingOccult: 0, castingPrimal: 0,
    },
    feats: [['Power Attack', null, null, 1], ['Sudden Charge', null, null, 2]],
    specials: ['Attack of Opportunity', 'Shield Block'],
    lores: [['Gladiatorial Lore', 2]],
    equipment: [['Adventurers Pack', 1]],
    specificProficiencies: { trained: [], expert: [], master: [], legendary: [] },
    weapons: [{
      name: 'Longsword',
      qty: 1,
      prof: 'martial',
      die: 'd8',
      pot: 1,
      str: 'striking',
      mat: null,
      display: '+1 Striking Longsword',
      rpieces: null,
      damageType: 'S',
      weight: '1',
      range: null,
    }],
    money: { pp: 0, gp: 15, sp: 5, cp: 0 },
    armor: [{
      name: 'Full Plate',
      qty: 1,
      prof: 'heavy',
      pot: 1,
      res: '',
      mat: null,
      display: '+1 Full Plate',
      worn: true,
      rpieces: null,
    }],
    spellCasters: [],
    focusPoints: 0,
    focus: {},
    pets: [],
    acTotal: {
      acProfBonus: 7,
      acAbilityBonus: 1,
      acItemBonus: 6,
      acTotal: 24,
      shieldBonus: null,
    },
    skills: {
      acrobatics: 0,
      arcana: 0,
      athletics: 4,
      crafting: 0,
      deception: 0,
      diplomacy: 0,
      intimidation: 2,
      medicine: 0,
      nature: 0,
      occultism: 0,
      performance: 2,
      religion: 0,
      society: 0,
      stealth: 0,
      survival: 0,
      thievery: 0,
    },
    hitpoints: 73,
    familiars: [],
    formula: [],
    bulk: 5,
  },
}

describe('PathbuilderExport type', () => {
  it('fixture satisfies the type shape', () => {
    // Type assertion — if this compiles, the shape is correct
    const data: PathbuilderExport = FIXTURE
    expect(data.success).toBe(true)
    expect(data.build.name).toBe('Valeros')
    expect(data.build.level).toBe(5)
  })

  it('has valid ability scores', () => {
    const { abilities } = FIXTURE.build
    expect(abilities.str).toBeGreaterThanOrEqual(1)
    expect(abilities.dex).toBeGreaterThanOrEqual(1)
    expect(abilities.con).toBeGreaterThanOrEqual(1)
    expect(abilities.int).toBeGreaterThanOrEqual(1)
    expect(abilities.wis).toBeGreaterThanOrEqual(1)
    expect(abilities.cha).toBeGreaterThanOrEqual(1)
  })

  it('has proficiency values in 0-8 range', () => {
    const { proficiencies } = FIXTURE.build
    for (const val of Object.values(proficiencies)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(8)
    }
  })
})
```

**Commit:** `feat(pf2e-engine): add Pathbuilder 2e JSON export type definitions`

---

### Task 2: Pathbuilder-to-Character Mapper

**Files:**
- Create: `packages/pf2e-engine/src/pathbuilder/mapper.ts`
- Test: `packages/pf2e-engine/src/__tests__/pathbuilder-mapper.test.ts`

- [ ] **Step 1: Define our internal character data shape for the `data` JSONB column**

Add to `packages/pf2e-engine/src/pathbuilder/mapper.ts`:
```typescript
import type { AbilityScores, ProficiencyRank, SpellcastingState, SpellTradition, AbilityId } from '../types.js'
import type { PathbuilderExport, PathbuilderBuild, PathbuilderSpellcaster } from './schema.js'

// ─── Our internal character data shape (stored in characters.data JSONB) ─────

export interface CharacterData {
  abilities: AbilityScores
  hitpoints: number
  level: number
  class: string
  ancestry: string
  heritage: string
  background: string
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge'
  keyAbility: AbilityId
  languages: string[]
  saves: {
    fortitude: ProficiencyRank
    reflex: ProficiencyRank
    will: ProficiencyRank
  }
  perception: ProficiencyRank
  skills: Record<string, ProficiencyRank>
  lores: { name: string; rank: ProficiencyRank }[]
  armorProficiencies: {
    unarmored: ProficiencyRank
    light: ProficiencyRank
    medium: ProficiencyRank
    heavy: ProficiencyRank
  }
  weaponProficiencies: {
    unarmed: ProficiencyRank
    simple: ProficiencyRank
    martial: ProficiencyRank
    advanced: ProficiencyRank
  }
  classDC: ProficiencyRank
  weapons: {
    name: string
    display: string
    die: string
    damageType: string
    potency: number
    striking: string
    range: number | null
    proficiency: string
  }[]
  armor: {
    name: string
    display: string
    potency: number
    resilient: string
    worn: boolean
    proficiency: string
  }[]
  feats: { name: string; level: number }[]
  specials: string[]
  spellcasting: SpellcastingState[]
  money: { pp: number; gp: number; sp: number; cp: number }
  importSource: 'pathbuilder2e'
  importedAt: string
}
```

- [ ] **Step 2: Implement rank mapping helper**

Continue in `packages/pf2e-engine/src/pathbuilder/mapper.ts`:
```typescript
/** Pathbuilder uses 0-8 numeric proficiency → our ProficiencyRank */
export function numericToRank(value: number): ProficiencyRank {
  if (value >= 8) return 'legendary'
  if (value >= 6) return 'master'
  if (value >= 4) return 'expert'
  if (value >= 2) return 'trained'
  return 'untrained'
}

const SIZE_MAP: Record<number, CharacterData['size']> = {
  0: 'tiny',
  1: 'small',
  2: 'medium',
  3: 'large',
  4: 'huge',
}

const ABILITY_KEYS: AbilityId[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function isAbilityId(s: string): s is AbilityId {
  return ABILITY_KEYS.includes(s as AbilityId)
}
```

- [ ] **Step 3: Implement spell caster mapping**

Continue in `packages/pf2e-engine/src/pathbuilder/mapper.ts`:
```typescript
function mapSpellTradition(tradition: string): SpellTradition {
  const t = tradition.toLowerCase()
  if (t === 'arcane' || t === 'divine' || t === 'occult' || t === 'primal') return t
  return 'arcane' // fallback
}

function mapSpellcaster(caster: PathbuilderSpellcaster): SpellcastingState {
  const tradition = mapSpellTradition(caster.magicTradition)
  const abilityId: AbilityId = isAbilityId(caster.ability) ? caster.ability : 'cha'

  const slots = caster.perDay
    .map((count, level) => ({ level, max: count, used: 0 }))
    .filter((s) => s.level > 0 && s.max > 0) // exclude cantrip row and empty

  const knownSpells = caster.spells.flatMap((sl) => sl.list)

  return {
    tradition,
    abilityId,
    slots,
    knownSpells,
    ...(caster.spellcastingType === 'prepared' ? { preparedSpells: knownSpells } : {}),
  }
}
```

- [ ] **Step 4: Implement the main mapper function**

Continue in `packages/pf2e-engine/src/pathbuilder/mapper.ts`:
```typescript
const SKILL_NAMES = [
  'acrobatics', 'arcana', 'athletics', 'crafting', 'deception',
  'diplomacy', 'intimidation', 'medicine', 'nature', 'occultism',
  'performance', 'religion', 'society', 'stealth', 'survival', 'thievery',
] as const

export function mapPathbuilderToCharacter(input: PathbuilderExport): {
  name: string
  level: number
  data: CharacterData
} {
  const b = input.build

  const skills: Record<string, ProficiencyRank> = {}
  for (const skill of SKILL_NAMES) {
    skills[skill] = numericToRank(b.skills[skill] ?? 0)
  }

  const lores = b.lores.map(([name, rank]) => ({
    name,
    rank: numericToRank(rank),
  }))

  const weapons = b.weapons.map((w) => ({
    name: w.name,
    display: w.display,
    die: w.die,
    damageType: w.damageType,
    potency: w.pot,
    striking: w.str,
    range: w.range,
    proficiency: w.prof,
  }))

  const armor = b.armor.map((a) => ({
    name: a.name,
    display: a.display,
    potency: a.pot,
    resilient: a.res,
    worn: a.worn,
    proficiency: a.prof,
  }))

  const feats = b.feats.map(([name, , , level]) => ({ name, level }))

  const spellcasting = b.spellCasters.map(mapSpellcaster)

  const data: CharacterData = {
    abilities: { ...b.abilities },
    hitpoints: b.hitpoints,
    level: b.level,
    class: b.class,
    ancestry: b.ancestry,
    heritage: b.heritage,
    background: b.background,
    size: SIZE_MAP[b.size] ?? 'medium',
    keyAbility: isAbilityId(b.keyability) ? b.keyability : 'str',
    languages: [...b.languages],
    saves: {
      fortitude: numericToRank(b.proficiencies.fortitude),
      reflex: numericToRank(b.proficiencies.reflex),
      will: numericToRank(b.proficiencies.will),
    },
    perception: numericToRank(b.proficiencies.perception),
    skills,
    lores,
    armorProficiencies: {
      unarmored: numericToRank(b.proficiencies.unarmored),
      light: numericToRank(b.proficiencies.light),
      medium: numericToRank(b.proficiencies.medium),
      heavy: numericToRank(b.proficiencies.heavy),
    },
    weaponProficiencies: {
      unarmed: numericToRank(b.proficiencies.unarmed),
      simple: numericToRank(b.proficiencies.simple),
      martial: numericToRank(b.proficiencies.martial),
      advanced: numericToRank(b.proficiencies.advanced),
    },
    classDC: numericToRank(b.proficiencies.classDC),
    weapons,
    armor,
    feats,
    specials: [...b.specials],
    spellcasting,
    money: { ...b.money },
    importSource: 'pathbuilder2e',
    importedAt: new Date().toISOString(),
  }

  return { name: b.name, level: b.level, data }
}
```

- [ ] **Step 5: Write failing tests for the mapper**

`packages/pf2e-engine/src/__tests__/pathbuilder-mapper.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { mapPathbuilderToCharacter, numericToRank } from '../pathbuilder/mapper.js'
import type { PathbuilderExport } from '../pathbuilder/schema.js'

// Use the same fixture from schema tests — extract to a shared test helper if needed
function createFixture(overrides?: Partial<PathbuilderExport['build']>): PathbuilderExport {
  return {
    success: true,
    build: {
      name: 'Valeros',
      class: 'Fighter',
      dualClass: null,
      level: 5,
      ancestry: 'Human',
      heritage: 'Versatile Human',
      background: 'Gladiator',
      alignment: 'NG',
      gender: 'Male',
      age: '28',
      deity: 'Gorum',
      size: 2,
      keyability: 'str',
      languages: ['Common', 'Orcish'],
      rituals: [],
      resistances: [],
      inventorMods: [],
      attributes: { str: 19, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
      abilities: { str: 19, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
      proficiencies: {
        classDC: 4, perception: 4,
        fortitude: 4, reflex: 4, will: 2,
        heavy: 2, medium: 2, light: 2, unarmored: 2,
        advanced: 2, martial: 4, simple: 4, unarmed: 4,
        castingArcane: 0, castingDivine: 0, castingOccult: 0, castingPrimal: 0,
      },
      feats: [['Power Attack', null, null, 1], ['Sudden Charge', null, null, 2]],
      specials: ['Attack of Opportunity'],
      lores: [['Gladiatorial Lore', 2]],
      equipment: [['Adventurers Pack', 1]],
      specificProficiencies: { trained: [], expert: [], master: [], legendary: [] },
      weapons: [{
        name: 'Longsword', qty: 1, prof: 'martial', die: 'd8', pot: 1,
        str: 'striking', mat: null, display: '+1 Striking Longsword',
        rpieces: null, damageType: 'S', weight: '1', range: null,
      }],
      money: { pp: 0, gp: 15, sp: 5, cp: 0 },
      armor: [{
        name: 'Full Plate', qty: 1, prof: 'heavy', pot: 1, res: '',
        mat: null, display: '+1 Full Plate', worn: true, rpieces: null,
      }],
      spellCasters: [],
      focusPoints: 0,
      focus: {},
      pets: [],
      acTotal: { acProfBonus: 7, acAbilityBonus: 1, acItemBonus: 6, acTotal: 24, shieldBonus: null },
      skills: {
        acrobatics: 0, arcana: 0, athletics: 4, crafting: 0, deception: 0,
        diplomacy: 0, intimidation: 2, medicine: 0, nature: 0, occultism: 0,
        performance: 2, religion: 0, society: 0, stealth: 0, survival: 0, thievery: 0,
      },
      hitpoints: 73,
      familiars: [],
      formula: [],
      bulk: 5,
      ...overrides,
    },
  }
}

describe('numericToRank', () => {
  it('maps 0 to untrained', () => expect(numericToRank(0)).toBe('untrained'))
  it('maps 2 to trained', () => expect(numericToRank(2)).toBe('trained'))
  it('maps 4 to expert', () => expect(numericToRank(4)).toBe('expert'))
  it('maps 6 to master', () => expect(numericToRank(6)).toBe('master'))
  it('maps 8 to legendary', () => expect(numericToRank(8)).toBe('legendary'))
  it('maps 3 to trained (rounds down)', () => expect(numericToRank(3)).toBe('trained'))
})

describe('mapPathbuilderToCharacter', () => {
  it('maps basic character info', () => {
    const result = mapPathbuilderToCharacter(createFixture())
    expect(result.name).toBe('Valeros')
    expect(result.level).toBe(5)
    expect(result.data.class).toBe('Fighter')
    expect(result.data.ancestry).toBe('Human')
    expect(result.data.heritage).toBe('Versatile Human')
    expect(result.data.background).toBe('Gladiator')
  })

  it('maps ability scores correctly', () => {
    const { data } = mapPathbuilderToCharacter(createFixture())
    expect(data.abilities).toEqual({ str: 19, dex: 14, con: 16, int: 10, wis: 12, cha: 10 })
  })

  it('maps proficiency ranks for saves', () => {
    const { data } = mapPathbuilderToCharacter(createFixture())
    expect(data.saves.fortitude).toBe('expert')
    expect(data.saves.reflex).toBe('expert')
    expect(data.saves.will).toBe('trained')
  })

  it('maps skill proficiencies', () => {
    const { data } = mapPathbuilderToCharacter(createFixture())
    expect(data.skills.athletics).toBe('expert')
    expect(data.skills.intimidation).toBe('trained')
    expect(data.skills.arcana).toBe('untrained')
  })

  it('maps weapons', () => {
    const { data } = mapPathbuilderToCharacter(createFixture())
    expect(data.weapons).toHaveLength(1)
    expect(data.weapons[0].name).toBe('Longsword')
    expect(data.weapons[0].potency).toBe(1)
  })

  it('maps feats with levels', () => {
    const { data } = mapPathbuilderToCharacter(createFixture())
    expect(data.feats).toEqual([
      { name: 'Power Attack', level: 1 },
      { name: 'Sudden Charge', level: 2 },
    ])
  })

  it('maps size correctly', () => {
    const { data } = mapPathbuilderToCharacter(createFixture({ size: 1 }))
    expect(data.size).toBe('small')
  })

  it('sets import metadata', () => {
    const { data } = mapPathbuilderToCharacter(createFixture())
    expect(data.importSource).toBe('pathbuilder2e')
    expect(data.importedAt).toBeTruthy()
  })

  it('maps spellcasters when present', () => {
    const fixture = createFixture({
      spellCasters: [{
        name: 'Sorcerer',
        magicTradition: 'arcane',
        spellcastingType: 'spontaneous',
        ability: 'cha',
        proficiency: 4,
        focusPoints: 1,
        spells: [
          { spellLevel: 0, list: ['Electric Arc', 'Shield'] },
          { spellLevel: 1, list: ['Magic Missile', 'Fear'] },
        ],
        perDay: [5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      }],
    })
    const { data } = mapPathbuilderToCharacter(fixture)
    expect(data.spellcasting).toHaveLength(1)
    expect(data.spellcasting[0].tradition).toBe('arcane')
    expect(data.spellcasting[0].abilityId).toBe('cha')
    expect(data.spellcasting[0].slots).toEqual([{ level: 1, max: 3, used: 0 }])
    expect(data.spellcasting[0].knownSpells).toEqual([
      'Electric Arc', 'Shield', 'Magic Missile', 'Fear',
    ])
  })
})
```

- [ ] **Step 6: Create barrel export**

`packages/pf2e-engine/src/pathbuilder/index.ts`:
```typescript
export { type PathbuilderExport, type PathbuilderBuild } from './schema.js'
export { mapPathbuilderToCharacter, numericToRank, type CharacterData } from './mapper.js'
```

**Commit:** `feat(pf2e-engine): implement Pathbuilder-to-character mapper with tests`

---

### Task 3: Validation Against PF2e Engine Rules

**Files:**
- Create: `packages/pf2e-engine/src/pathbuilder/validator.ts`
- Test: `packages/pf2e-engine/src/__tests__/pathbuilder-validator.test.ts`

Validates the mapped character data against known pf2e rules. This is a sanity check, not a full character audit — catches obviously broken data (negative ability scores, level out of range, impossible proficiencies).

- [ ] **Step 1: Implement validation functions**

`packages/pf2e-engine/src/pathbuilder/validator.ts`:
```typescript
import type { CharacterData } from './mapper.js'
import type { AbilityId, ProficiencyRank } from '../types.js'

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

const MAX_ABILITY_SCORE = 30
const MIN_ABILITY_SCORE = 1
const MAX_LEVEL = 20
const PROFICIENCY_RANKS: ProficiencyRank[] = ['untrained', 'trained', 'expert', 'master', 'legendary']

function validateAbilities(data: CharacterData): ValidationError[] {
  const errors: ValidationError[] = []
  const abilities: AbilityId[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

  for (const ability of abilities) {
    const val = data.abilities[ability]
    if (val < MIN_ABILITY_SCORE || val > MAX_ABILITY_SCORE) {
      errors.push({
        field: `abilities.${ability}`,
        message: `${ability} score ${val} is outside valid range (${MIN_ABILITY_SCORE}-${MAX_ABILITY_SCORE})`,
        severity: 'error',
      })
    }
  }

  return errors
}

function validateLevel(data: CharacterData): ValidationError[] {
  if (data.level < 1 || data.level > MAX_LEVEL) {
    return [{
      field: 'level',
      message: `Level ${data.level} is outside valid range (1-${MAX_LEVEL})`,
      severity: 'error',
    }]
  }
  return []
}

function validateProficiencies(data: CharacterData): ValidationError[] {
  const errors: ValidationError[] = []

  // At level 1, master/legendary should not normally appear for saves
  if (data.level <= 2) {
    for (const [save, rank] of Object.entries(data.saves)) {
      if (rank === 'master' || rank === 'legendary') {
        errors.push({
          field: `saves.${save}`,
          message: `${save} proficiency ${rank} is unusual at level ${data.level}`,
          severity: 'warning',
        })
      }
    }
  }

  return errors
}

function validateHitpoints(data: CharacterData): ValidationError[] {
  if (data.hitpoints <= 0) {
    return [{
      field: 'hitpoints',
      message: `HP ${data.hitpoints} must be positive`,
      severity: 'error',
    }]
  }
  return []
}

function validateRequiredStrings(data: CharacterData): ValidationError[] {
  const errors: ValidationError[] = []
  if (!data.class.trim()) errors.push({ field: 'class', message: 'Class is required', severity: 'error' })
  if (!data.ancestry.trim()) errors.push({ field: 'ancestry', message: 'Ancestry is required', severity: 'error' })
  return errors
}

export function validateCharacterData(data: CharacterData): ValidationResult {
  const allIssues = [
    ...validateAbilities(data),
    ...validateLevel(data),
    ...validateProficiencies(data),
    ...validateHitpoints(data),
    ...validateRequiredStrings(data),
  ]

  const errors = allIssues.filter((e) => e.severity === 'error')
  const warnings = allIssues.filter((e) => e.severity === 'warning')

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
```

- [ ] **Step 2: Write tests**

`packages/pf2e-engine/src/__tests__/pathbuilder-validator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { validateCharacterData } from '../pathbuilder/validator.js'
import type { CharacterData } from '../pathbuilder/mapper.js'

function createValidData(overrides?: Partial<CharacterData>): CharacterData {
  return {
    abilities: { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
    hitpoints: 73,
    level: 5,
    class: 'Fighter',
    ancestry: 'Human',
    heritage: 'Versatile Human',
    background: 'Gladiator',
    size: 'medium',
    keyAbility: 'str',
    languages: ['Common'],
    saves: { fortitude: 'expert', reflex: 'expert', will: 'trained' },
    perception: 'expert',
    skills: { athletics: 'expert', stealth: 'untrained' },
    lores: [],
    armorProficiencies: { unarmored: 'trained', light: 'trained', medium: 'trained', heavy: 'trained' },
    weaponProficiencies: { unarmed: 'expert', simple: 'expert', martial: 'expert', advanced: 'trained' },
    classDC: 'expert',
    weapons: [],
    armor: [],
    feats: [],
    specials: [],
    spellcasting: [],
    money: { pp: 0, gp: 0, sp: 0, cp: 0 },
    importSource: 'pathbuilder2e',
    importedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('validateCharacterData', () => {
  it('passes for valid character data', () => {
    const result = validateCharacterData(createValidData())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects ability score below minimum', () => {
    const result = validateCharacterData(createValidData({
      abilities: { str: 0, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
    }))
    expect(result.valid).toBe(false)
    expect(result.errors[0].field).toBe('abilities.str')
  })

  it('rejects ability score above maximum', () => {
    const result = validateCharacterData(createValidData({
      abilities: { str: 50, dex: 14, con: 16, int: 10, wis: 12, cha: 10 },
    }))
    expect(result.valid).toBe(false)
  })

  it('rejects level 0', () => {
    const result = validateCharacterData(createValidData({ level: 0 }))
    expect(result.valid).toBe(false)
    expect(result.errors[0].field).toBe('level')
  })

  it('rejects level above 20', () => {
    const result = validateCharacterData(createValidData({ level: 21 }))
    expect(result.valid).toBe(false)
  })

  it('rejects zero hitpoints', () => {
    const result = validateCharacterData(createValidData({ hitpoints: 0 }))
    expect(result.valid).toBe(false)
  })

  it('rejects empty class', () => {
    const result = validateCharacterData(createValidData({ class: '' }))
    expect(result.valid).toBe(false)
  })

  it('warns on unusual proficiency at low level', () => {
    const result = validateCharacterData(createValidData({
      level: 1,
      saves: { fortitude: 'master', reflex: 'trained', will: 'trained' },
    }))
    expect(result.valid).toBe(true) // warnings don't fail
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Update barrel export**

Update `packages/pf2e-engine/src/pathbuilder/index.ts`:
```typescript
export { type PathbuilderExport, type PathbuilderBuild } from './schema.js'
export { mapPathbuilderToCharacter, numericToRank, type CharacterData } from './mapper.js'
export { validateCharacterData, type ValidationResult, type ValidationError } from './validator.js'
```

**Commit:** `feat(pf2e-engine): add validation for imported character data`

---

### Task 4: Zod Schema for Runtime JSON Validation

**Files:**
- Create: `apps/web/lib/schemas/pathbuilder.ts`

This validates the raw uploaded JSON at the API boundary before we pass it to the mapper. Catches malformed files, missing fields, wrong types.

- [ ] **Step 1: Create Zod schema**

`apps/web/lib/schemas/pathbuilder.ts`:
```typescript
import { z } from 'zod'

const abilitiesSchema = z.object({
  str: z.number(),
  dex: z.number(),
  con: z.number(),
  int: z.number(),
  wis: z.number(),
  cha: z.number(),
})

const proficienciesSchema = z.object({
  classDC: z.number(),
  perception: z.number(),
  fortitude: z.number(),
  reflex: z.number(),
  will: z.number(),
  heavy: z.number(),
  medium: z.number(),
  light: z.number(),
  unarmored: z.number(),
  advanced: z.number(),
  martial: z.number(),
  simple: z.number(),
  unarmed: z.number(),
  castingArcane: z.number(),
  castingDivine: z.number(),
  castingOccult: z.number(),
  castingPrimal: z.number(),
})

const weaponSchema = z.object({
  name: z.string(),
  qty: z.number(),
  prof: z.string(),
  die: z.string(),
  pot: z.number(),
  str: z.string(),
  mat: z.string().nullable(),
  display: z.string(),
  rpieces: z.string().nullable(),
  damageType: z.string(),
  weight: z.string(),
  range: z.number().nullable(),
})

const armorSchema = z.object({
  name: z.string(),
  qty: z.number(),
  prof: z.string(),
  pot: z.number(),
  res: z.string(),
  mat: z.string().nullable(),
  display: z.string(),
  worn: z.boolean(),
  rpieces: z.string().nullable(),
})

const spellLevelSchema = z.object({
  spellLevel: z.number(),
  list: z.array(z.string()),
})

const spellCasterSchema = z.object({
  name: z.string(),
  magicTradition: z.string(),
  spellcastingType: z.string(),
  ability: z.string(),
  proficiency: z.number(),
  focusPoints: z.number(),
  spells: z.array(spellLevelSchema),
  perDay: z.array(z.number()),
})

const buildSchema = z.object({
  name: z.string().min(1, 'Character name is required'),
  class: z.string().min(1),
  dualClass: z.string().nullable(),
  level: z.number().int().min(1).max(20),
  ancestry: z.string().min(1),
  heritage: z.string(),
  background: z.string(),
  alignment: z.string(),
  gender: z.string(),
  age: z.string(),
  deity: z.string(),
  size: z.number().int().min(0).max(4),
  keyability: z.string(),
  languages: z.array(z.string()),
  attributes: abilitiesSchema,
  abilities: abilitiesSchema,
  proficiencies: proficienciesSchema,
  feats: z.array(z.tuple([z.string(), z.string().nullable(), z.string().nullable(), z.number()])),
  specials: z.array(z.string()),
  lores: z.array(z.tuple([z.string(), z.number()])),
  weapons: z.array(weaponSchema),
  money: z.object({ pp: z.number(), gp: z.number(), sp: z.number(), cp: z.number() }),
  armor: z.array(armorSchema),
  spellCasters: z.array(spellCasterSchema),
  skills: z.record(z.string(), z.number()),
  hitpoints: z.number().int().min(1),
  // Fields we accept but don't strictly require exact shapes for:
  equipment: z.array(z.unknown()).optional(),
  specificProficiencies: z.unknown().optional(),
  focusPoints: z.number().optional(),
  focus: z.unknown().optional(),
  pets: z.array(z.unknown()).optional(),
  acTotal: z.unknown().optional(),
  familiars: z.array(z.unknown()).optional(),
  formula: z.array(z.unknown()).optional(),
  bulk: z.number().optional(),
  rituals: z.array(z.unknown()).optional(),
  resistances: z.array(z.unknown()).optional(),
  inventorMods: z.array(z.unknown()).optional(),
})

export const pathbuilderExportSchema = z.object({
  success: z.boolean(),
  build: buildSchema,
})

export type PathbuilderExportInput = z.infer<typeof pathbuilderExportSchema>
```

**Commit:** `feat(web): add Zod validation schema for Pathbuilder JSON uploads`

---

### Task 5: API Route for Import

**Files:**
- Create: `apps/web/app/api/characters/import/route.ts`

- [ ] **Step 1: Implement the POST handler**

`apps/web/app/api/characters/import/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pathbuilderExportSchema } from '@/lib/schemas/pathbuilder'
import { mapPathbuilderToCharacter } from '@dndmanager/pf2e-engine/pathbuilder'
import { validateCharacterData } from '@dndmanager/pf2e-engine/pathbuilder'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  // Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungueltiges JSON' }, { status: 400 })
  }

  const { campaignId, pathbuilderData } = body as {
    campaignId?: string
    pathbuilderData?: unknown
  }

  if (!campaignId || !pathbuilderData) {
    return NextResponse.json(
      { error: 'campaignId und pathbuilderData sind erforderlich' },
      { status: 400 },
    )
  }

  // Verify campaign membership
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Kampagne nicht gefunden' }, { status: 404 })
  }

  // Validate Pathbuilder JSON shape
  const parseResult = pathbuilderExportSchema.safeParse(pathbuilderData)
  if (!parseResult.success) {
    return NextResponse.json({
      error: 'Ungueltige Pathbuilder-Datei',
      details: parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    }, { status: 422 })
  }

  // Map to our format
  const { name, level, data } = mapPathbuilderToCharacter(parseResult.data)

  // Validate against pf2e rules
  const validation = validateCharacterData(data)
  if (!validation.valid) {
    return NextResponse.json({
      error: 'Charakter-Validierung fehlgeschlagen',
      details: validation.errors.map((e) => `${e.field}: ${e.message}`),
      warnings: validation.warnings.map((w) => `${w.field}: ${w.message}`),
    }, { status: 422 })
  }

  // Insert character
  const { data: character, error: insertError } = await supabase
    .from('characters')
    .insert({
      name,
      level,
      xp: 0,
      owner_id: user.id,
      campaign_id: campaignId,
      data,
    })
    .select('id, name')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    character,
    warnings: validation.warnings.map((w) => `${w.field}: ${w.message}`),
  }, { status: 201 })
}
```

**Commit:** `feat(web): add API route for Pathbuilder character import`

---

### Task 6: Import UI Components

**Files:**
- Create: `apps/web/components/character/PathbuilderPreview.tsx`
- Create: `apps/web/components/character/PathbuilderImport.tsx`
- Create: `apps/web/app/(lobby)/campaigns/[campaignId]/characters/import/page.tsx`

- [ ] **Step 1: Build the preview component**

`apps/web/components/character/PathbuilderPreview.tsx`:
```tsx
import type { CharacterData } from '@dndmanager/pf2e-engine/pathbuilder'
import { abilityModifier } from '@dndmanager/pf2e-engine'
import type { AbilityId } from '@dndmanager/pf2e-engine'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PathbuilderPreviewProps {
  name: string
  data: CharacterData
}

const ABILITY_LABELS: Record<AbilityId, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
}

function formatModifier(score: number): string {
  const mod = abilityModifier(score)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function PathbuilderPreview({ name, data }: PathbuilderPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold">{name}</h3>
        <p className="text-sm text-neutral-400">
          Level {data.level} {data.ancestry} {data.heritage} {data.class}
        </p>
        <p className="text-sm text-neutral-400">
          {data.background} &middot; {data.size} &middot; HP {data.hitpoints}
        </p>
      </div>

      {/* Ability Scores */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ability Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2 text-center text-sm">
            {(Object.entries(data.abilities) as [AbilityId, number][]).map(([id, score]) => (
              <div key={id}>
                <div className="text-xs text-neutral-400">{ABILITY_LABELS[id]}</div>
                <div className="font-bold">{score}</div>
                <div className="text-xs text-neutral-500">{formatModifier(score)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saves & Perception */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Saves & Perception</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid grid-cols-2 gap-1">
            <span>Fortitude:</span><span className="font-medium">{data.saves.fortitude}</span>
            <span>Reflex:</span><span className="font-medium">{data.saves.reflex}</span>
            <span>Will:</span><span className="font-medium">{data.saves.will}</span>
            <span>Perception:</span><span className="font-medium">{data.perception}</span>
          </div>
        </CardContent>
      </Card>

      {/* Skills (only trained+) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Trained Skills</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {Object.entries(data.skills)
            .filter(([, rank]) => rank !== 'untrained')
            .map(([skill, rank]) => (
              <div key={skill} className="flex justify-between">
                <span className="capitalize">{skill}</span>
                <span className="text-neutral-400">{rank}</span>
              </div>
            ))}
          {data.lores.map((lore) => (
            <div key={lore.name} className="flex justify-between">
              <span>{lore.name}</span>
              <span className="text-neutral-400">{lore.rank}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Weapons */}
      {data.weapons.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weapons</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {data.weapons.map((w, i) => (
              <div key={i}>{w.display} ({w.die} {w.damageType})</div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Armor */}
      {data.armor.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Armor</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {data.armor.filter((a) => a.worn).map((a, i) => (
              <div key={i}>{a.display}</div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Feats */}
      {data.feats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Feats</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {data.feats.map((f, i) => (
              <div key={i} className="flex justify-between">
                <span>{f.name}</span>
                <span className="text-neutral-400">Lvl {f.level}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build the import component with upload, preview, and confirm**

`apps/web/components/character/PathbuilderImport.tsx`:
```tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PathbuilderPreview } from './PathbuilderPreview'
import { mapPathbuilderToCharacter, validateCharacterData } from '@dndmanager/pf2e-engine/pathbuilder'
import { pathbuilderExportSchema } from '@/lib/schemas/pathbuilder'
import type { CharacterData } from '@dndmanager/pf2e-engine/pathbuilder'

interface PathbuilderImportProps {
  campaignId: string
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'done' | 'error'

export function PathbuilderImport({ campaignId }: PathbuilderImportProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [parsedName, setParsedName] = useState('')
  const [parsedData, setParsedData] = useState<CharacterData | null>(null)
  const [rawData, setRawData] = useState<unknown>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)

        // Validate structure
        const parseResult = pathbuilderExportSchema.safeParse(json)
        if (!parseResult.success) {
          setError(
            'Ungueltige Pathbuilder-Datei: ' +
            parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
          )
          return
        }

        // Map to our format
        const { name, data } = mapPathbuilderToCharacter(parseResult.data)

        // Validate against rules
        const validation = validateCharacterData(data)
        if (!validation.valid) {
          setError(
            'Charakter-Validierung fehlgeschlagen: ' +
            validation.errors.map((e) => e.message).join(', ')
          )
          return
        }

        setWarnings(validation.warnings.map((w) => w.message))
        setParsedName(name)
        setParsedData(data)
        setRawData(json)
        setStep('preview')
      } catch {
        setError('Datei konnte nicht als JSON gelesen werden.')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!rawData) return
    setStep('importing')
    setError(null)

    try {
      const res = await fetch('/api/characters/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, pathbuilderData: rawData }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Import fehlgeschlagen')
        setStep('error')
        return
      }

      setStep('done')
      setTimeout(() => {
        router.push(`/campaigns/${campaignId}`)
        router.refresh()
      }, 1500)
    } catch {
      setError('Netzwerkfehler beim Import')
      setStep('error')
    }
  }, [rawData, campaignId, router])

  const handleReset = useCallback(() => {
    setStep('upload')
    setParsedName('')
    setParsedData(null)
    setRawData(null)
    setWarnings([])
    setError(null)
  }, [])

  return (
    <div className="space-y-4">
      {/* Upload Step */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pathbuilder 2e Import</CardTitle>
            <CardDescription>
              Exportiere deinen Charakter in Pathbuilder 2e als JSON und lade die Datei hier hoch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="pb-file"
                className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-neutral-600 p-8 text-center transition-colors hover:border-neutral-400"
              >
                <p className="text-sm text-neutral-300">JSON-Datei hierher ziehen oder klicken</p>
                <p className="text-xs text-neutral-500 mt-1">.json Datei aus Pathbuilder 2e</p>
                <input
                  id="pb-file"
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Step */}
      {step === 'preview' && parsedData && (
        <>
          {warnings.length > 0 && (
            <Card className="border-yellow-600">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-yellow-500">Hinweise:</p>
                <ul className="text-sm text-yellow-400 list-disc pl-4 mt-1">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          <PathbuilderPreview name={parsedName} data={parsedData} />

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Abbrechen
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Charakter importieren
            </Button>
          </div>
        </>
      )}

      {/* Importing */}
      {step === 'importing' && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-neutral-300">Charakter wird importiert...</p>
          </CardContent>
        </Card>
      )}

      {/* Done */}
      {step === 'done' && (
        <Card className="border-green-600">
          <CardContent className="py-8 text-center">
            <p className="text-green-400 font-medium">Charakter erfolgreich importiert!</p>
            <p className="text-sm text-neutral-400 mt-1">Weiterleitung...</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-600">
          <CardContent className="pt-4">
            <p className="text-sm text-red-400">{error}</p>
            {step === 'error' && (
              <Button variant="outline" onClick={handleReset} className="mt-3">
                Erneut versuchen
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create the import page**

`apps/web/app/(lobby)/campaigns/[campaignId]/characters/import/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PathbuilderImport } from '@/components/character/PathbuilderImport'

export default async function ImportCharacterPage({
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
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Charakter importieren</h1>
          <p className="text-sm text-neutral-400">Kampagne: {campaign.name}</p>
        </div>
        <PathbuilderImport campaignId={campaignId} />
      </div>
    </main>
  )
}
```

**Commit:** `feat(web): add Pathbuilder import UI with upload, preview, and confirm flow`

---

### Task 7: Wire Up Exports and Navigation

**Files:**
- Modify: `packages/pf2e-engine/src/index.ts`
- Modify: `apps/web/app/(lobby)/campaigns/[campaignId]/characters/new/page.tsx` (add link to import)

- [ ] **Step 1: Export pathbuilder module from pf2e-engine**

Add to `packages/pf2e-engine/src/index.ts`:
```typescript
// ─── Pathbuilder Import ──────────────────────────
export {
  mapPathbuilderToCharacter,
  numericToRank,
  validateCharacterData,
  type CharacterData,
  type PathbuilderExport,
  type ValidationResult,
  type ValidationError,
} from './pathbuilder/index.js'
```

- [ ] **Step 2: Add import link to the new character page**

In `apps/web/app/(lobby)/campaigns/[campaignId]/characters/new/page.tsx`, add a link below the `CharacterForm`:
```tsx
import Link from 'next/link'

// Add inside the Card, after </CardContent>, before closing </Card>:
<CardContent className="border-t border-neutral-800 pt-4">
  <p className="text-sm text-neutral-400 text-center">
    Oder{' '}
    <Link
      href={`/campaigns/${campaignId}/characters/import`}
      className="text-blue-400 hover:underline"
    >
      Charakter aus Pathbuilder 2e importieren
    </Link>
  </p>
</CardContent>
```

**Commit:** `feat: wire up Pathbuilder import exports and add navigation link`

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Pathbuilder JSON schema types | `pf2e-engine/src/pathbuilder/schema.ts` |
| 2 | Mapper: Pathbuilder → CharacterData | `pf2e-engine/src/pathbuilder/mapper.ts` |
| 3 | Validation against pf2e rules | `pf2e-engine/src/pathbuilder/validator.ts` |
| 4 | Zod schema for runtime upload validation | `web/lib/schemas/pathbuilder.ts` |
| 5 | POST API route `/api/characters/import` | `web/app/api/characters/import/route.ts` |
| 6 | Import UI: upload + preview + confirm | `web/components/character/PathbuilderImport.tsx` + page |
| 7 | Wire up exports and navigation | index.ts + link on new character page |

**Total new files:** 10
**Modified files:** 2
**Test files:** 3

All mapping and validation logic lives in pure functions in `pf2e-engine` — fully testable with Vitest, no browser or DB dependency. The web layer handles auth, file upload, and persistence.
