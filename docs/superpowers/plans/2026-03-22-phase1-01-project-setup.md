# Phase 1.1: Project Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the monorepo infrastructure, Supabase backend, authentication, and database schema so all subsequent packages have a working foundation to build on.

**Architecture:** pnpm workspace monorepo with Turborepo for build orchestration. Next.js 15 App Router as the web app. Supabase for PostgreSQL, Auth, Realtime, and Storage. All packages use TypeScript strict mode.

**Tech Stack:** pnpm, Turborepo, TypeScript 5.x, Next.js 15, Supabase, Tailwind CSS 4, shadcn/ui, Vitest, Zod

**Spec:** `docs/superpowers/specs/2026-03-21-dndmanager-platform-design.md`

---

## File Structure

```
dndmanager/
├── package.json                          → Root package.json (workspace config)
├── pnpm-workspace.yaml                   → pnpm workspace definition
├── turbo.json                            → Turborepo pipeline config
├── tsconfig.base.json                    → Shared TypeScript config
├── .env.example                          → Example env vars
├── .gitignore                            → Updated gitignore
├── CLAUDE.md                             → Root Claude Code conventions
│
├── apps/
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── postcss.config.mjs
│       ├── app/
│       │   ├── layout.tsx                → Root layout (providers, fonts)
│       │   ├── page.tsx                  → Landing page (redirect to lobby)
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx        → Login page
│       │   │   ├── register/page.tsx     → Register page
│       │   │   └── callback/route.ts     → Supabase auth callback
│       │   └── (lobby)/
│       │       └── campaigns/page.tsx    → Campaign list (placeholder)
│       ├── lib/
│       │   ├── supabase/
│       │   │   ├── client.ts             → Browser Supabase client
│       │   │   ├── server.ts             → Server Supabase client
│       │   │   └── middleware.ts         → Auth middleware helper
│       │   └── types/
│       │       └── database.ts           → Generated Supabase types
│       ├── components/
│       │   └── ui/                       → shadcn/ui components (Button, Input, Card...)
│       └── middleware.ts                 → Next.js middleware (auth guard)
│
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                  → Re-exports
│   │   │   ├── types/
│   │   │   │   ├── user.ts               → User & Profile types
│   │   │   │   ├── campaign.ts           → Campaign & Session types
│   │   │   │   └── character.ts          → Character base types (stub for now)
│   │   │   └── constants/
│   │   │       └── index.ts              → Shared constants
│   │   └── vitest.config.ts
│   │
│   ├── pf2e-engine/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   └── index.ts                  → Empty entry point (placeholder)
│   │   └── vitest.config.ts
│   │
│   ├── game-runtime/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   └── index.ts                  → Empty entry point (placeholder)
│   │   └── vitest.config.ts
│   │
│   ├── scene-framework/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   └── index.ts                  → Empty entry point (placeholder)
│   │   └── vitest.config.ts
│   │
│   └── ai-services/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   └── index.ts                  → Empty entry point (placeholder)
│       └── vitest.config.ts
│
└── supabase/
    ├── config.toml                       → Supabase local dev config
    ├── seed.sql                          → Seed data (empty for now)
    └── migrations/
        └── 00001_initial_schema.sql      → Core tables + RLS policies
```

---

### Task 1: Root Monorepo Setup

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Modify: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "dndmanager",
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "test:watch": "turbo test:watch",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\""
  },
  "devDependencies": {
    "prettier": "^3.4.0",
    "turbo": "^2.3.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Update .gitignore**

```
node_modules/
.next/
dist/
.turbo/
.env
.env.local
.env.production.local
.superpowers/
*.tsbuildinfo
```

- [ ] **Step 6: Install dependencies and verify**

Run: `pnpm install`
Expected: lockfile created, no errors

Run: `ls node_modules/.pnpm`
Expected: directory exists with packages

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .gitignore
git commit -m "feat: initialize monorepo with pnpm, Turborepo, and TypeScript"
```

---

### Task 2: Shared Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/types/campaign.ts`
- Create: `packages/shared/src/types/character.ts`
- Create: `packages/shared/src/constants/index.ts`
- Test: `packages/shared/src/__tests__/types.test.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@dndmanager/shared",
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
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create packages/shared/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

- [ ] **Step 4: Write the type definitions**

`packages/shared/src/types/user.ts`:
```typescript
export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  role: 'player' | 'gm'
  created_at: string
  updated_at: string
}
```

`packages/shared/src/types/campaign.ts`:
```typescript
export interface Campaign {
  id: string
  name: string
  description: string
  gm_id: string
  invite_code: string
  settings: CampaignSettings
  created_at: string
  updated_at: string
}

