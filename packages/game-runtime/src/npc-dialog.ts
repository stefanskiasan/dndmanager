import { createEvent } from './events.js'
import type { GameEvent } from './types.js'

export interface StartDialogParams {
  npcId: string
  npcName: string
  playerId: string
  playerName: string
}

export interface DialogMessageParams {
  npcId: string
  senderName: string
  senderRole: 'player' | 'npc'
  content: string
}

export interface ApproveDialogParams {
  npcId: string
  npcName: string
  messageId: string
  edited: boolean
}

export interface RejectDialogParams {
  npcId: string
  npcName: string
  messageId: string
  reason?: string
}

export interface EndDialogParams {
  npcId: string
  npcName: string
  playerId: string
  playerName: string
}

/** Create event when a player initiates dialog with an NPC */
export function startNpcDialog(params: StartDialogParams): GameEvent {
  return createEvent('npc_dialog_started', {
    npcId: params.npcId,
    npcName: params.npcName,
    playerId: params.playerId,
    playerName: params.playerName,
  })
}

/** Create event when a message is sent in an NPC dialog */
export function npcDialogMessage(params: DialogMessageParams): GameEvent {
  return createEvent('npc_dialog_message', {
    npcId: params.npcId,
    senderName: params.senderName,
    senderRole: params.senderRole,
    content: params.content,
  })
}

/** Create event when GM approves an NPC response */
export function approveNpcDialog(params: ApproveDialogParams): GameEvent {
  return createEvent('npc_dialog_approved', {
    npcId: params.npcId,
    npcName: params.npcName,
    messageId: params.messageId,
    edited: params.edited,
  })
}

/** Create event when GM rejects an NPC response */
export function rejectNpcDialog(params: RejectDialogParams): GameEvent {
  return createEvent('npc_dialog_rejected', {
    npcId: params.npcId,
    npcName: params.npcName,
    messageId: params.messageId,
    reason: params.reason,
  })
}

/** Create event when a dialog conversation ends */
export function endNpcDialog(params: EndDialogParams): GameEvent {
  return createEvent('npc_dialog_ended', {
    npcId: params.npcId,
    npcName: params.npcName,
    playerId: params.playerId,
    playerName: params.playerName,
  })
}
