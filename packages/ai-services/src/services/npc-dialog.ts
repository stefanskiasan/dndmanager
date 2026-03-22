import { getAnthropicClient } from '../client'
import {
  buildNpcSystemPrompt,
  buildConversationMessages,
  buildGmContextInjection,
} from '../prompts/npc-dialog'
import type { NpcDialogProfile, NpcMessage } from '../types'

const MODEL = 'claude-opus-4-20250514'
const MAX_TOKENS = 512

export interface GenerateNpcResponseParams {
  npc: NpcDialogProfile
  conversationHistory: NpcMessage[]
  playerMessage: string
  /** Optional GM hint to steer the response */
  gmHint?: string
}

export interface GenerateNpcResponseResult {
  npcResponse: string
  inputTokens: number
  outputTokens: number
}

/**
 * Generates an NPC dialog response using Claude.
 * The response is NOT shown to the player — it goes to the GM for approval first.
 */
export async function generateNpcResponse(
  params: GenerateNpcResponseParams
): Promise<GenerateNpcResponseResult> {
  const client = getAnthropicClient()
  const systemPrompt = buildNpcSystemPrompt(params.npc)

  // Build message history from approved messages
  const history = buildConversationMessages(params.conversationHistory)

  // Add the new player message
  const messages = [
    ...history,
    { role: 'user' as const, content: params.playerMessage },
  ]

  // If GM provided a hint, prepend it as a system-level injection
  // by appending to the system prompt
  let fullSystemPrompt = systemPrompt
  if (params.gmHint) {
    fullSystemPrompt += '\n\n' + buildGmContextInjection(params.gmHint)
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: fullSystemPrompt,
    messages,
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude for NPC dialog')
  }

  return {
    npcResponse: textBlock.text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}