export interface CampaignSettings {
  rateLimits: {
    aiCallsPerHour: number
    modelGenerationsPerDay: number
    audioGenerationsPerSession: number
    realtimeUpdatesPerMinute: number
  }
  dataRetention: {
    aiConversationDays: number
    sessionSnapshotMax: number
    actionLogDays: number
  }
}

export const DEFAULT_CAMPAIGN_SETTINGS: CampaignSettings = {
  rateLimits: {
    aiCallsPerHour: 50,
    modelGenerationsPerDay: 5,
    audioGenerationsPerSession: 20,
    realtimeUpdatesPerMinute: 60,
  },
  dataRetention: {
    aiConversationDays: 30,
    sessionSnapshotMax: 50,
    actionLogDays: 90,
  },
}

export interface CampaignMember {
  id: string
  campaign_id: string
  user_id: string
  role: 'player' | 'gm'
  joined_at: string
}

export interface Session {
  id: string
  campaign_id: string
  name: string
  status: 'planned' | 'active' | 'completed'
  started_at: string | null
  ended_at: string | null
  created_at: string
}
```

`packages/shared/src/types/character.ts`:
```typescript
// Stub — will be expanded in Phase 1.2 (pf2e-engine)
export interface CharacterBase {
  id: string
  owner_id: string
  campaign_id: string
  name: string
  level: number
  xp: number
  created_at: string
  updated_at: string
}
```

`packages/shared/src/constants/index.ts`:
```typescript
export const MAX_PLAYERS_PER_SESSION = 8
export const MAX_CAMPAIGNS_PER_USER = 10
export const INVITE_CODE_LENGTH = 8
```

`packages/shared/src/index.ts`:
```typescript
export type { Profile } from './types/user.js'
export type { Campaign, CampaignSettings, CampaignMember, Session } from './types/campaign.js'
export { DEFAULT_CAMPAIGN_SETTINGS } from './types/campaign.js'
export type { CharacterBase } from './types/character.js'
export { MAX_PLAYERS_PER_SESSION, MAX_CAMPAIGNS_PER_USER, INVITE_CODE_LENGTH } from './constants/index.js'
```

- [ ] **Step 5: Write a type sanity test**

`packages/shared/src/__tests__/types.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { DEFAULT_CAMPAIGN_SETTINGS, MAX_PLAYERS_PER_SESSION, INVITE_CODE_LENGTH } from '../index.js'

describe('shared constants', () => {
  it('has sensible default campaign settings', () => {
    expect(DEFAULT_CAMPAIGN_SETTINGS.rateLimits.aiCallsPerHour).toBe(50)
    expect(DEFAULT_CAMPAIGN_SETTINGS.rateLimits.modelGenerationsPerDay).toBe(5)
    expect(DEFAULT_CAMPAIGN_SETTINGS.dataRetention.aiConversationDays).toBe(30)
  })

  it('has valid player limits', () => {
    expect(MAX_PLAYERS_PER_SESSION).toBeGreaterThan(0)
    expect(MAX_PLAYERS_PER_SESSION).toBeLessThanOrEqual(12)
  })

  it('has valid invite code length', () => {
    expect(INVITE_CODE_LENGTH).toBeGreaterThanOrEqual(6)
  })
})
```

- [ ] **Step 6: Install dependencies and run test**

Run: `cd packages/shared && pnpm install`

Run: `pnpm test`
Expected: 3 tests pass

- [ ] **Step 7: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared package with core types and constants"
```

