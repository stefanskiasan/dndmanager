import type { NpcDialogProfile, NpcMessage } from '../types'

/**
 * Builds a system prompt for Claude that embodies the NPC's personality,
 * knowledge, and dialogue style. This is the core of the dialog engine —
 * the prompt shapes every response the NPC gives.
 */
export function buildNpcSystemPrompt(npc: NpcDialogProfile): string {
  return `You are roleplaying as "${npc.name}", an NPC in a Pathfinder 2nd Edition tabletop game.

CHARACTER DEFINITION:
- Personality: ${npc.personality}
- Dialogue Style: ${npc.dialogueStyle}
${npc.monsterRef ? `- Creature Type: ${npc.monsterRef}` : ''}

KNOWLEDGE (things this NPC knows and can reveal through conversation):
${npc.knowledge.map((k, i) => `${i + 1}. ${k}`).join('\n')}

RULES:
- Stay completely in character at all times. Never break the fourth wall.
- Match the dialogue style exactly — vocabulary, grammar, speech patterns.
- Only reveal knowledge naturally through conversation. Do not dump all information at once.
- If asked about something outside your knowledge, respond in-character (deflect, express ignorance, speculate based on personality).
- Keep responses concise — 1-3 sentences for casual exchanges, up to a short paragraph for important reveals.
- Never reference game mechanics, dice, or rules. Speak as a living person in this world.
- React emotionally according to your personality when appropriate.
- If threatened or intimidated, respond according to your personality (cowardly NPCs cower, brave ones stand firm, etc.).

RESPONSE FORMAT:
Respond ONLY with the NPC's spoken dialogue and brief action descriptions in asterisks.
Example: *leans forward nervously* "I wouldn't go down that road if I were you, stranger."

Do not include any out-of-character commentary or explanations.`
}

/**
 * Converts conversation history into Claude message format.
 * Only includes approved/edited messages — pending and rejected messages are excluded.
 */
export function buildConversationMessages(
  messages: NpcMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter(
      (m) =>
        m.role === 'player' ||
        (m.role === 'npc' && (m.status === 'approved' || m.status === 'edited'))
    )
    .map((m) => ({
      role: m.role === 'player' ? ('user' as const) : ('assistant' as const),
      content: m.role === 'npc' && m.status === 'edited'
        ? m.content // Use edited content
        : m.content,
    }))
}

/**
 * Builds a context preamble that the GM can optionally inject to steer
 * the NPC's next response (e.g., "The NPC is nervous because guards are nearby").
 */
export function buildGmContextInjection(gmHint: string): string {
  return `[GM CONTEXT — not visible to the player, use this to inform your response: ${gmHint}]`
}
