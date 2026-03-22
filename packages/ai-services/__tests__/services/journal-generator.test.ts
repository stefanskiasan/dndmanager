import { describe, it, expect, vi } from 'vitest'
import { generateSessionJournal } from '../../src/journal/journal-generator'
import type { JournalGenerateRequest } from '../../src/types'

vi.mock('../../src/client', () => ({
  getAnthropicClient: () => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: 'The Battle of Thornwood',
              narrative: 'The party ventured into the dark forest...\n\nThorin led the charge against the goblins.',
              highlights: [
                'Thorin landed a critical hit on the goblin chief',
                'Elara saved the party with a timely heal',
              ],
              combatSummary: 'The party fought 4 goblins and their chief. Thorin dealt the killing blow.',
            }),
          },
        ],
      }),
    },
  }),
}))

describe('generateSessionJournal', () => {
  const baseRequest: JournalGenerateRequest = {
    sessionId: 'session-1',
    campaignId: 'campaign-1',
    sessionName: 'The Goblin Ambush',
    actionLog: [
      { eventType: 'encounter_start', data: {}, createdAt: '2026-03-22T19:00:00Z' },
      {
        eventType: 'damage_dealt',
        data: { source: 'Thorin', target: 'Goblin', damage: 12 },
        createdAt: '2026-03-22T19:01:00Z',
      },
    ],
    partyMembers: ['Thorin', 'Elara'],
  }

  it('generates a structured journal', async () => {
    const result = await generateSessionJournal(baseRequest)
    expect(result.title).toBe('The Battle of Thornwood')
    expect(result.narrative).toContain('dark forest')
    expect(result.highlights).toHaveLength(2)
    expect(result.combatSummary).toContain('goblin chief')
    expect(result.sessionId).toBe('session-1')
    expect(result.campaignId).toBe('campaign-1')
  })
})
