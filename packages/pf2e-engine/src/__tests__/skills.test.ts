import { describe, it, expect } from 'vitest'
import { resolveSkillAction, SKILL_ACTIONS, getSkillActionInfo } from '../skills.js'

describe('SKILL_ACTIONS', () => {
  it('has Trip defined', () => {
    expect(SKILL_ACTIONS.trip).toBeDefined()
    expect(SKILL_ACTIONS.trip.skill).toBe('athletics')
    expect(SKILL_ACTIONS.trip.actions).toBe(1)
  })

  it('has Grapple defined', () => {
    expect(SKILL_ACTIONS.grapple).toBeDefined()
    expect(SKILL_ACTIONS.grapple.skill).toBe('athletics')
  })

  it('has Demoralize defined', () => {
    expect(SKILL_ACTIONS.demoralize).toBeDefined()
    expect(SKILL_ACTIONS.demoralize.skill).toBe('intimidation')
  })

  it('has Recall Knowledge defined', () => {
    expect(SKILL_ACTIONS.recall_knowledge).toBeDefined()
    expect(SKILL_ACTIONS.recall_knowledge.secret).toBe(true)
  })
})

describe('getSkillActionInfo', () => {
  it('returns action info', () => {
    const info = getSkillActionInfo('trip')
    expect(info).not.toBeNull()
    expect(info!.name).toBe('Trip')
  })

  it('returns null for unknown action', () => {
    expect(getSkillActionInfo('nonexistent')).toBeNull()
  })
})

describe('resolveSkillAction', () => {
  it('resolves Trip with critical success', () => {
    const result = resolveSkillAction('trip', {
      naturalRoll: 20,
      skillBonus: 10,
      dc: 18,
    })
    expect(result.degree).toBe('critical-success')
    expect(result.effects).toContain('target falls prone')
    expect(result.effects).toContain('target takes 1d6 bludgeoning damage')
  })

  it('resolves Trip with success', () => {
    const result = resolveSkillAction('trip', {
      naturalRoll: 12,
      skillBonus: 10,
      dc: 18,
    })
    expect(result.degree).toBe('success')
    expect(result.effects).toContain('target falls prone')
  })

  it('resolves Trip with critical failure (you fall prone)', () => {
    const result = resolveSkillAction('trip', {
      naturalRoll: 1,
      skillBonus: 5,
      dc: 18,
    })
    expect(result.degree).toBe('critical-failure')
    expect(result.effects).toContain('you fall prone')
  })

  it('resolves Demoralize with success', () => {
    const result = resolveSkillAction('demoralize', {
      naturalRoll: 15,
      skillBonus: 8,
      dc: 18,
    })
    expect(result.degree).toBe('success')
    expect(result.effects).toContain('target is frightened 1')
  })

  it('resolves Demoralize with critical success', () => {
    const result = resolveSkillAction('demoralize', {
      naturalRoll: 18,
      skillBonus: 12,
      dc: 18,
    })
    expect(result.degree).toBe('critical-success')
    expect(result.effects).toContain('target is frightened 2')
  })

  it('resolves Grapple with success', () => {
    const result = resolveSkillAction('grapple', {
      naturalRoll: 12,
      skillBonus: 10,
      dc: 18,
    })
    expect(result.degree).toBe('success')
    expect(result.effects).toContain('target is grabbed')
  })

  it('resolves Recall Knowledge as secret', () => {
    const result = resolveSkillAction('recall_knowledge', {
      naturalRoll: 15,
      skillBonus: 8,
      dc: 15,
    })
    expect(result.secret).toBe(true)
  })
})
