export interface Campaign {
  id: string
  name: string
  description: string
  gm_id: string
  invite_code: string
  settings: CampaignSettings
  created_at: string
  updated_at: string
}

export interface CampaignSettings {
  rateLimits: {
    aiCallsPerHour: number
    modelGenerationsPerDay: number
    audioGenerationsPerSession: number
    realtimeUpdatesPerMinute: number
  }
  dataRetention: {
    aiConversationDays: number
    sessionSnapshotMax: number
    actionLogDays: number
  }
}

export const DEFAULT_CAMPAIGN_SETTINGS: CampaignSettings = {
  rateLimits: {
    aiCallsPerHour: 50,
    modelGenerationsPerDay: 5,
    audioGenerationsPerSession: 20,
    realtimeUpdatesPerMinute: 60,
  },
  dataRetention: {
    aiConversationDays: 30,
    sessionSnapshotMax: 50,
    actionLogDays: 90,
  },
}

export interface CampaignMember {
  id: string
  campaign_id: string
  user_id: string
  role: 'player' | 'gm'
  joined_at: string
}

export interface Session {
  id: string
  campaign_id: string
  name: string
  status: 'planned' | 'active' | 'completed'
  started_at: string | null
  ended_at: string | null
  created_at: string
}
