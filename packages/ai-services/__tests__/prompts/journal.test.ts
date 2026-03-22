import { describe, it, expect } from 'vitest'
import { buildJournalPrompt, JOURNAL_SYSTEM_PROMPT } from '../../src/journal/journal-prompts'

describe('Journal prompts', () => {
  it('system prompt requires JSON output', () => {
    expect(JOURNAL_SYSTEM_PROMPT).toContain('valid JSON')
    expect(JOURNAL_SYSTEM_PROMPT).toContain('title')
    expect(JOURNAL_SYSTEM_PROMPT).toContain('narrative')
    expect(JOURNAL_SYSTEM_PROMPT).toContain('highlights')
  })

  it('builds journal prompt with action log', () => {
    const prompt = buildJournalPrompt(
      'The Goblin Ambush',
      ['Thorin', 'Elara'],
      [
        {
          eventType: 'encounter_start',
          data: {},
          createdAt: '2026-03-22T19:00:00Z',
        },
        {
          eventType: 'damage_dealt',
          data: { source: 'Thorin', target: 'Goblin', damage: 12 },
          createdAt: '2026-03-22T19:01:00Z',
        },
      ]
    )

    expect(prompt).toContain('The Goblin Ambush')
    expect(prompt).toContain('Thorin, Elara')
    expect(prompt).toContain('encounter_start')
    expect(prompt).toContain('damage_dealt')
  })

  it('includes campaign setting when provided', () => {
    const prompt = buildJournalPrompt(
      'Session 1',
      ['Thorin'],
      [],
      'Lost Omens: Absalom'
    )

    expect(prompt).toContain('Setting: Lost Omens: Absalom')
  })
})
