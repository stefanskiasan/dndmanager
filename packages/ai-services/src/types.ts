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
