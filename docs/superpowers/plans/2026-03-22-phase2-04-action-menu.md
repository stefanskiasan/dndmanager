# Phase 2.4: Action Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the contextual action menu that shows available actions during encounters with pre-calculated bonuses, spell slot status, and skill action options. When a player clicks Strike, they see weapons with attack bonuses and MAP. When they click Cast, they see available spells with slot counts.

**Architecture:** React components in `apps/web/components/game/` that read from the Zustand store and use pf2e-engine functions to compute available options. The menu replaces the placeholder buttons from Phase 1.5.

**Tech Stack:** React, Zustand, shadcn/ui, @dndmanager/pf2e-engine

---

## File Structure

```
apps/web/components/game/
├── actions/
│   ├── ActionMenu.tsx                → Main action menu container
│   ├── StrikeMenu.tsx                → Weapon selection + attack bonuses + MAP
│   ├── MoveMenu.tsx                  → Movement range display + speed
│   ├── SpellMenu.tsx                 → Spell list with slot tracking
│   ├── SkillMenu.tsx                 → Skill actions (Trip, Demoralize, etc.)
│   └── ActionButton.tsx              → Reusable action button component
```

---

### Task 1: Action Button Component

**Files:**
- Create: `apps/web/components/game/actions/ActionButton.tsx`

- [ ] **Step 1: Create reusable action button**

`apps/web/components/game/actions/ActionButton.tsx`:
```tsx
'use client'

import { Button } from '@/components/ui/button'

interface ActionButtonProps {
  label: string
  description?: string
  bonus?: number
  cost?: number
  disabled?: boolean
  variant?: 'strike' | 'move' | 'spell' | 'skill' | 'default'
  onClick: () => void
}

const VARIANT_COLORS = {
  strike: 'bg-red-700 hover:bg-red-600 text-white',
  move: 'bg-green-700 hover:bg-green-600 text-white',
  spell: 'bg-purple-700 hover:bg-purple-600 text-white',
  skill: 'bg-yellow-700 hover:bg-yellow-600 text-white',
  default: 'bg-neutral-700 hover:bg-neutral-600 text-white',
}

export function ActionButton({
  label,
  description,
  bonus,
  cost = 1,
  disabled = false,
  variant = 'default',
  onClick,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${VARIANT_COLORS[variant]}`}
    >
      <div>
        <div className="font-medium">{label}</div>
        {description && <div className="text-xs opacity-75">{description}</div>}
      </div>
      <div className="flex items-center gap-2">
        {bonus !== undefined && (
          <span className="rounded bg-black/20 px-2 py-0.5 text-xs font-mono">
            {bonus >= 0 ? '+' : ''}{bonus}
          </span>
        )}
        <div className="flex gap-0.5">
          {Array.from({ length: cost }).map((_, i) => (
            <div key={i} className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          ))}
        </div>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/actions/
git commit -m "feat(web): add reusable ActionButton component"
```

---

### Task 2: Strike Menu

**Files:**
- Create: `apps/web/components/game/actions/StrikeMenu.tsx`

- [ ] **Step 1: Create strike menu**

`apps/web/components/game/actions/StrikeMenu.tsx`:
```tsx
'use client'

import { useMemo } from 'react'
import { ActionButton } from './ActionButton'
import { useGameStore } from '@/lib/stores/game-store'
import { multipleAttackPenalty } from '@dndmanager/pf2e-engine'

interface Weapon {
  name: string
  attackBonus: number
  damage: string
  damageType: string
  agile: boolean
  reach: number
  traits: string[]
}

// Placeholder weapons until character system is full
const DEFAULT_WEAPONS: Weapon[] = [
  { name: 'Longsword', attackBonus: 12, damage: '1d8+4', damageType: 'slashing', agile: false, reach: 5, traits: ['versatile P'] },
  { name: 'Dagger', attackBonus: 12, damage: '1d4+4', damageType: 'piercing', agile: true, reach: 5, traits: ['agile', 'finesse', 'thrown 10'] },
  { name: 'Shortbow', attackBonus: 10, damage: '1d6', damageType: 'piercing', agile: false, reach: 60, traits: ['deadly d10'] },
]

interface StrikeMenuProps {
  onStrike: (weapon: Weapon, attackNumber: 1 | 2 | 3) => void
  onBack: () => void
}

