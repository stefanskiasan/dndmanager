'use client'

interface ActionButtonProps {
  label: string
  description?: string
  bonus?: number
  cost?: number
  disabled?: boolean
  variant?: 'strike' | 'move' | 'spell' | 'skill' | 'default'
  onClick: () => void
}

const VARIANT_COLORS = {
  strike: 'bg-red-700 hover:bg-red-600 text-white',
  move: 'bg-green-700 hover:bg-green-600 text-white',
  spell: 'bg-purple-700 hover:bg-purple-600 text-white',
  skill: 'bg-yellow-700 hover:bg-yellow-600 text-white',
  default: 'bg-neutral-700 hover:bg-neutral-600 text-white',
}

export function ActionButton({
  label,
  description,
  bonus,
  cost = 1,
  disabled = false,
  variant = 'default',
  onClick,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${VARIANT_COLORS[variant]}`}
    >
      <div>
        <div className="font-medium">{label}</div>
        {description && <div className="text-xs opacity-75">{description}</div>}
      </div>
      <div className="flex items-center gap-2">
        {bonus !== undefined && (
          <span className="rounded bg-black/20 px-2 py-0.5 text-xs font-mono">
            {bonus >= 0 ? '+' : ''}{bonus}
          </span>
        )}
        <div className="flex gap-0.5">
          {Array.from({ length: cost }).map((_, i) => (
            <div key={i} className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          ))}
        </div>
      </div>
    </button>
  )
}
