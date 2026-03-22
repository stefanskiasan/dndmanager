import { Nav } from '@/components/ui/nav'

export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  )
}
