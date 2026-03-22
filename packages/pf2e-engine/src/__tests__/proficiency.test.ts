import { describe, it, expect } from 'vitest'
import { proficiencyBonus, proficiencyRankValue, nextProficiencyRank } from '../proficiency.js'

describe('proficiencyRankValue', () => {
  it('returns 0 for untrained', () => {
    expect(proficiencyRankValue('untrained')).toBe(0)
  })

  it('returns 2 for trained', () => {
    expect(proficiencyRankValue('trained')).toBe(2)
  })

  it('returns 4 for expert', () => {
    expect(proficiencyRankValue('expert')).toBe(4)
  })

  it('returns 6 for master', () => {
    expect(proficiencyRankValue('master')).toBe(6)
  })

  it('returns 8 for legendary', () => {
    expect(proficiencyRankValue('legendary')).toBe(8)
  })
})

describe('proficiencyBonus', () => {
  it('returns 0 for untrained at any level', () => {
    expect(proficiencyBonus('untrained', 5)).toBe(0)
  })

  it('returns level + rank for trained', () => {
    expect(proficiencyBonus('trained', 1)).toBe(3)   // 1 + 2
    expect(proficiencyBonus('trained', 5)).toBe(7)   // 5 + 2
    expect(proficiencyBonus('trained', 10)).toBe(12)  // 10 + 2
  })

  it('returns level + rank for expert', () => {
    expect(proficiencyBonus('expert', 5)).toBe(9)    // 5 + 4
  })

  it('returns level + rank for master', () => {
    expect(proficiencyBonus('master', 10)).toBe(16)  // 10 + 6
  })

  it('returns level + rank for legendary', () => {
    expect(proficiencyBonus('legendary', 20)).toBe(28) // 20 + 8
  })
})

describe('nextProficiencyRank', () => {
  it('untrained -> trained', () => {
    expect(nextProficiencyRank('untrained')).toBe('trained')
  })

  it('trained -> expert', () => {
    expect(nextProficiencyRank('trained')).toBe('expert')
  })

  it('expert -> master', () => {
    expect(nextProficiencyRank('expert')).toBe('master')
  })

  it('master -> legendary', () => {
    expect(nextProficiencyRank('master')).toBe('legendary')
  })

  it('legendary -> null (max rank)', () => {
    expect(nextProficiencyRank('legendary')).toBeNull()
  })
})
