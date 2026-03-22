import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DnD Manager — Pathfinder 2e Platform',
  description: 'Hybrid tabletop/computer game platform for Pathfinder 2e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  )
}
