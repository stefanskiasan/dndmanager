import { getAnthropicClient } from '../client'
import {
  FEAT_RECOMMENDATION_SYSTEM_PROMPT,
  buildFeatRecommendationPrompt,
} from '../prompts/feat-recommendation'
import type {
  FeatRecommendationRequest,
  FeatRecommendationResponse,
} from '../types'

const MODEL = 'claude-opus-4-6'
const MAX_TOKENS = 2048

/**
 * Calls Claude to generate feat recommendations based on
 * character build, party composition, and play style.
 */
export async function recommendFeats(
  request: FeatRecommendationRequest
): Promise<FeatRecommendationResponse> {
  const client = getAnthropicClient()

  const userPrompt = buildFeatRecommendationPrompt(request)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: FEAT_RECOMMENDATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let jsonText = textBlock.text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  let result: FeatRecommendationResponse
  try {
    result = JSON.parse(jsonText) as FeatRecommendationResponse
  } catch {
    throw new Error(
      `Failed to parse Claude feat response as JSON: ${jsonText.slice(0, 200)}`
    )
  }

  if (!result.recommendations?.length) {
    throw new Error('No feat recommendations returned')
  }

  return result
}