---

### Task 3: Placeholder Packages (pf2e-engine, game-runtime, scene-framework, ai-services)

**Files:**
- Create: `packages/pf2e-engine/package.json`
- Create: `packages/pf2e-engine/tsconfig.json`
- Create: `packages/pf2e-engine/vitest.config.ts`
- Create: `packages/pf2e-engine/src/index.ts`
- Create: `packages/game-runtime/package.json`
- Create: `packages/game-runtime/tsconfig.json`
- Create: `packages/game-runtime/vitest.config.ts`
- Create: `packages/game-runtime/src/index.ts`
- Create: `packages/scene-framework/package.json`
- Create: `packages/scene-framework/tsconfig.json`
- Create: `packages/scene-framework/vitest.config.ts`
- Create: `packages/scene-framework/src/index.ts`
- Create: `packages/ai-services/package.json`
- Create: `packages/ai-services/tsconfig.json`
- Create: `packages/ai-services/vitest.config.ts`
- Create: `packages/ai-services/src/index.ts`

- [ ] **Step 1: Create pf2e-engine package**

`packages/pf2e-engine/package.json`:
```json
{
  "name": "@dndmanager/pf2e-engine",
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
    "test:watch": "vitest"
  },
  "dependencies": {
    "@dndmanager/shared": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

`packages/pf2e-engine/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

`packages/pf2e-engine/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

`packages/pf2e-engine/src/index.ts`:
```typescript
// PF2e Regelwerk-Engine — expanded in Phase 1.2
export const PF2E_ENGINE_VERSION = '0.0.1'
```

- [ ] **Step 2: Create game-runtime package** (same structure)

`packages/game-runtime/package.json`:
```json
{
  "name": "@dndmanager/game-runtime",
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
    "test:watch": "vitest"
  },
  "dependencies": {
    "@dndmanager/shared": "workspace:*",
    "@dndmanager/pf2e-engine": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

`packages/game-runtime/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

`packages/game-runtime/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

`packages/game-runtime/src/index.ts`:
```typescript
// Game Runtime — expanded in Phase 1.3
export const GAME_RUNTIME_VERSION = '0.0.1'
```

- [ ] **Step 3: Create scene-framework package** (same structure)

`packages/scene-framework/package.json`:
```json
{
  "name": "@dndmanager/scene-framework",
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
    "test:watch": "vitest"
  },
  "dependencies": {
    "@dndmanager/shared": "workspace:*",
    "@dndmanager/pf2e-engine": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

`packages/scene-framework/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

`packages/scene-framework/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

`packages/scene-framework/src/index.ts`:
```typescript
// Scene Framework — expanded in Phase 1.4
export const SCENE_FRAMEWORK_VERSION = '0.0.1'
```

- [ ] **Step 4: Create ai-services package** (same structure)

`packages/ai-services/package.json`:
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
    "test:watch": "vitest"
  },
  "dependencies": {
    "@dndmanager/shared": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

`packages/ai-services/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

`packages/ai-services/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

`packages/ai-services/src/index.ts`:
```typescript
// AI Services — expanded in Phase 3
export const AI_SERVICES_VERSION = '0.0.1'
```

- [ ] **Step 5: Install all workspace dependencies**

Run: `cd /Users/asanstefanski/Private/dndmanager && pnpm install`
Expected: All workspace links resolved, no errors

- [ ] **Step 6: Verify Turborepo sees all packages**

Run: `pnpm turbo typecheck --dry`
Expected: Shows all 5 packages (shared, pf2e-engine, game-runtime, scene-framework, ai-services)

- [ ] **Step 7: Commit**

```bash
git add packages/pf2e-engine/ packages/game-runtime/ packages/scene-framework/ packages/ai-services/
git commit -m "feat: add placeholder packages for pf2e-engine, game-runtime, scene-framework, ai-services"
```

---

### Task 4: Next.js Web App Setup

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`

- [ ] **Step 1: Create apps/web/package.json**

```json
{
  "name": "@dndmanager/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@dndmanager/shared": "workspace:*",
    "@supabase/ssr": "^0.5.0",
    "@supabase/supabase-js": "^2.47.0",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create apps/web/next.config.ts**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@dndmanager/shared',
    '@dndmanager/pf2e-engine',
    '@dndmanager/game-runtime',
    '@dndmanager/scene-framework',
    '@dndmanager/ai-services',
  ],
}

export default nextConfig
```

- [ ] **Step 4: Create Tailwind CSS v4 config**

`apps/web/postcss.config.mjs`:
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

`apps/web/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // DnD Manager theme colors
        parchment: '#f4e4c1',
        ink: '#2c1810',
        gold: '#c9a84c',
        crimson: '#8b1a1a',
        forest: '#2d5a27',
        steel: '#71797E',
      },
    },
  },
  plugins: [],
}

export default config
```

`apps/web/app/globals.css`:
```css
@import 'tailwindcss';
```

- [ ] **Step 5: Create root layout**

`apps/web/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DnD Manager — Pathfinder 2e Platform',
  description: 'Hybrid tabletop/computer game platform for Pathfinder 2e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Create landing page**

`apps/web/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold tracking-tight">DnD Manager</h1>
      <p className="mt-4 text-lg text-neutral-400">
        Pathfinder 2e — Hybrid Tabletop Platform
      </p>
    </main>
  )
}
```

- [ ] **Step 7: Install and verify dev server starts**

Run: `cd /Users/asanstefanski/Private/dndmanager && pnpm install`

Run: `cd apps/web && pnpm dev`
Expected: Next.js dev server starts on http://localhost:3000, page renders with "DnD Manager" heading. Stop the server after verifying.

- [ ] **Step 8: Commit**

```bash
git add apps/web/
git commit -m "feat: add Next.js 15 web app with Tailwind CSS v4"
```

---

### Task 5: Supabase Setup & Database Schema

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/00001_initial_schema.sql`
- Create: `supabase/seed.sql`
- Create: `.env.example`

