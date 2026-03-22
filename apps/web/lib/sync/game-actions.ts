import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.js'
import type { GameStateRow, GameTokenRow } from './types.js'
import type { Token, GameMode } from '@dndmanager/game-runtime'

type Client = SupabaseClient<Database>

/**
 * Initialize game state for a session.
 */
export async function initializeGameState(
  supabase: Client,
  sessionId: string,
  mapSize: [number, number],
): Promise<string> {
  const { data, error } = await supabase
    .from('game_state')
    .insert({ session_id: sessionId })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to init game state: ${error.message}`)
  return data.id
}

/**
 * Load existing game state for a session.
 */
export async function loadGameState(
  supabase: Client,
  sessionId: string
): Promise<{ state: GameStateRow; tokens: GameTokenRow[] } | null> {
  const { data: state } = await supabase
    .from('game_state')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (!state) return null

  const { data: tokens } = await supabase
    .from('game_tokens')
    .select('*')
    .eq('game_state_id', state.id)

  return { state: state as unknown as GameStateRow, tokens: (tokens ?? []) as unknown as GameTokenRow[] }
}

/**
 * Spawn a token on the map.
 */
export async function spawnToken(
  supabase: Client,
  gameStateId: string,
  token: Token
): Promise<void> {
  const { error } = await supabase
    .from('game_tokens')
    .insert({
      id: token.id,
      game_state_id: gameStateId,
      name: token.name,
      token_type: token.type,
      owner_id: token.ownerId === 'gm' ? null : token.ownerId,
      position_x: token.position.x,
      position_y: token.position.y,
      speed: token.speed,
      hp_current: token.hp.current,
      hp_max: token.hp.max,
      hp_temp: token.hp.temp,
      ac: token.ac,
      conditions: token.conditions as unknown as Record<string, unknown>[],
      visible: token.visible,
    })

  if (error) throw new Error(`Failed to spawn token: ${error.message}`)
}

/**
 * Move a token to a new position.
 */
export async function moveTokenDB(
  supabase: Client,
  gameStateId: string,
  tokenId: string,
  x: number,
  y: number
): Promise<void> {
  const { error } = await supabase
    .from('game_tokens')
    .update({ position_x: x, position_y: y })
    .eq('id', tokenId)
    .eq('game_state_id', gameStateId)

  if (error) throw new Error(`Failed to move token: ${error.message}`)
}

/**
 * Update game mode (exploration/encounter/downtime).
 */
export async function updateGameMode(
  supabase: Client,
  gameStateId: string,
  mode: GameMode,
  round?: number
): Promise<void> {
  const update: Record<string, unknown> = { mode }
  if (round !== undefined) update.round = round
  if (mode === 'exploration') {
    update.round = 0
    update.current_turn_index = -1
    update.current_token_id = null
    update.actions_remaining = 3
    update.reaction_available = true
  }

  const { error } = await supabase
    .from('game_state')
    .update(update)
    .eq('id', gameStateId)

  if (error) throw new Error(`Failed to update mode: ${error.message}`)
}

/**
 * Advance to next turn.
 */
export async function advanceTurn(
  supabase: Client,
  gameStateId: string,
  nextTokenId: string,
  turnIndex: number,
  round: number
): Promise<void> {
  const { error } = await supabase
    .from('game_state')
    .update({
      current_token_id: nextTokenId,
      current_turn_index: turnIndex,
      round,
      actions_remaining: 3,
      reaction_available: true,
    })
    .eq('id', gameStateId)

  if (error) throw new Error(`Failed to advance turn: ${error.message}`)
}

/**
 * Use an action (decrement counter).
 */
export async function useActionDB(
  supabase: Client,
  gameStateId: string,
  actionsRemaining: number
): Promise<void> {
  const { error } = await supabase
    .from('game_state')
    .update({ actions_remaining: actionsRemaining })
    .eq('id', gameStateId)

  if (error) throw new Error(`Failed to use action: ${error.message}`)
}

/**
 * Log a game event.
 */
export async function logGameEvent(
  supabase: Client,
  gameStateId: string,
  eventType: string,
  data: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('game_action_log')
    .insert({
      game_state_id: gameStateId,
      event_type: eventType,
      data,
    })

  if (error) throw new Error(`Failed to log event: ${error.message}`)
}

/**
 * Update token HP.
 */
export async function updateTokenHP(
  supabase: Client,
  gameStateId: string,
  tokenId: string,
  hp: { current: number; max: number; temp: number }
): Promise<void> {
  const { error } = await supabase
    .from('game_tokens')
    .update({
      hp_current: hp.current,
      hp_max: hp.max,
      hp_temp: hp.temp,
    })
    .eq('id', tokenId)
    .eq('game_state_id', gameStateId)

  if (error) throw new Error(`Failed to update HP: ${error.message}`)
}

/**
 * Remove a token from the map.
 */
export async function removeTokenDB(
  supabase: Client,
  gameStateId: string,
  tokenId: string
): Promise<void> {
  const { error } = await supabase
    .from('game_tokens')
    .delete()
    .eq('id', tokenId)
    .eq('game_state_id', gameStateId)

  if (error) throw new Error(`Failed to remove token: ${error.message}`)
}
