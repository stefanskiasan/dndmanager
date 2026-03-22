export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  role: 'player' | 'gm'
  created_at: string
  updated_at: string
}
