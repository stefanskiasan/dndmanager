import type { FeatRecommendationRequest } from '../types'

export const FEAT_RECOMMENDATION_SYSTEM_PROMPT = `You are an expert Pathfinder 2nd Edition character optimiser.
Given a character build, party composition, and feat type requested, recommend the 3-5 best feats.

Rules:
- Only suggest feats the character qualifies for (correct level, class, prerequisites)
- Consider synergies with existing feats and class features
- Account for party composition gaps (e.g. if no healer, suggest supportive options)
- Respect the player's stated play style when provided
- Respond ONLY with a valid JSON object matching the FeatRecommendationResponse schema
- Include a brief build analysis and reasoning for each recommendation
- Set priority: "top-pick" for the single best option, "strong" for excellent alternatives, "situational" for niche-but-powerful picks

JSON schema for your response:
{
  "recommendations": [{ "name": string, "level": number, "type": string, "description": string, "reasoning": string, "synergies": string[], "priority": "top-pick"|"strong"|"situational" }],
  "buildAnalysis": string,
  "partyGapAnalysis": string | null
}`

export function buildFeatRecommendationPrompt(
  request: FeatRecommendationRequest
): string {
  const { character, party, featType, maxFeatLevel } = request

  let prompt = `Character: ${character.name}, Level ${character.level} ${character.ancestry} ${character.className}
Background: ${character.background}
Ability Scores: ${Object.entries(character.abilityScores).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ')}
Current Feats: ${character.currentFeats.join(', ') || 'None'}
Skills: ${character.skills.map(s => `${s.name} (${s.rank})`).join(', ')}
Play Style: ${character.playStyle ?? 'Not specified'}

Looking for: ${featType} feat, max level ${maxFeatLevel}`

  if (party) {
    prompt += `\n\nParty Members:\n${party.members.map(m =>
      `- ${m.name}: Level ${m.level} ${m.className}${m.role ? ` (${m.role})` : ''}`
    ).join('\n')}`
  }

  return prompt
}
