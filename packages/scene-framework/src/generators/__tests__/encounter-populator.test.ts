import { describe, it, expect } from 'vitest'
import { populateEncounters } from '../encounter-populator.js'
import { createRng } from '../rng.js'
import type { GeneratedRoom } from '../types.js'
import type { EncounterDifficulty } from '../../types.js'

describe('populateEncounters', () => {
  const rooms: GeneratedRoom[] = [
    { id: 'room-0', x: 0, y: 0, width: 5, height: 5, lighting: 'bright', isEntrance: true },
    { id: 'room-1', x: 10, y: 0, width: 5, height: 5, lighting: 'dim' },
    { id: 'room-2', x: 20, y: 0, width: 5, height: 5, lighting: 'dim', isBoss: true },
  ]

  it('creates an encounter for each non-entrance room', () => {
    const encounters = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    // Entrance room typically has no encounter; non-entrance rooms do
    const encounterRoomIds = encounters.map((e) => e.room)
    expect(encounterRoomIds).not.toContain('room-0')
    expect(encounters.length).toBeGreaterThanOrEqual(rooms.length - 1)
  })

  it('assigns boss encounter difficulty to boss room', () => {
    const encounters = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    const bossEnc = encounters.find((e) => e.room === 'room-2')
    expect(bossEnc).toBeDefined()
    expect(['severe', 'extreme']).toContain(bossEnc!.difficulty)
  })

  it('assigns appropriate difficulty to non-boss rooms', () => {
    const encounters = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    const nonBoss = encounters.filter((e) => e.room !== 'room-2')
    for (const enc of nonBoss) {
      expect(['trivial', 'low', 'moderate']).toContain(enc.difficulty)
    }
  })

  it('populates monsters with pf2e: prefix', () => {
    const encounters = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    for (const enc of encounters) {
      for (const m of enc.monsters) {
        expect(m.type.startsWith('pf2e:')).toBe(true)
      }
    }
  })

  it('boss encounter has phases', () => {
    const encounters = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    const bossEnc = encounters.find((e) => e.room === 'room-2')
    expect(bossEnc?.phases).toBeDefined()
    expect(bossEnc!.phases!.length).toBeGreaterThan(0)
  })

  it('is deterministic', () => {
    const a = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    const b = populateEncounters(rooms, 3, 4, 'moderate', createRng(42))
    expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id))
  })
})
