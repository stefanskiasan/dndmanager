'use client'

import type { Item } from '@dndmanager/pf2e-engine'
import { formatBulk, formatPrice } from '@dndmanager/pf2e-engine'

interface InventoryItemRowProps {
  item: Item
  onRemove?: (itemId: string) => void
  onUse?: (itemId: string) => void
}

const CATEGORY_COLORS = {
  weapon: 'border-red-700',
  armor: 'border-blue-700',
  consumable: 'border-green-700',
  wondrous: 'border-purple-700',
}

const RARITY_COLORS = {
  common: '',
  uncommon: 'text-orange-400',
  rare: 'text-blue-400',
  unique: 'text-purple-400',
}

export function InventoryItemRow({ item, onRemove, onUse }: InventoryItemRowProps) {
  return (
    <div
      className={`flex items-center justify-between rounded border-l-2 bg-neutral-800 px-3 py-2 ${CATEGORY_COLORS[item.category]}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${RARITY_COLORS[item.rarity]}`}>
            {item.name}
          </span>
          {item.quantity > 1 && (
            <span className="rounded bg-neutral-700 px-1.5 text-xs text-neutral-300">
              x{item.quantity}
            </span>
          )}
          <span className="text-xs text-neutral-500">Lvl {item.level}</span>
        </div>
        <div className="flex gap-3 text-xs text-neutral-500">
          <span>Bulk: {formatBulk(item.bulk)}</span>
          <span>{formatPrice(item.price)}</span>
          {item.traits.length > 0 && (
            <span>{item.traits.join(', ')}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {item.category === 'consumable' && onUse && (
          <button
            onClick={() => onUse(item.id)}
            className="rounded bg-green-700 px-2 py-1 text-xs text-white hover:bg-green-600"
          >
            Benutzen
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            className="rounded bg-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-600"
          >
            Ablegen
          </button>
        )}
      </div>
    </div>
  )
}