- [ ] **Step 1: Initialize Supabase CLI**

Run: `cd /Users/asanstefanski/Private/dndmanager && npx supabase@latest init --workdir .`
Expected: `supabase/` directory created (if not already) with `config.toml`

Note: If supabase CLI is not installed, install it first:
Run: `pnpm add -D supabase --workspace-root`

- [ ] **Step 2: Create the initial migration**

`supabase/migrations/00001_initial_schema.sql`:
```sql
-- ============================================================
-- DnD Manager — Initial Schema
-- Pathfinder 2e Hybrid Tabletop Platform
-- ============================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- Profiles (extends Supabase Auth)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null default 'player' check (role in ('player', 'gm')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Campaigns
-- ============================================================
create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null default '',
  gm_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(4), 'hex'),
  settings jsonb not null default '{
    "rateLimits": {
      "aiCallsPerHour": 50,
      "modelGenerationsPerDay": 5,
      "audioGenerationsPerSession": 20,
      "realtimeUpdatesPerMinute": 60
    },
    "dataRetention": {
      "aiConversationDays": 30,
      "sessionSnapshotMax": 50,
      "actionLogDays": 90
    }
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campaigns enable row level security;

create policy "Members can view their campaigns"
  on public.campaigns for select
  using (
    gm_id = auth.uid()
    or exists (
      select 1 from public.campaign_members
      where campaign_id = campaigns.id
      and user_id = auth.uid()
    )
  );

create policy "GMs can create campaigns"
  on public.campaigns for insert
  with check (gm_id = auth.uid());

create policy "GMs can update their campaigns"
  on public.campaigns for update
  using (gm_id = auth.uid());

create policy "GMs can delete their campaigns"
  on public.campaigns for delete
  using (gm_id = auth.uid());

-- ============================================================
-- Campaign Members
-- ============================================================
create table public.campaign_members (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'player' check (role in ('player', 'gm')),
  joined_at timestamptz not null default now(),
  unique(campaign_id, user_id)
);

alter table public.campaign_members enable row level security;

create policy "Members can view campaign members"
  on public.campaign_members for select
  using (
    exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = campaign_members.campaign_id
      and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaigns c
      where c.id = campaign_members.campaign_id
      and c.gm_id = auth.uid()
    )
  );

create policy "Users can join campaigns"
  on public.campaign_members for insert
  with check (user_id = auth.uid());

create policy "GMs can manage members"
  on public.campaign_members for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_members.campaign_id
      and c.gm_id = auth.uid()
    )
  );

-- ============================================================
-- Sessions
-- ============================================================
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Campaign members can view sessions"
  on public.sessions for select
  using (
    exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = sessions.campaign_id
      and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaigns c
      where c.id = sessions.campaign_id
      and c.gm_id = auth.uid()
    )
  );

create policy "GMs can manage sessions"
  on public.sessions for all
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = sessions.campaign_id
      and c.gm_id = auth.uid()
    )
  );

-- ============================================================
-- Characters (base — expanded in Phase 1.2)
-- ============================================================
create table public.characters (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  level integer not null default 1 check (level >= 1 and level <= 20),
  xp integer not null default 0 check (xp >= 0),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.characters enable row level security;

create policy "Owners have full access to their characters"
  on public.characters for all
  using (owner_id = auth.uid());

create policy "Campaign members can view characters in their campaign"
  on public.characters for select
  using (
    exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = characters.campaign_id
      and cm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaigns c
      where c.id = characters.campaign_id
      and c.gm_id = auth.uid()
    )
  );

create policy "GMs have full access to characters in their campaigns"
  on public.characters for all
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = characters.campaign_id
      and c.gm_id = auth.uid()
    )
  );

-- ============================================================
-- Updated-at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create trigger set_characters_updated_at
  before update on public.characters
  for each row execute function public.set_updated_at();

-- ============================================================
-- RPC: Join campaign by invite code
-- Needed because RLS on campaigns prevents non-members from
-- querying campaigns by invite_code. This function runs as
-- SECURITY DEFINER (bypasses RLS) to look up the campaign
-- and insert the membership in one atomic operation.
-- ============================================================
create or replace function public.join_campaign_by_invite_code(code text)
returns uuid as $$
declare
  v_campaign_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_campaign_id
  from public.campaigns
  where invite_code = code;

  if v_campaign_id is null then
    raise exception 'Campaign not found';
  end if;

  insert into public.campaign_members (campaign_id, user_id, role)
  values (v_campaign_id, v_user_id, 'player')
  on conflict (campaign_id, user_id) do nothing;

  return v_campaign_id;
end;
$$ language plpgsql security definer;
```

