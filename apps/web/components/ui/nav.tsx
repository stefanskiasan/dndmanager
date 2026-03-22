import Link from 'next/link'

export function Nav() {
  return (
    <nav className="border-b border-neutral-800 bg-neutral-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/campaigns" className="text-lg font-bold tracking-tight text-amber-400 hover:text-amber-300">
          DnD Manager
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/campaigns" className="text-sm text-neutral-400 hover:text-neutral-200">
            Kampagnen
          </Link>
        </div>
      </div>
    </nav>
  )
}
