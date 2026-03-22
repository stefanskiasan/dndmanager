// Placeholder — will be regenerated from `supabase gen types typescript`
// when Supabase is connected
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          name: string
          description: string
          gm_id: string
          invite_code: string
          settings: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          gm_id: string
          invite_code?: string
          settings?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          gm_id?: string
          invite_code?: string
          settings?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
      campaign_members: {
        Row: {
          id: string
          campaign_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
      }
      sessions: {
        Row: {
          id: string
          campaign_id: string
          name: string
          status: string
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          name: string
          status?: string
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          name?: string
          status?: string
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          owner_id: string
          campaign_id: string
          name: string
          level: number
          xp: number
          data: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          campaign_id: string
          name: string
          level?: number
          xp?: number
          data?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          campaign_id?: string
          name?: string
          level?: number
          xp?: number
          data?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      join_campaign_by_invite_code: {
        Args: { code: string }
        Returns: string
      }
    }
    Enums: Record<string, never>
  }
}
