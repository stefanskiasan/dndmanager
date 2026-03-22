import { getAnthropicClient } from '../client'
import { COGM_SYSTEM_PROMPT, buildGameContextBlock } from './co-gm-prompts'
import type { CoGMRequest, CoGMMessage } from '../types'

const MODEL = 'claude-opus-4-6'
const MAX_TOKENS = 1024

/**
 * Sends a Co-GM message and returns a streaming response.
 * The caller should iterate over the stream to get text deltas.
 */
export async function streamCoGMResponse(request: CoGMRequest) {
  const client = getAnthropicClient()

  const gameContext = buildGameContextBlock(request.gameContext)
  const systemPrompt = COGM_SYSTEM_PROMPT + gameContext

  // Build conversation messages
  const messages: { role: 'user' | 'assistant'; content: string }[] = []

  for (const msg of request.conversationHistory) {
    messages.push({ role: msg.role, content: msg.content })
  }

  // Add the new user message
  messages.push({ role: 'user', content: request.message })

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  })

  return stream
}

/**
 * Non-streaming variant for testing or simpler use cases.
 */
export async function askCoGM(request: CoGMRequest): Promise<string> {
  const client = getAnthropicClient()

  const gameContext = buildGameContextBlock(request.gameContext)
  const systemPrompt = COGM_SYSTEM_PROMPT + gameContext

  const messages: { role: 'user' | 'assistant'; content: string }[] = []

  for (const msg of request.conversationHistory) {
    messages.push({ role: msg.role, content: msg.content })
  }

  messages.push({ role: 'user', content: request.message })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  return textBlock.text
}
