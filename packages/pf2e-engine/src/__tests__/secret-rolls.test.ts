import { describe, it, expect } from 'vitest'
import { isSecretRoll, createSecretRollResult, createPlayerView } from '../secret-rolls.js'

describe('isSecretRoll', () => {
  it('returns true for Recall Knowledge', () => {
    expect(isSecretRoll('recall_knowledge')).toBe(true)
  })

  it('returns true for Sense Motive', () => {
    expect(isSecretRoll('sense_motive')).toBe(true)
  })

  it('returns true for perception trap detection', () => {
    expect(isSecretRoll('perception_trap')).toBe(true)
  })

  it('returns false for Trip', () => {
    expect(isSecretRoll('trip')).toBe(false)
  })

  it('returns false for strike', () => {
    expect(isSecretRoll('strike')).toBe(false)
  })
})

describe('createSecretRollResult', () => {
  it('includes full result for GM', () => {
    const result = createSecretRollResult({
      actionId: 'recall_knowledge',
      naturalRoll: 15,
      modifier: 8,
      dc: 20,
      degree: 'success',
      effects: ['learn one piece of information'],
    })
    expect(result.gmView.naturalRoll).toBe(15)
    expect(result.gmView.degree).toBe('success')
    expect(result.gmView.effects).toHaveLength(1)
  })

  it('hides details from player', () => {
    const result = createSecretRollResult({
      actionId: 'recall_knowledge',
      naturalRoll: 3,
      modifier: 8,
      dc: 20,
      degree: 'failure',
      effects: ['no information learned'],
    })
    expect(result.playerView.message).toBe('Du versuchst dich zu erinnern...')
    expect(result.playerView).not.toHaveProperty('naturalRoll')
    expect(result.playerView).not.toHaveProperty('degree')
  })
})

describe('createPlayerView', () => {
  it('returns generic message for secret actions', () => {
    const view = createPlayerView('recall_knowledge')
    expect(view.message).toBeTruthy()
  })

  it('returns specific message for sense_motive', () => {
    const view = createPlayerView('sense_motive')
    expect(view.message).toBeTruthy()
  })
})