- [ ] **Step 3: Create empty seed file**

`supabase/seed.sql`:
```sql
-- Seed data will be added as features are built
-- PF2e Regelwerk data will be imported via AI pipeline (Phase 2)
```

- [ ] **Step 4: Create .env.example**

`.env.example`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Services (Phase 3)
# ANTHROPIC_API_KEY=
# MESHY_API_KEY=
# ELEVENLABS_API_KEY=
# SUNO_API_KEY=
```

- [ ] **Step 5: Start Supabase locally and run migration**

Run: `cd /Users/asanstefanski/Private/dndmanager && npx supabase start`
Expected: Supabase local services start (PostgreSQL, Auth, Realtime, Storage). Note the output URLs and keys.

Run: `npx supabase db reset`
Expected: Migration applied, tables created.

- [ ] **Step 6: Verify tables exist**

Run: `npx supabase db lint`
Expected: No errors

Run: `echo "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" | npx supabase db execute`
Expected: Lists `campaign_members`, `campaigns`, `characters`, `profiles`, `sessions`

- [ ] **Step 7: Commit**

```bash
git add supabase/ .env.example
git commit -m "feat: add Supabase schema with profiles, campaigns, sessions, characters + RLS"
```

---

### Task 6: Supabase Client Libraries

**Files:**
- Create: `apps/web/lib/supabase/client.ts`
- Create: `apps/web/lib/supabase/server.ts`
- Create: `apps/web/lib/supabase/middleware.ts`
- Create: `apps/web/lib/types/database.ts`

- [ ] **Step 1: Generate TypeScript types from Supabase**

Run: `cd /Users/asanstefanski/Private/dndmanager && npx supabase gen types typescript --local > apps/web/lib/types/database.ts`
Expected: File created with typed interfaces for all tables

- [ ] **Step 2: Create browser Supabase client**

`apps/web/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../types/database.js'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Create server Supabase client**

