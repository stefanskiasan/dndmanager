import { describe, it, expect, vi, beforeEach } from 'vitest'
import { askCoGM } from '../../src/cogm/co-gm-service'
import type { CoGMRequest } from '../../src/types'

// Mock the client
vi.mock('../../src/client', () => ({
  getAnthropicClient: () => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Grapple uses Athletics vs Fortitude DC. On a success, the target gains the Grabbed condition.',
          },
        ],
      }),
      stream: vi.fn(),
    },
  }),
}))

describe('askCoGM', () => {
  const baseRequest: CoGMRequest = {
    message: 'How does Grapple work?',
    conversationHistory: [],
    gameContext: {
      sessionId: 'test-session',
      mode: 'encounter',
      round: 1,
      tokens: [],
      recentEvents: [],
    },
  }

  it('returns a text response', async () => {
    const result = await askCoGM(baseRequest)
    expect(result).toContain('Grapple')
    expect(result).toContain('Athletics')
  })
})
