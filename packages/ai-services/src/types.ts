import type { AbilityId } from '@dndmanager/pf2e-engine'

/** A single ancestry/class/background option suggested by the AI */
export interface CharacterOption {
  name: string
  description: string
  reasoning: string // Why this fits the player's concept
}

/** Ability score boost suggestion */
export interface AbilityBoostSuggestion {
  ability: AbilityId
  priority: 'key' | 'high' | 'medium' | 'low'
  reasoning: string
}

/** Full AI suggestion response for character creation */
export interface CharacterSuggestion {
  /** Summary of how the AI interpreted the concept */
  conceptSummary: string

  /** Top 3 ancestry suggestions */
  ancestries: CharacterOption[]

  /** Top 3 class suggestions */
  classes: CharacterOption[]

  /** Top 3 background suggestions */
  backgrounds: CharacterOption[]

  /** Suggested ability score priorities */
  abilityBoosts: AbilityBoostSuggestion[]

  /** Suggested skill trainings */
  skills: CharacterOption[]

  /** Optional character name suggestions if not provided */
  nameSuggestions?: string[]
}

/** Request payload for the character suggestion endpoint */
export interface CharacterSuggestionRequest {
  concept: string
  level?: number
  campaignSetting?: string // optional context about the campaign
}

// ─── 3D Model Generation ─────────────────────────────

/** Status of a Meshy generation task */
export type MeshyTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED'

/** Meshy API "Text to 3D" task creation request */
export interface MeshyCreateTaskRequest {
  mode: 'preview' | 'refine'
  prompt: string
  art_style: 'realistic' | 'cartoon' | 'low-poly' | 'sculpture' | 'pbr'
  negative_prompt?: string
  topology?: 'triangle' | 'quad'
  target_polycount?: number
}

/** Meshy API task response */
export interface MeshyTaskResponse {
  id: string
  model_urls: {
    glb: string
    fbx: string
    obj: string
    usdz: string
  }
  thumbnail_url: string
  prompt: string
  art_style: string
  negative_prompt: string
  status: MeshyTaskStatus
  created_at: number
  started_at: number
  finished_at: number
  expires_at: number
  task_error: { message: string } | null
  progress: number // 0-100
}

/** Request to generate a 3D model for a character */
export interface ModelGenerationRequest {
  characterId: string
  characterName: string
  characterDescription: string
  ancestry?: string
  className?: string
  artStyle?: MeshyCreateTaskRequest['art_style']
}

/** Optimized prompt output from Claude */
export interface OptimizedModelPrompt {
  prompt: string
  negativePrompt: string
  artStyle: MeshyCreateTaskRequest['art_style']
}

/** Status response returned to the frontend */
export interface ModelGenerationStatus {
  characterId: string
  meshyTaskId: string | null
  status: 'none' | 'optimizing' | 'pending' | 'processing' | 'succeeded' | 'failed'
  progress: number
  modelUrl: string | null
  thumbnailUrl: string | null
  error: string | null
}

// ─── NPC Dialog Types ────────────────────────────

/** NPC definition as consumed by the dialog engine (mirrors scene-framework NpcDef) */
export interface NpcDialogProfile {
  npcId: string
  name: string
  personality: string
  knowledge: string[]
  dialogueStyle: string
  /** Optional monster reference for stat-based responses */
  monsterRef?: string
}

/** A single message in an NPC conversation */
export interface NpcMessage {
  id: string
  conversationId: string
  role: 'player' | 'npc' | 'system'
  content: string
  /** GM approval status — only relevant for role: 'npc' */
  status: 'pending' | 'approved' | 'edited' | 'rejected'
  /** If edited, the original AI-generated text */
  originalContent?: string
  createdAt: string
}

/** Full NPC conversation record */
export interface NpcConversation {
  id: string
  sessionId: string
  npcId: string
  playerId: string
  messages: NpcMessage[]
  createdAt: string
  updatedAt: string
}

/** Request to generate an NPC response */
export interface NpcDialogRequest {
  sessionId: string
  npcId: string
  playerMessage: string
}

/** Response from the NPC dialog generation service */
export interface NpcDialogResponse {
  messageId: string
  conversationId: string
  npcMessage: string
  status: 'pending'
}

/** GM approval action */
export interface NpcApprovalAction {
  messageId: string
  action: 'approve' | 'edit' | 'reject'
  /** Required when action is 'edit' */
  editedContent?: string
}

// ─── Co-GM Types ─────────────────────────────

/** A single message in a Co-GM conversation */
export interface CoGMMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

/** Game context snapshot injected into Co-GM system prompt */
export interface GameContextSnapshot {
  sessionId: string
  mode: 'exploration' | 'encounter' | 'downtime'
  round: number
  tokens: {
    id: string
    name: string
    type: 'player' | 'monster' | 'npc'
    hp: { current: number; max: number }
    ac: number
    conditions: string[]
  }[]
  currentTurnTokenId?: string
  recentEvents: string[] // last ~20 formatted event strings
}

/** Request payload for the Co-GM chat endpoint */
export interface CoGMRequest {
  message: string
  conversationHistory: CoGMMessage[]
  gameContext: GameContextSnapshot
  campaignSetting?: string
}

// ─── Journal Types ───────────────────────────

/** A generated session journal entry */
export interface SessionJournal {
  id: string
  sessionId: string
  campaignId: string
  title: string
  narrative: string      // markdown-formatted narrative summary
  highlights: string[]   // key moments
  combatSummary?: string // encounter recap if any combat occurred
  generatedAt: string    // ISO timestamp
}

/** Request payload for journal generation */
export interface JournalGenerateRequest {
  sessionId: string
  campaignId: string
  sessionName: string
  actionLog: {
    eventType: string
    data: Record<string, unknown>
    createdAt: string
  }[]
  partyMembers: string[] // character names
  campaignSetting?: string
}

// ─── Feat Recommendation Types ──────────────

/** Context about a character's current build for AI analysis */
export interface CharacterBuildContext {
  name: string
  level: number
  className: string
  ancestry: string
  background: string
  abilityScores: Record<string, number>
  currentFeats: string[]
  skills: { name: string; rank: string }[]
  playStyle?: string               // e.g. "aggressive melee", "support caster"
}

/** Context about the party for AI-aware recommendations */
export interface PartyContext {
  members: {
    name: string
    className: string
    level: number
    role?: string                   // e.g. "tank", "healer", "damage", "utility"
  }[]
}

/** Request for AI feat recommendations */
export interface FeatRecommendationRequest {
  character: CharacterBuildContext
  party?: PartyContext
  featType: 'class' | 'skill' | 'general' | 'ancestry'
  maxFeatLevel: number
}

/** A single AI-recommended feat */
export interface FeatRecommendation {
  name: string
  level: number
  type: 'class' | 'skill' | 'general' | 'ancestry'
  description: string
  reasoning: string                 // Why this feat suits the character/party
  synergies: string[]               // Existing feats/features it synergizes with
  priority: 'top-pick' | 'strong' | 'situational'
}

/** Full AI feat recommendation response */
export interface FeatRecommendationResponse {
  recommendations: FeatRecommendation[]
  buildAnalysis: string             // Brief analysis of the character's current build
  partyGapAnalysis?: string         // What roles/capabilities the party is missing
}