`apps/web/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '../types/database.js'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignored in Server Components (read-only)
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4: Create middleware helper**

`apps/web/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login (except for public routes)
  const publicRoutes = ['/', '/login', '/register', '/callback']
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith('/callback')
  )

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 5: Create Next.js middleware**

`apps/web/middleware.ts`:
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware.js'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 6: Verify typecheck passes**

Run: `cd /Users/asanstefanski/Private/dndmanager/apps/web && pnpm typecheck`
Expected: No TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/ apps/web/middleware.ts
git commit -m "feat: add Supabase client libraries with auth middleware"
```

---

### Task 7: Auth Pages (Login & Register)

**Files:**
- Create: `apps/web/app/(auth)/login/page.tsx`
- Create: `apps/web/app/(auth)/register/page.tsx`
- Create: `apps/web/app/(auth)/callback/route.ts`

- [ ] **Step 1: Initialize shadcn/ui**

Run: `cd /Users/asanstefanski/Private/dndmanager/apps/web && npx shadcn@latest init`
Select: New York style, Neutral base color, CSS variables

- [ ] **Step 2: Add required shadcn/ui components**

Run: `npx shadcn@latest add button input label card`
Expected: Components added to `components/ui/`

- [ ] **Step 3: Create login page**

`apps/web/app/(auth)/login/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/campaigns')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Melde dich an um deine Abenteuer fortzusetzen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Anmelden...' : 'Anmelden'}
            </Button>
            <p className="text-center text-sm text-neutral-400">
              Noch kein Konto?{' '}
              <Link href="/register" className="underline hover:text-neutral-100">
                Registrieren
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 4: Create register page**

`apps/web/app/(auth)/register/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/campaigns')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Registrieren</CardTitle>
          <CardDescription>Erstelle ein Konto um dein Abenteuer zu beginnen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Anzeigename</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Registrieren...' : 'Konto erstellen'}
            </Button>
            <p className="text-center text-sm text-neutral-400">
              Bereits ein Konto?{' '}
              <Link href="/login" className="underline hover:text-neutral-100">
                Anmelden
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 5: Create auth callback route**

`apps/web/app/(auth)/callback/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/campaigns'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

- [ ] **Step 6: Verify build passes**

Run: `cd /Users/asanstefanski/Private/dndmanager/apps/web && pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/
git commit -m "feat: add auth pages (login, register, callback) with shadcn/ui"
```

---

### Task 8: Campaign List Page (Lobby)

**Files:**
- Create: `apps/web/app/(lobby)/campaigns/page.tsx`
- Create: `apps/web/app/(lobby)/campaigns/new/page.tsx`
- Create: `apps/web/app/(lobby)/campaigns/join/page.tsx`

- [ ] **Step 1: Create campaigns list page**

