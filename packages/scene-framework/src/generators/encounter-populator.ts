import type { EncounterDef, EncounterDifficulty, EncounterPhase, MonsterPlacement } from '../types.js'
import type { GeneratedRoom } from './types.js'
import type { Rng } from './rng.js'

/**
 * PF2e encounter budget XP by difficulty (for a party of 4).
 * Scales linearly with party size delta.
 */
const BUDGET_XP: Record<EncounterDifficulty, number> = {
  trivial: 40,
  low: 60,
  moderate: 80,
  severe: 120,
  extreme: 160,
}

/**
 * Monster XP by level relative to party level.
 * Key = (monster_level - party_level), Value = XP.
 */
const MONSTER_XP_BY_DELTA: Record<string, number> = {
  '-4': 10, '-3': 15, '-2': 20, '-1': 30,
  '0': 40, '1': 60, '2': 80, '3': 120, '4': 160,
}

/** Placeholder monster types by relative level */
const MONSTER_TYPES_BY_DELTA: Record<number, string[]> = {
  '-2': ['pf2e:skeleton-guard', 'pf2e:goblin-warrior', 'pf2e:giant-rat'],
  '-1': ['pf2e:zombie-shambler', 'pf2e:kobold-scout', 'pf2e:orc-warrior'],
  '0': ['pf2e:bugbear-thug', 'pf2e:hobgoblin-soldier', 'pf2e:warg'],
  '1': ['pf2e:ogre', 'pf2e:troll', 'pf2e:manticore'],
  '2': ['pf2e:young-dragon', 'pf2e:hill-giant', 'pf2e:chimera'],
}

export function populateEncounters(
  rooms: GeneratedRoom[],
  partyLevel: number,
  partySize: number,
  baseDifficulty: EncounterDifficulty,
  rng: Rng,
): EncounterDef[] {
  const encounters: EncounterDef[] = []
  const sizeFactor = partySize / 4 // scale budget for non-standard party sizes

  for (const room of rooms) {
    if (room.isEntrance) continue

    const difficulty = room.isBoss
      ? (baseDifficulty === 'extreme' ? 'extreme' : 'severe')
      : rng.pick(getDifficultyRange(baseDifficulty))

    const budget = Math.round(BUDGET_XP[difficulty] * sizeFactor)
    const monsters = fillMonsterBudget(budget, partyLevel, room.isBoss ?? false, rng)

    const enc: EncounterDef = {
      id: `enc-${room.id}`,
      room: room.id,
      trigger: room.isBoss ? 'manual' : 'on_enter',
      monsters,
      difficulty,
    }

    if (room.isBoss) {
      enc.tactics = 'Boss uses area attacks first, then focuses weakest target'
      enc.phases = generateBossPhases(rng)
    }

    encounters.push(enc)
  }

  return encounters
}

function getDifficultyRange(base: EncounterDifficulty): EncounterDifficulty[] {
  const all: EncounterDifficulty[] = ['trivial', 'low', 'moderate', 'severe', 'extreme']
  const idx = all.indexOf(base)
  const min = Math.max(0, idx - 1)
  const max = idx
  return all.slice(min, max + 1)
}

function fillMonsterBudget(
  budget: number,
  partyLevel: number,
  isBoss: boolean,
  rng: Rng,
): MonsterPlacement[] {
  const placements: MonsterPlacement[] = []
  let remaining = budget

  if (isBoss) {
    // Place one strong monster first
    const bossXp = MONSTER_XP_BY_DELTA['2'] ?? 80
    const bossTypes = MONSTER_TYPES_BY_DELTA[2] ?? ['pf2e:young-dragon']
    placements.push({ type: rng.pick(bossTypes), count: 1, positions: 'center' })
    remaining -= bossXp
  }

  // Fill remaining budget with weaker monsters
  const deltas = isBoss ? [-2, -1] : [-1, 0, -2]
  while (remaining > 0) {
    const delta = rng.pick(deltas)
    const xp = MONSTER_XP_BY_DELTA[String(delta)] ?? 20
    if (xp > remaining) break

    const types = MONSTER_TYPES_BY_DELTA[delta] ?? ['pf2e:skeleton-guard']
    const maxCount = Math.min(4, Math.floor(remaining / xp))
    if (maxCount < 1) break

    const count = rng.intRange(1, maxCount)
    placements.push({ type: rng.pick(types), count, positions: 'spread' })
    remaining -= xp * count
  }

  return placements
}

function generateBossPhases(rng: Rng): EncounterPhase[] {
  const phaseTemplates: EncounterPhase[] = [
    { hp_threshold: 0.75, action: 'enrage', description: 'The boss enters a fury, gaining +2 to attack rolls' },
    { hp_threshold: 0.5, action: 'call-reinforcements', description: 'The boss calls for reinforcements' },
    { hp_threshold: 0.25, action: 'desperate', description: 'The boss fights desperately, using its most powerful abilities' },
  ]

  // Include 2-3 phases randomly
  const count = rng.intRange(2, 3)
  return rng.shuffle([...phaseTemplates]).slice(0, count).sort((a, b) => b.hp_threshold - a.hp_threshold)
}
