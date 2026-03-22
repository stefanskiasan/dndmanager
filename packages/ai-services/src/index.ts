export { AI_SERVICES_VERSION } from './version'

// Schemas
export * from './schemas'

// Fetcher
export * from './fetcher'

// Parser
export * from './parser'

// Loader
export * from './loader'

// Pipeline
export { runPipeline } from './pipeline'
export type { PipelineOptions, PipelineResult } from './pipeline'

// AI Client
export { getAnthropicClient, resetClient } from './client'

// Character Suggestion
export { suggestCharacter } from './services/character-suggestion'
export {
  CHARACTER_CREATION_SYSTEM_PROMPT,
  buildUserPrompt,
} from './prompts/character-creation'
export type {
  CharacterSuggestion,
  CharacterSuggestionRequest,
  CharacterOption,
  AbilityBoostSuggestion,
} from './types'

// 3D Model Generation
export { createMeshyClient } from './services/meshy-client'
export type { MeshyClient, PollOptions } from './services/meshy-client'
export { createMockMeshyClient } from './services/meshy-client.mock'
export { optimizeModelPrompt } from './services/model-prompt-optimizer'
export {
  MODEL_GENERATION_SYSTEM_PROMPT,
  buildModelUserPrompt,
} from './prompts/model-generation'
export type {
  MeshyTaskStatus,
  MeshyCreateTaskRequest,
  MeshyTaskResponse,
  ModelGenerationRequest,
  OptimizedModelPrompt,
  ModelGenerationStatus,
} from './types'

// NPC Dialog
export { generateNpcResponse } from './services/npc-dialog'
export type { GenerateNpcResponseParams, GenerateNpcResponseResult } from './services/npc-dialog'
export {
  buildNpcSystemPrompt,
  buildConversationMessages,
  buildGmContextInjection,
} from './prompts/npc-dialog'
export type {
  NpcDialogProfile,
  NpcMessage,
  NpcConversation,
  NpcDialogRequest,
  NpcDialogResponse,
  NpcApprovalAction,
} from './types'
