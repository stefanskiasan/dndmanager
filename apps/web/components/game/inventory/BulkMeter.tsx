'use client'

interface BulkMeterProps {
  currentBulk: number
  encumbranceThreshold: number
  maxBulk: number
}

export function BulkMeter({ currentBulk, encumbranceThreshold, maxBulk }: BulkMeterProps) {
  const percentage = Math.min((currentBulk / maxBulk) * 100, 100)
  const isEncumbered = currentBulk >= encumbranceThreshold
  const isOverloaded = currentBulk > maxBulk

  let barColor = 'bg-green-500'
  if (isOverloaded) barColor = 'bg-red-600'
  else if (isEncumbered) barColor = 'bg-yellow-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-neutral-400">
        <span>
          Traglast: {currentBulk} / {maxBulk}
          {isEncumbered && !isOverloaded && ' (Belastet)'}
          {isOverloaded && ' (Ueberladen!)'}
        </span>
        <span>Grenze: {encumbranceThreshold}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-neutral-700">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
