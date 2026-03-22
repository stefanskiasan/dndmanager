'use client'

import { cn } from '@/lib/utils'
import type { CoGMMessage as CoGMMessageType } from '@dndmanager/ai-services'

interface CoGMMessageProps {
  message: CoGMMessageType
}

export function CoGMMessage({ message }: CoGMMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-neutral-800 text-neutral-100'
        )}
      >
        {!isUser && (
          <span className="mb-1 block text-xs font-medium text-amber-400">
            Co-GM
          </span>
        )}
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  )
}
