'use client'

import { useMemo, useState } from 'react'
import type { Inventory, ItemCategory } from '@dndmanager/pf2e-engine'
import {
  calculateTotalBulk, getEncumbranceThreshold, getMaxBulk,
} from '@dndmanager/pf2e-engine'
import { CurrencyDisplay } from './CurrencyDisplay'
import { BulkMeter } from './BulkMeter'
import { InventoryItemRow } from './InventoryItemRow'

interface InventoryPanelProps {
  inventory: Inventory
  strModifier: number
  onRemoveItem?: (itemId: string) => void
  onUseItem?: (itemId: string) => void
}

const CATEGORY_TABS: { key: ItemCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'weapon', label: 'Waffen' },
  { key: 'armor', label: 'Ruestung' },
  { key: 'consumable', label: 'Verbrauchbar' },
  { key: 'wondrous', label: 'Magisch' },
]

export function InventoryPanel({
  inventory,
  strModifier,
  onRemoveItem,
  onUseItem,
}: InventoryPanelProps) {
  const [filter, setFilter] = useState<ItemCategory | 'all'>('all')

  const totalBulk = useMemo(
    () => calculateTotalBulk(inventory.items),
    [inventory.items]
  )

  const filteredItems = useMemo(
    () =>
      filter === 'all'
        ? inventory.items
        : inventory.items.filter((i) => i.category === filter),
    [inventory.items, filter]
  )

  return (
    <div className="flex h-full flex-col space-y-3 rounded-lg bg-neutral-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-200">Inventar</h2>
        <CurrencyDisplay currency={inventory.currency} />
      </div>

      {/* Bulk Meter */}
      <BulkMeter
        currentBulk={totalBulk}
        encumbranceThreshold={getEncumbranceThreshold(strModifier)}
        maxBulk={getMaxBulk(strModifier)}
      />

      {/* Category Tabs */}
      <div className="flex gap-1">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              filter === tab.key
                ? 'bg-neutral-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Item List */}
      <div className="flex-1 space-y-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-600">
            Keine Gegenstaende
          </div>
        ) : (
          filteredItems.map((item) => (
            <InventoryItemRow
              key={item.id}
              item={item}
              onRemove={onRemoveItem}
              onUse={item.category === 'consumable' ? onUseItem : undefined}
            />
          ))
        )}
      </div>
    </div>
  )
}
