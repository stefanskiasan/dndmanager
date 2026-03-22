import { getAnthropicClient } from '../client'
import { JOURNAL_SYSTEM_PROMPT, buildJournalPrompt } from './journal-prompts'
import type { JournalGenerateRequest, SessionJournal } from '../types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2048

/**
 * Generates a narrative session journal from the game action log.
 */
export async function generateSessionJournal(
  request: JournalGenerateRequest
): Promise<Omit<SessionJournal, 'id' | 'generatedAt'>> {
  const client = getAnthropicClient()

  const userPrompt = buildJournalPrompt(
    request.sessionName,
    request.partyMembers,
    request.actionLog,
    request.campaignSetting
  )

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: JOURNAL_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  let parsed: {
    title: string
    narrative: string
    highlights: string[]
    combatSummary: string | null
  }

  try {
    parsed = JSON.parse(textBlock.text)
  } catch {
    throw new Error(
      `Failed to parse journal response as JSON: ${textBlock.text.slice(0, 200)}`
    )
  }

  if (!parsed.title || !parsed.narrative || !parsed.highlights) {
    throw new Error('Incomplete journal: missing title, narrative, or highlights')
  }

  return {
    sessionId: request.sessionId,
    campaignId: request.campaignId,
    title: parsed.title,
    narrative: parsed.narrative,
    highlights: parsed.highlights,
    combatSummary: parsed.combatSummary ?? undefined,
  }
}