`apps/web/app/(lobby)/campaigns/page.tsx`:
```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Campaigns where user is GM
  const { data: gmCampaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('gm_id', user.id)
    .order('created_at', { ascending: false })

  // Campaigns where user is member
  const { data: memberships } = await supabase
    .from('campaign_members')
    .select('campaign_id, campaigns(*)')
    .eq('user_id', user.id)

  const playerCampaigns = memberships
    ?.map((m) => m.campaigns)
    .filter(Boolean) ?? []

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Kampagnen</h1>
        <div className="flex gap-2">
          <Link href="/campaigns/join">
            <Button variant="outline">Beitreten</Button>
          </Link>
          <Link href="/campaigns/new">
            <Button>Neue Kampagne</Button>
          </Link>
        </div>
      </div>

      {gmCampaigns && gmCampaigns.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Deine Kampagnen (GM)</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {gmCampaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <CardTitle>{campaign.name}</CardTitle>
                  <CardDescription>{campaign.description || 'Keine Beschreibung'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-400">
                    Einladungscode: <code className="rounded bg-neutral-800 px-2 py-1">{campaign.invite_code}</code>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {playerCampaigns.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Beigetretene Kampagnen</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {playerCampaigns.map((campaign: any) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <CardTitle>{campaign.name}</CardTitle>
                  <CardDescription>{campaign.description || 'Keine Beschreibung'}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      )}

      {(!gmCampaigns || gmCampaigns.length === 0) && playerCampaigns.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-lg text-neutral-400">
            Noch keine Kampagnen. Erstelle eine neue oder tritt einer bei.
          </p>
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Create new campaign page**

`apps/web/app/(lobby)/campaigns/new/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewCampaignPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleCreate(e: React.FormEvent) {
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
      .from('campaigns')
      .insert({ name, description, gm_id: user.id })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/campaigns')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Neue Kampagne</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fluch der Schattenfestung"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Eine epische Kampagne fuer Level 1-10..."
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Erstellen...' : 'Kampagne erstellen'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 3: Create join campaign page**

`apps/web/app/(lobby)/campaigns/join/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function JoinCampaignPage() {
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Nicht angemeldet')
      setLoading(false)
      return
    }

    // Join via RPC function (bypasses RLS to look up invite code)
    const { error: joinError } = await supabase
      .rpc('join_campaign_by_invite_code', { code: inviteCode.trim() })

    if (joinError) {
      if (joinError.message.includes('Campaign not found')) {
        setError('Kampagne nicht gefunden. Pruefe den Einladungscode.')
      } else {
        setError(joinError.message)
      }
      setLoading(false)
      return
    }

    router.push('/campaigns')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Kampagne beitreten</CardTitle>
          <CardDescription>Gib den Einladungscode deines GMs ein</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Einladungscode</Label>
              <Input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="a1b2c3d4"
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Beitreten...' : 'Beitreten'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 4: Verify build passes**

Run: `cd /Users/asanstefanski/Private/dndmanager/apps/web && pnpm build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/
git commit -m "feat: add campaign pages (list, create, join with invite code)"
```

---

### Task 9: CLAUDE.md Files

**Files:**
- Create: `CLAUDE.md`
- Create: `scenarios/CLAUDE.md`
- Create: `scenarios/_template/index.ts`

- [ ] **Step 1: Create root CLAUDE.md**

`CLAUDE.md`:
```markdown
# DnD Manager — Claude Code Conventions

## Project Overview
Hybrid tabletop/computer game platform for Pathfinder 2e. Monorepo with pnpm + Turborepo.

## Tech Stack
- **Frontend:** Next.js 15 (App Router), React Three Fiber, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Realtime, Auth, Storage, Edge Functions)
- **State:** Zustand
- **Testing:** Vitest, Playwright
- **Language:** TypeScript strict throughout

## Monorepo Structure
- `apps/web/` — Next.js frontend
- `packages/pf2e-engine/` — Pathfinder 2e rules engine (pure TS, no UI)
- `packages/game-runtime/` — Game state, turns, fog of war, sync
- `packages/scene-framework/` — Scenario DSL for GM content creation
- `packages/ai-services/` — AI orchestration (Claude, 3D gen, audio)
- `packages/shared/` — Shared types, constants, utilities
- `scenarios/` — GM-created scenarios (Claude Code workspace)
- `supabase/` — Database migrations and config

## Commands
- `pnpm dev` — Start all dev servers
- `pnpm build` — Build all packages
- `pnpm test` — Run all tests
- `pnpm typecheck` — Type check all packages
- `pnpm format` — Format all files

