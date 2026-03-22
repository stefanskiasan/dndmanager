import { describe, it, expect } from 'vitest'
import { buildGameContextBlock, COGM_SYSTEM_PROMPT } from '../../src/cogm/co-gm-prompts'
import type { GameContextSnapshot } from '../../src/types'

describe('Co-GM prompts', () => {
  it('system prompt includes PF2e rules reference', () => {
    expect(COGM_SYSTEM_PROMPT).toContain('Multiple Attack Penalty')
    expect(COGM_SYSTEM_PROMPT).toContain('Encounter Budget')
    expect(COGM_SYSTEM_PROMPT).toContain('Grapple')
  })

  it('builds game context block with tokens', () => {
    const ctx: GameContextSnapshot = {
      sessionId: 'test-session',
      mode: 'encounter',
      round: 3,
      tokens: [
        {
          id: 'thorin',
          name: 'Thorin',
          type: 'player',
          hp: { current: 30, max: 45 },
          ac: 18,
          conditions: ['frightened'],
        },
      ],
      currentTurnTokenId: 'thorin',
      recentEvents: ['Round 3 started', 'Thorin moved to (4, 5)'],
    }

    const block = buildGameContextBlock(ctx)
    expect(block).toContain('Mode: encounter')
    expect(block).toContain('Round: 3')
    expect(block).toContain('Thorin (player)')
    expect(block).toContain('HP 30/45')
    expect(block).toContain('[frightened]')
    expect(block).toContain('Current Turn: thorin')
    expect(block).toContain('Round 3 started')
  })

  it('handles empty tokens and events', () => {
    const ctx: GameContextSnapshot = {
      sessionId: 'test-session',
      mode: 'exploration',
      round: 0,
      tokens: [],
      recentEvents: [],
    }

    const block = buildGameContextBlock(ctx)
    expect(block).toContain('Mode: exploration')
    expect(block).not.toContain('TOKENS ON MAP')
    expect(block).not.toContain('RECENT EVENTS')
  })
})
