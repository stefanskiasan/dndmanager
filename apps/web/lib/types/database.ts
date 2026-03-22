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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'campaigns_gm_id_fkey'
            columns: ['gm_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'campaign_members_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'campaign_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'sessions_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
        ]
      }
      game_state: {
        Row: {
          id: string
          session_id: string
          mode: string
          round: number
          current_turn_index: number
          current_token_id: string | null
          actions_remaining: number
          reaction_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          mode?: string
          round?: number
          current_turn_index?: number
          current_token_id?: string | null
          actions_remaining?: number
          reaction_available?: boolean
        }
        Update: {
          id?: string
          session_id?: string
          mode?: string
          round?: number
          current_turn_index?: number
          current_token_id?: string | null
          actions_remaining?: number
          reaction_available?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'game_state_session_id_fkey'
            columns: ['session_id']
            isOneToOne: true
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
        ]
      }
      game_tokens: {
        Row: {
          id: string
          game_state_id: string
          name: string
          token_type: string
          owner_id: string | null
          position_x: number
          position_y: number
          speed: number
          hp_current: number
          hp_max: number
          hp_temp: number
          ac: number
          conditions: unknown[]
          visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          game_state_id: string
          name: string
          token_type: string
          owner_id?: string | null
          position_x?: number
          position_y?: number
          speed?: number
          hp_current: number
          hp_max: number
          hp_temp?: number
          ac: number
          conditions?: unknown[]
          visible?: boolean
        }
        Update: {
          id?: string
          game_state_id?: string
          name?: string
          token_type?: string
          owner_id?: string | null
          position_x?: number
          position_y?: number
          speed?: number
          hp_current?: number
          hp_max?: number
          hp_temp?: number
          ac?: number
          conditions?: unknown[]
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'game_tokens_game_state_id_fkey'
            columns: ['game_state_id']
            isOneToOne: false
            referencedRelation: 'game_state'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'game_tokens_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      game_initiative: {
        Row: {
          id: string
          game_state_id: string
          token_id: string
          roll: number
          modifier: number
          total: number
          sort_order: number
        }
        Insert: {
          id?: string
          game_state_id: string
          token_id: string
          roll: number
          modifier?: number
          total: number
          sort_order?: number
        }
        Update: {
          id?: string
          game_state_id?: string
          token_id?: string
          roll?: number
          modifier?: number
          total?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: 'game_initiative_game_state_id_fkey'
            columns: ['game_state_id']
            isOneToOne: false
            referencedRelation: 'game_state'
            referencedColumns: ['id']
          },
        ]
      }
      game_action_log: {
        Row: {
          id: string
          game_state_id: string
          event_type: string
          data: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          game_state_id: string
          event_type: string
          data?: Record<string, unknown>
        }
        Update: {
          id?: string
          game_state_id?: string
          event_type?: string
          data?: Record<string, unknown>
        }
        Relationships: [
          {
            foreignKeyName: 'game_action_log_game_state_id_fkey'
            columns: ['game_state_id']
            isOneToOne: false
            referencedRelation: 'game_state'
            referencedColumns: ['id']
          },
        ]
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
          model_url: string | null
          model_thumbnail_url: string | null
          model_status: string
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
          model_url?: string | null
          model_thumbnail_url?: string | null
          model_status?: string
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
          model_url?: string | null
          model_thumbnail_url?: string | null
          model_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'characters_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'characters_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
        ]
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
    CompositeTypes: Record<string, never>
  }
}