## Rules
- All code must be TypeScript strict
- No `any` types — use `unknown` + type guards when needed
- Prefer named exports over default exports (except Next.js pages)
- Test files go next to source files as `__tests__/` directories
- Database changes require a new migration in `supabase/migrations/`
- PF2e rules must be validated through `@dndmanager/pf2e-engine`
- All game state changes must go through Supabase Realtime
- Server-side dice rolls only (never trust the client)
```

- [ ] **Step 2: Create scenarios CLAUDE.md**

`scenarios/CLAUDE.md`:
```markdown
# Scenario Development with Claude Code

## Overview
Scenarios are TypeScript files using the `@dndmanager/scene-framework` DSL.
Each scenario is a self-contained folder under `scenarios/`.

## Creating a New Scenario
1. Copy `_template/` to a new folder: `scenarios/my-scenario/`
2. Edit `index.ts` with your scenario definition
3. Run `pnpm scenario:validate my-scenario` to check for errors
4. Run `pnpm scenario:preview my-scenario` for local preview

## DSL API
Import from `@dndmanager/scene-framework`:
- `scenario()` — Root scenario definition
- `map()` — Define a map with tiles and dimensions
- `room()` — Define a room within a map
- `encounter()` — Define a combat encounter
- `npc()` — Define an NPC with personality and knowledge
- `trigger()` — Define an event trigger
- `loot()` — Define loot tables

## Rules
- All monster references MUST use `pf2e:` prefix (e.g., `pf2e:skeleton-guard`)
- Encounter difficulty must match PF2e encounter budget for the specified level
- Every room needs `lighting` and `terrain` properties
- NPCs need `personality`, `knowledge`, and `dialogue_style`
- Trigger chains must be acyclic (no circular triggers)
- Use descriptive IDs (e.g., `entrance-hall`, not `room1`)

## Position Strategies
- `"spread"` — Distribute evenly across the room
- `"clustered"` — Group together in the center
- `"flanking-<npc-id>"` — Position to flank the specified NPC/monster
- `"guarding-<feature>"` — Position near a map feature
- `[x, y]` — Exact grid coordinates

## File Structure
```
scenarios/my-scenario/
├── index.ts          — Main scenario definition
├── README.md         — Description for players (spoiler-free)
└── notes.md          — GM notes (optional)
```
```

- [ ] **Step 3: Create scenario template**

`scenarios/_template/index.ts`:
```typescript
import { scenario, map, room, encounter, npc, trigger, loot } from '@dndmanager/scene-framework'

export default scenario({
  name: "Szenario-Name",
  level: { min: 1, max: 3 },
  description: "Kurze Beschreibung des Szenarios.",

  maps: [
    map("main-map", {
      tiles: "dungeon-stone",
      size: [15, 10],
      rooms: [
        room("starting-room", {
          position: [0, 0],
          size: [6, 6],
          lighting: "bright",
          terrain: [],
        }),
      ],
      connections: [],
    }),
  ],

  npcs: [],

  encounters: [],

  triggers: [],

  loot: [],
})
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md scenarios/
git commit -m "feat: add CLAUDE.md conventions and scenario template"
```

---

### Task 10: Verify Full Monorepo Build

- [ ] **Step 1: Clean install from scratch**

Run: `cd /Users/asanstefanski/Private/dndmanager && rm -rf node_modules apps/web/node_modules packages/*/node_modules && pnpm install`
Expected: All dependencies install cleanly

- [ ] **Step 2: Run typecheck across all packages**

Run: `pnpm typecheck`
Expected: All packages pass type checking

- [ ] **Step 3: Run all tests**

Run: `pnpm test`
Expected: shared package tests pass (3 tests), other packages have no tests yet (0 tests, not failures)

- [ ] **Step 4: Build the web app**

Run: `pnpm build`
Expected: Next.js build succeeds

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify full monorepo build passes"
```

Note: Only commit if there are changes (e.g., lockfile updates). If `git status` shows clean, skip this step.
