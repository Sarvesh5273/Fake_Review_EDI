export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          role: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          role?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          role?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      marketplaces: {
        Row: {
          id: string
          user_id: string | null
          platform: string
          store_name: string
          region: string | null
          sync_cadence: string | null
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          platform: string
          store_name: string
          region?: string | null
          sync_cadence?: string | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          platform?: string
          store_name?: string
          region?: string | null
          sync_cadence?: string | null
          status?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplaces_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      alerts: {
        Row: {
          id: string
          marketplace_id: string | null
          node_id: string
          risk_score: number
          signature: string | null
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          marketplace_id?: string | null
          node_id: string
          risk_score: number
          signature?: string | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          marketplace_id?: string | null
          node_id?: string
          risk_score?: number
          signature?: string | null
          status?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_marketplace_id_fkey"
            columns: ["marketplace_id"]
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          }
        ]
      }
    }
  }
}
