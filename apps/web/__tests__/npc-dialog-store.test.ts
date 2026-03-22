import { describe, it, expect, beforeEach } from 'vitest'
import { useNpcDialogStore } from '../lib/stores/npc-dialog-store'
import type { NpcDialogProfile, NpcMessage } from '@dndmanager/ai-services'

const testNpc: NpcDialogProfile = {
  npcId: 'goblin-boss',
  name: 'Grukk',
  personality: 'Feige aber laut',
  knowledge: ['Hat den Handelskarren ueberfallen'],
  dialogueStyle: 'Kreischt in gebrochenem Common',
}

describe('useNpcDialogStore', () => {
  beforeEach(() => {
    useNpcDialogStore.setState({
      activeConversationId: null,
      activeNpc: null,
      messages: [],
      isGenerating: false,
      isPendingApproval: false,
      error: null,
    })
  })

  it('opens a dialog with an NPC', () => {
    useNpcDialogStore.getState().openDialog(testNpc, 'conv-1')
    const state = useNpcDialogStore.getState()
    expect(state.activeNpc?.npcId).toBe('goblin-boss')
    expect(state.activeConversationId).toBe('conv-1')
  })

  it('closes a dialog and resets state', () => {
    useNpcDialogStore.getState().openDialog(testNpc, 'conv-1')
    useNpcDialogStore.getState().closeDialog()
    const state = useNpcDialogStore.getState()
    expect(state.activeNpc).toBeNull()
    expect(state.activeConversationId).toBeNull()
    expect(state.messages).toEqual([])
  })

  it('adds a message', () => {
    const msg: NpcMessage = {
      id: '1',
      conversationId: 'conv-1',
      role: 'player',
      content: 'Hello',
      status: 'approved',
      createdAt: '2026-01-01T00:00:00Z',
    }
    useNpcDialogStore.getState().addMessage(msg)
    expect(useNpcDialogStore.getState().messages).toHaveLength(1)
    expect(useNpcDialogStore.getState().messages[0].content).toBe('Hello')
  })

  it('updates a message by ID', () => {
    const msg: NpcMessage = {
      id: '1',
      conversationId: 'conv-1',
      role: 'npc',
      content: 'Original',
      status: 'pending',
      createdAt: '2026-01-01T00:00:00Z',
    }
    useNpcDialogStore.getState().addMessage(msg)
    useNpcDialogStore.getState().updateMessage('1', {
      content: 'Edited',
      status: 'edited',
    })
    const updated = useNpcDialogStore.getState().messages[0]
    expect(updated.content).toBe('Edited')
    expect(updated.status).toBe('edited')
  })

  it('sets pending approval flag', () => {
    useNpcDialogStore.getState().setPendingApproval(true)
    expect(useNpcDialogStore.getState().isPendingApproval).toBe(true)
  })
})
