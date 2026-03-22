import { getAnthropicClient } from '../client'
import {
  MODEL_GENERATION_SYSTEM_PROMPT,
  buildModelUserPrompt,
} from '../prompts/model-generation'
import type { OptimizedModelPrompt } from '../types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 512

/**
 * Uses Claude to optimize a character description into a Meshy-friendly prompt.
 */
export async function optimizeModelPrompt(input: {
  characterName: string
  characterDescription: string
  ancestry?: string
  className?: string
  artStyle?: string
}): Promise<OptimizedModelPrompt> {
  const client = getAnthropicClient()

  const userPrompt = buildModelUserPrompt(input)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: MODEL_GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let result: OptimizedModelPrompt
  try {
    result = JSON.parse(textBlock.text) as OptimizedModelPrompt
  } catch {
    throw new Error(
      `Failed to parse Claude response as JSON: ${textBlock.text.slice(0, 200)}`
    )
  }

  // Validate required fields
  if (!result.prompt || typeof result.prompt !== 'string') {
    throw new Error('Invalid optimized prompt: missing "prompt" field')
  }

  // Apply defaults
  result.negativePrompt ??= 'blurry, low quality, text, watermark'
  result.artStyle ??= 'realistic'

  return result
}
