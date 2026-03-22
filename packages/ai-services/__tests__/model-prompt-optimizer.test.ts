import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('model-prompt-optimizer', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('buildModelUserPrompt includes character details', async () => {
    const { buildModelUserPrompt } = await import('../src/prompts/model-generation')
    const prompt = buildModelUserPrompt({
      characterName: 'Thorin Ironfist',
      characterDescription: 'A stout dwarf with a braided red beard and heavy plate armor',
      ancestry: 'Dwarf',
      className: 'Champion',
    })

    expect(prompt).toContain('Thorin Ironfist')
    expect(prompt).toContain('Dwarf')
    expect(prompt).toContain('Champion')
    expect(prompt).toContain('braided red beard')
  })

  it('optimizeModelPrompt returns structured prompt', async () => {
    // Mock the Anthropic client
    vi.doMock('../src/client', () => ({
      getAnthropicClient: () => ({
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  prompt: 'fantasy dwarf warrior, heavy plate armor, braided red beard, battle stance, medieval fantasy RPG character, full body, high detail',
                  negativePrompt: 'blurry, low quality, modern clothing, guns, text, watermark',
                  artStyle: 'realistic',
                }),
              },
            ],
          }),
        },
      }),
    }))

    const { optimizeModelPrompt } = await import('../src/services/model-prompt-optimizer')
    const result = await optimizeModelPrompt({
      characterName: 'Thorin',
      characterDescription: 'A dwarf champion with plate armor',
      ancestry: 'Dwarf',
      className: 'Champion',
    })

    expect(result.prompt).toContain('dwarf')
    expect(result.negativePrompt).toBeTruthy()
    expect(result.artStyle).toBe('realistic')
  })
})
