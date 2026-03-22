import { describe, it, expect } from 'vitest'
import {
  startNpcDialog,
  npcDialogMessage,
  approveNpcDialog,
  rejectNpcDialog,
  endNpcDialog,
} from '../npc-dialog'
import { formatEventAsText } from '../events'

describe('NPC dialog events', () => {
  it('creates a start dialog event', () => {
    const event = startNpcDialog({
      npcId: 'goblin-boss',
      npcName: 'Grukk',
      playerId: 'player-1',
      playerName: 'Thorn',
    })
    expect(event.type).toBe('npc_dialog_started')
    expect(event.data.npcName).toBe('Grukk')
    expect(event.data.playerName).toBe('Thorn')
  })

  it('creates a message event', () => {
    const event = npcDialogMessage({
      npcId: 'goblin-boss',
      senderName: 'Thorn',
      senderRole: 'player',
      content: 'Who are you?',
    })
    expect(event.type).toBe('npc_dialog_message')
    expect(event.data.content).toBe('Who are you?')
  })

  it('creates an approval event', () => {
    const event = approveNpcDialog({
      npcId: 'goblin-boss',
      npcName: 'Grukk',
      messageId: 'msg-1',
      edited: false,
    })
    expect(event.type).toBe('npc_dialog_approved')
    expect(event.data.edited).toBe(false)
  })

  it('creates a rejection event', () => {
    const event = rejectNpcDialog({
      npcId: 'goblin-boss',
      npcName: 'Grukk',
      messageId: 'msg-1',
      reason: 'Out of character',
    })
    expect(event.type).toBe('npc_dialog_rejected')
    expect(event.data.reason).toBe('Out of character')
  })

  it('creates an end dialog event', () => {
    const event = endNpcDialog({
      npcId: 'goblin-boss',
      npcName: 'Grukk',
      playerId: 'player-1',
      playerName: 'Thorn',
    })
    expect(event.type).toBe('npc_dialog_ended')
  })

  it('formats dialog events as text', () => {
    const start = startNpcDialog({
      npcId: 'goblin-boss',
      npcName: 'Grukk',
      playerId: 'player-1',
      playerName: 'Thorn',
    })
    expect(formatEventAsText(start)).toBe('Thorn started talking to Grukk')
  })
})
