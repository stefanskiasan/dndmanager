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
