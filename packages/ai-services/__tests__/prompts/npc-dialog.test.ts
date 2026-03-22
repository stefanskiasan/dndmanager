import { describe, it, expect } from 'vitest'
import {
  buildNpcSystemPrompt,
  buildConversationMessages,
  buildGmContextInjection,
} from '../../src/prompts/npc-dialog'
import type { NpcDialogProfile, NpcMessage } from '../../src/types'

const goblinBoss: NpcDialogProfile = {
  npcId: 'goblin-boss',
  name: 'Grukk',
  personality: 'Feige aber laut. Versteckt sich hinter seinen Schergen.',
  knowledge: [
    'Hat den Handelskarren ueberfallen',
    'Hat 6 Goblins unter seinem Kommando',
    'Fuerchtet Feuer',
  ],
  dialogueStyle: 'Kreischt und droht in gebrochenem Common',
  monsterRef: 'pf2e:goblin-warrior',
}

describe('buildNpcSystemPrompt', () => {
  it('includes NPC personality in the prompt', () => {
    const prompt = buildNpcSystemPrompt(goblinBoss)
    expect(prompt).toContain('Feige aber laut')
  })

  it('includes all knowledge items', () => {
    const prompt = buildNpcSystemPrompt(goblinBoss)
    expect(prompt).toContain('Hat den Handelskarren ueberfallen')
    expect(prompt).toContain('Hat 6 Goblins unter seinem Kommando')
    expect(prompt).toContain('Fuerchtet Feuer')
  })

  it('includes dialogue style', () => {
    const prompt = buildNpcSystemPrompt(goblinBoss)
    expect(prompt).toContain('Kreischt und droht in gebrochenem Common')
  })

  it('includes monster reference when provided', () => {
    const prompt = buildNpcSystemPrompt(goblinBoss)
    expect(prompt).toContain('pf2e:goblin-warrior')
  })

  it('omits monster reference when not provided', () => {
    const npcWithoutMonster = { ...goblinBoss, monsterRef: undefined }
    const prompt = buildNpcSystemPrompt(npcWithoutMonster)
    expect(prompt).not.toContain('Creature Type')
  })

  it('includes roleplay rules', () => {
    const prompt = buildNpcSystemPrompt(goblinBoss)
    expect(prompt).toContain('Stay completely in character')
    expect(prompt).toContain('Never break the fourth wall')
  })
})

describe('buildConversationMessages', () => {
  const messages: NpcMessage[] = [
    {
      id: '1',
      conversationId: 'conv-1',
      role: 'player',
      content: 'Who are you?',
      status: 'approved',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      conversationId: 'conv-1',
      role: 'npc',
      content: '*growls* Me Grukk!',
      status: 'approved',
      createdAt: '2026-01-01T00:01:00Z',
    },
    {
      id: '3',
      conversationId: 'conv-1',
      role: 'npc',
      content: 'This was rejected',
      status: 'rejected',
      createdAt: '2026-01-01T00:02:00Z',
    },
    {
      id: '4',
      conversationId: 'conv-1',
      role: 'npc',
      content: 'GM edited this',
      status: 'edited',
      originalContent: 'Original AI text',
      createdAt: '2026-01-01T00:03:00Z',
    },
  ]

  it('includes player messages as user role', () => {
    const result = buildConversationMessages(messages)
    expect(result[0]).toEqual({ role: 'user', content: 'Who are you?' })
  })

  it('includes approved NPC messages as assistant role', () => {
    const result = buildConversationMessages(messages)
    expect(result[1]).toEqual({ role: 'assistant', content: '*growls* Me Grukk!' })
  })

  it('excludes rejected messages', () => {
    const result = buildConversationMessages(messages)
    expect(result.find((m) => m.content === 'This was rejected')).toBeUndefined()
  })

  it('includes edited messages with edited content', () => {
    const result = buildConversationMessages(messages)
    expect(result[2]).toEqual({ role: 'assistant', content: 'GM edited this' })
  })

  it('returns correct count (3 of 4 included)', () => {
    const result = buildConversationMessages(messages)
    expect(result).toHaveLength(3)
  })
})

describe('buildGmContextInjection', () => {
  it('wraps hint in GM context format', () => {
    const result = buildGmContextInjection('Guards are approaching')
    expect(result).toContain('GM CONTEXT')
    expect(result).toContain('Guards are approaching')
  })
})
