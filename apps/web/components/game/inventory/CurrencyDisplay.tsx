'use client'

import type { Currency } from '@dndmanager/pf2e-engine'

interface CurrencyDisplayProps {
  currency: Currency
}

const DENOMINATION_STYLES = {
  pp: 'bg-gray-300 text-gray-800',
  gp: 'bg-yellow-500 text-yellow-900',
  sp: 'bg-gray-400 text-gray-800',
  cp: 'bg-orange-600 text-orange-100',
}

const DENOMINATION_LABELS = { pp: 'PP', gp: 'GP', sp: 'SP', cp: 'CP' }

export function CurrencyDisplay({ currency }: CurrencyDisplayProps) {
  const denominations = (['pp', 'gp', 'sp', 'cp'] as const).filter(
    (d) => currency[d] > 0
  )

  if (denominations.length === 0) {
    return <span className="text-xs text-neutral-500">Kein Gold</span>
  }

  return (
    <div className="flex items-center gap-2">
      {denominations.map((d) => (
        <span
          key={d}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${DENOMINATION_STYLES[d]}`}
        >
          {currency[d]} {DENOMINATION_LABELS[d]}
        </span>
      ))}
    </div>
  )
}
