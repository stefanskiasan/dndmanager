import { getAnthropicClient } from '../client'
import {
  CHARACTER_CREATION_SYSTEM_PROMPT,
  buildUserPrompt,
} from '../prompts/character-creation'
import type {
  CharacterSuggestion,
  CharacterSuggestionRequest,
} from '../types'

const MODEL = 'claude-opus-4-6'
const MAX_TOKENS = 2048

/**
 * Calls Claude to generate PF2e character suggestions based on a
 * natural-language concept description.
 */
export async function suggestCharacter(
  request: CharacterSuggestionRequest
): Promise<CharacterSuggestion> {
  const client = getAnthropicClient()

  const userPrompt = buildUserPrompt(
    request.concept,
    request.level,
    request.campaignSetting
  )

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: CHARACTER_CREATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  // Extract text from the response
  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Strip markdown code fences if present, then parse JSON
  let jsonText = textBlock.text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  let suggestion: CharacterSuggestion
  try {
    suggestion = JSON.parse(jsonText) as CharacterSuggestion
  } catch {
    throw new Error(
      `Failed to parse Claude response as JSON: ${jsonText.slice(0, 200)}`
    )
  }

  // Basic validation
  if (
    !suggestion.ancestries?.length ||
    !suggestion.classes?.length ||
    !suggestion.backgrounds?.length
  ) {
    throw new Error('Incomplete suggestion: missing ancestries, classes, or backgrounds')
  }

  return suggestion
}
