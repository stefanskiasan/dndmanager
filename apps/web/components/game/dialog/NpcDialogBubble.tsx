'use client'

import { cn } from '@/lib/utils'
import type { NpcMessage } from '@dndmanager/ai-services'

interface NpcDialogBubbleProps {
  message: NpcMessage
  npcName: string
}

export function NpcDialogBubble({ message, npcName }: NpcDialogBubbleProps) {
  const isPlayer = message.role === 'player'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="text-center text-xs text-muted-foreground italic py-1">
        {message.content}
      </div>
    )
  }

  return (
    <div
      className={cn('flex flex-col gap-1 max-w-[80%]', {
        'self-end items-end': isPlayer,
        'self-start items-start': !isPlayer,
      })}
    >
      <span className="text-xs text-muted-foreground font-medium">
        {isPlayer ? 'You' : npcName}
      </span>
      <div
        className={cn('rounded-lg px-3 py-2 text-sm', {
          'bg-primary text-primary-foreground': isPlayer,
          'bg-muted': !isPlayer,
        })}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