export function StrikeMenu({ onStrike, onBack }: StrikeMenuProps) {
  const turn = useGameStore((s) => s.turn)
  const actionsUsed = turn?.actionsUsed ?? []

  const attackNumber = useMemo(() => {
    const strikes = actionsUsed.filter((a) => a.type === 'strike').length
    return Math.min(strikes + 1, 3) as 1 | 2 | 3
  }, [actionsUsed])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">Strike</h3>
        <button onClick={onBack} className="text-xs text-neutral-500 hover:text-neutral-300">
          Zurueck
        </button>
      </div>

      {attackNumber > 1 && (
        <div className="rounded bg-neutral-800 px-2 py-1 text-xs text-amber-400">
          {attackNumber}. Angriff (MAP)
        </div>
      )}

      <div className="space-y-1">
        {DEFAULT_WEAPONS.map((weapon) => {
          const map = multipleAttackPenalty(attackNumber, weapon.agile)
          const totalBonus = weapon.attackBonus + map

          return (
            <ActionButton
              key={weapon.name}
              label={weapon.name}
              description={`${weapon.damage} ${weapon.damageType} • ${weapon.traits.join(', ')}`}
              bonus={totalBonus}
              variant="strike"
              disabled={!turn || turn.actionsRemaining <= 0}
              onClick={() => onStrike(weapon, attackNumber)}
            />
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/actions/StrikeMenu.tsx
git commit -m "feat(web): add Strike menu with weapon selection and MAP calculation"
```

---

### Task 3: Spell Menu

**Files:**
- Create: `apps/web/components/game/actions/SpellMenu.tsx`

- [ ] **Step 1: Create spell menu**

`apps/web/components/game/actions/SpellMenu.tsx`:
```tsx
'use client'

import { ActionButton } from './ActionButton'
import { useGameStore } from '@/lib/stores/game-store'
import type { SpellDefinition } from '@dndmanager/pf2e-engine'

// Placeholder spells until data import
const PLACEHOLDER_SPELLS: (SpellDefinition & { slotLevel: number; slotsRemaining: number })[] = [
  {
    id: 'magic-missile',
    name: 'Magic Missile',
    level: 1,
    traditions: ['arcane', 'occult'],
    components: ['somatic', 'verbal'],
    castActions: 2,
    range: 120,
    damage: { formula: '1d4+1', type: 'force' },
    description: 'Unfehlbares Kraftgeschoss',
    slotLevel: 1,
    slotsRemaining: 2,
  },
  {
    id: 'fireball',
    name: 'Fireball',
    level: 3,
    traditions: ['arcane', 'primal'],
    components: ['somatic', 'verbal'],
    castActions: 2,
    range: 500,
    area: { type: 'burst', size: 20 },
    save: { type: 'reflex', basic: true },
    damage: { formula: '6d6', type: 'fire', heightenedPerLevel: '2d6' },
    description: 'Feuerexplosion',
    slotLevel: 3,
    slotsRemaining: 1,
  },
  {
    id: 'heal',
    name: 'Heal',
    level: 1,
    traditions: ['divine', 'primal'],
    components: ['somatic', 'verbal'],
    castActions: 2,
    range: 30,
    damage: { formula: '1d8', type: 'positive' },
    description: 'Heilt Verbundete',
    slotLevel: 1,
    slotsRemaining: 2,
  },
]

interface SpellMenuProps {
  onCast: (spell: SpellDefinition) => void
  onBack: () => void
}

export function SpellMenu({ onCast, onBack }: SpellMenuProps) {
  const turn = useGameStore((s) => s.turn)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">Zauber</h3>
        <button onClick={onBack} className="text-xs text-neutral-500 hover:text-neutral-300">
          Zurueck
        </button>
      </div>

      <div className="space-y-1">
        {PLACEHOLDER_SPELLS.map((spell) => (
          <ActionButton
            key={spell.id}
            label={spell.name}
            description={`Level ${spell.level} • ${spell.damage?.formula ?? ''} ${spell.damage?.type ?? ''} • ${spell.slotsRemaining} Slots`}
            cost={typeof spell.castActions === 'number' ? spell.castActions : 1}
            variant="spell"
            disabled={
              !turn ||
              turn.actionsRemaining < (typeof spell.castActions === 'number' ? spell.castActions : 1) ||
              spell.slotsRemaining <= 0
            }
            onClick={() => onCast(spell)}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/actions/SpellMenu.tsx
git commit -m "feat(web): add Spell menu with slot tracking"
```

---

### Task 4: Skill Menu

**Files:**
- Create: `apps/web/components/game/actions/SkillMenu.tsx`

- [ ] **Step 1: Create skill menu**

`apps/web/components/game/actions/SkillMenu.tsx`:
```tsx
'use client'

import { ActionButton } from './ActionButton'
import { useGameStore } from '@/lib/stores/game-store'
import { SKILL_ACTIONS } from '@dndmanager/pf2e-engine'

interface SkillMenuProps {
  onUseSkill: (actionId: string) => void
  onBack: () => void
}

// Placeholder skill bonuses until character system
const SKILL_BONUSES: Record<string, number> = {
  athletics: 10,
  intimidation: 8,
  perception: 7,
  varies: 6,
}

export function SkillMenu({ onUseSkill, onBack }: SkillMenuProps) {
  const turn = useGameStore((s) => s.turn)

  const actions = Object.values(SKILL_ACTIONS)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">Fertigkeiten</h3>
        <button onClick={onBack} className="text-xs text-neutral-500 hover:text-neutral-300">
          Zurueck
        </button>
      </div>

      <div className="space-y-1">
        {actions.map((action) => (
          <ActionButton
            key={action.id}
            label={action.name}
            description={`${action.skill} • ${action.traits.join(', ')}`}
            bonus={SKILL_BONUSES[action.skill] ?? 0}
            variant="skill"
            disabled={!turn || turn.actionsRemaining <= 0}
            onClick={() => onUseSkill(action.id)}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/actions/SkillMenu.tsx
git commit -m "feat(web): add Skill action menu with PF2e skill actions"
```

---

### Task 5: Move Menu

**Files:**
- Create: `apps/web/components/game/actions/MoveMenu.tsx`

- [ ] **Step 1: Create move menu**

`apps/web/components/game/actions/MoveMenu.tsx`:
```tsx
'use client'

import { ActionButton } from './ActionButton'
import { useGameStore } from '@/lib/stores/game-store'

interface MoveMenuProps {
  onStride: () => void
  onStep: () => void
  onBack: () => void
}

export function MoveMenu({ onStride, onStep, onBack }: MoveMenuProps) {
  const turn = useGameStore((s) => s.turn)
  const selectedTokenId = useGameStore((s) => s.selectedTokenId)
  const tokens = useGameStore((s) => s.tokens)

  const selectedToken = tokens.find((t) => t.id === selectedTokenId)
  const speed = selectedToken?.speed ?? 25

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-300">Bewegung</h3>
        <button onClick={onBack} className="text-xs text-neutral-500 hover:text-neutral-300">
          Zurueck
        </button>
      </div>

      <div className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-400">
        Geschwindigkeit: {speed} ft
      </div>

      <div className="space-y-1">
        <ActionButton
          label="Stride"
          description={`Bewege dich bis zu ${speed} ft`}
          variant="move"
          disabled={!turn || turn.actionsRemaining <= 0}
          onClick={onStride}
        />
        <ActionButton
          label="Step"
          description="Bewege dich 5 ft ohne Reaktionen auszuloesen"
          variant="move"
          disabled={!turn || turn.actionsRemaining <= 0}
          onClick={onStep}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/game/actions/MoveMenu.tsx
git commit -m "feat(web): add Move menu with Stride and Step options"
```

---

### Task 6: Main Action Menu

**Files:**
- Create: `apps/web/components/game/actions/ActionMenu.tsx`
- Modify: `apps/web/components/game/UIOverlay.tsx`

- [ ] **Step 1: Create main action menu**

`apps/web/components/game/actions/ActionMenu.tsx`:
```tsx
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
```

- [ ] **Step 2: Update UIOverlay to use ActionMenu**

In `apps/web/components/game/UIOverlay.tsx`, replace the hardcoded buttons in the `ActionBar` component with `<ActionMenu />`. Import it from `./actions/ActionMenu`. Replace the button group div with just `<ActionMenu />`.

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/game/actions/ apps/web/components/game/UIOverlay.tsx
git commit -m "feat(web): add contextual action menu with Strike, Move, Spell, and Skill submenus"
```
