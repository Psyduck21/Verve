export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_request_log: {
        Row: {
          cost_usd: number | null
          created_at: string
          error_code: string | null
          fallback_used: boolean
          id: string
          input_tokens: number
          latency_ms: number | null
          openrouter_model: string
          output_tokens: number
          request_type: Database["public"]["Enums"]["ai_request_type"]
          requested_model: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          error_code?: string | null
          fallback_used?: boolean
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          openrouter_model: string
          output_tokens?: number
          request_type: Database["public"]["Enums"]["ai_request_type"]
          requested_model: string
          success?: boolean
          user_id?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          error_code?: string | null
          fallback_used?: boolean
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          openrouter_model?: string
          output_tokens?: number
          request_type?: Database["public"]["Enums"]["ai_request_type"]
          requested_model?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_request_log_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          session_id: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          session_id?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          session_id?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_session_id_sessions_id_fk"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_schedules: {
        Row: {
          action_url: string | null
          body: string
          cancelled_at: string | null
          created_at: string
          failed_at: string | null
          failure_reason: string | null
          icon_url: string | null
          id: string
          payload: Json | null
          scheduled_for: string
          sent_at: string | null
          subscription_id: string | null
          task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          cancelled_at?: string | null
          created_at?: string
          failed_at?: string | null
          failure_reason?: string | null
          icon_url?: string | null
          id?: string
          payload?: Json | null
          scheduled_for: string
          sent_at?: string | null
          subscription_id?: string | null
          task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          cancelled_at?: string | null
          created_at?: string
          failed_at?: string | null
          failure_reason?: string | null
          icon_url?: string | null
          id?: string
          payload?: Json | null
          scheduled_for?: string
          sent_at?: string | null
          subscription_id?: string | null
          task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_schedules_subscription_id_web_push_subscriptions_i"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "web_push_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_schedules_task_id_tasks_id_fk"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_schedules_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_identities: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          provider: Database["public"]["Enums"]["oauth_provider"]
          provider_uid: string
          raw_profile: Json | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          provider: Database["public"]["Enums"]["oauth_provider"]
          provider_uid: string
          raw_profile?: Json | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          provider?: Database["public"]["Enums"]["oauth_provider"]
          provider_uid?: string
          raw_profile?: Json | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_identities_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          ai_generated_at: string | null
          ai_model_used: string | null
          ai_prompt_version: number
          client_id: string | null
          created_at: string
          deleted_at: string | null
          goal: string | null
          id: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_generated_at?: string | null
          ai_model_used?: string | null
          ai_prompt_version?: number
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          goal?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_generated_at?: string | null
          ai_model_used?: string | null
          ai_prompt_version?: number
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          goal?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          browser_name: string | null
          created_at: string
          csrf_token: string
          expires_at: string
          id: string
          ip_address: string | null
          last_active_at: string
          os_name: string | null
          revoked_at: string | null
          token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser_name?: string | null
          created_at?: string
          csrf_token: string
          expires_at: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          os_name?: string | null
          revoked_at?: string | null
          token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser_name?: string | null
          created_at?: string
          csrf_token?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_active_at?: string
          os_name?: string | null
          revoked_at?: string | null
          token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: Database["public"]["Enums"]["user_plan"]
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["user_plan"]
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["user_plan"]
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          actual_duration_minutes: number | null
          category: string | null
          completed_at: string
          created_at: string
          day_of_week: number
          hour_of_day: number
          id: string
          minutes_variance: number | null
          priority: Database["public"]["Enums"]["task_priority"]
          routine_id: string
          scheduled_date: string
          status: Database["public"]["Enums"]["task_status"]
          task_id: string
          timer_ended_at: string | null
          timer_started_at: string | null
          user_id: string
          was_on_time: boolean | null
          week_number: number
        }
        Insert: {
          actual_duration_minutes?: number | null
          category?: string | null
          completed_at?: string
          created_at?: string
          day_of_week: number
          hour_of_day: number
          id?: string
          minutes_variance?: number | null
          priority: Database["public"]["Enums"]["task_priority"]
          routine_id: string
          scheduled_date: string
          status: Database["public"]["Enums"]["task_status"]
          task_id: string
          timer_ended_at?: string | null
          timer_started_at?: string | null
          user_id: string
          was_on_time?: boolean | null
          week_number: number
        }
        Update: {
          actual_duration_minutes?: number | null
          category?: string | null
          completed_at?: string
          created_at?: string
          day_of_week?: number
          hour_of_day?: number
          id?: string
          minutes_variance?: number | null
          priority?: Database["public"]["Enums"]["task_priority"]
          routine_id?: string
          scheduled_date?: string
          status?: Database["public"]["Enums"]["task_status"]
          task_id?: string
          timer_ended_at?: string | null
          timer_started_at?: string | null
          user_id?: string
          was_on_time?: boolean | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_routine_id_routines_id_fk"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_tasks_id_fk"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_duration_minutes: number | null
          ai_context: string | null
          category: string | null
          client_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          estimated_duration_minutes: number
          external_id: string | null
          external_link: string | null
          external_provider: Database["public"]["Enums"]["external_provider"] | null
          id: string
          is_time_locked: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          recurrence_parent_id: string | null
          recurrence_rule: string | null
          routine_id: string
          scheduled_date: string
          scheduled_time: string
          status: Database["public"]["Enums"]["task_status"]
          target_day: string | null
          target_week: number | null
          title: string
          source_metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_duration_minutes?: number | null
          ai_context?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number
          external_id?: string | null
          external_link?: string | null
          external_provider?: Database["public"]["Enums"]["external_provider"] | null
          id?: string
          is_time_locked?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          routine_id: string
          scheduled_date: string
          scheduled_time: string
          status?: Database["public"]["Enums"]["task_status"]
          target_day?: string | null
          target_week?: number | null
          title: string
          source_metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_duration_minutes?: number | null
          ai_context?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number
          external_id?: string | null
          external_link?: string | null
          external_provider?: Database["public"]["Enums"]["external_provider"] | null
          id?: string
          is_time_locked?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_parent_id?: string | null
          recurrence_rule?: string | null
          routine_id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: Database["public"]["Enums"]["task_status"]
          target_day?: string | null
          target_week?: number | null
          title?: string
          source_metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_routine_id_routines_id_fk"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tombstones: {
        Row: {
          deleted_at: string
          deleted_by_session_id: string | null
          expires_at: string
          id: string
          record_id: string
          table_name: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          deleted_by_session_id?: string | null
          expires_at?: string
          id?: string
          record_id: string
          table_name: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          deleted_by_session_id?: string | null
          expires_at?: string
          id?: string
          record_id?: string
          table_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tombstones_deleted_by_session_id_sessions_id_fk"
            columns: ["deleted_by_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tombstones_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ai_budget_reset_date: string
          ai_requests_used_today: number
          avatar_url: string | null
          created_at: string
          daily_commitment_minutes: number | null
          deleted_at: string | null
          email: string
          email_verification_token: string | null
          email_verified: boolean
          full_name: string
          grind_type: string | null
          id: string
          last_active_at: string | null
          last_synced_at: string | null
          locale: string
          onboarding_completed: boolean
          password_hash: string | null
          password_reset_expires: string | null
          password_reset_token: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          plan_expires_at: string | null
          sleep_time: string | null
          timezone: string
          updated_at: string
          wake_time: string | null
        }
        Insert: {
          ai_budget_reset_date?: string
          ai_requests_used_today?: number
          avatar_url?: string | null
          created_at?: string
          daily_commitment_minutes?: number | null
          deleted_at?: string | null
          email: string
          email_verification_token?: string | null
          email_verified?: boolean
          full_name: string
          grind_type?: string | null
          id?: string
          last_active_at?: string | null
          last_synced_at?: string | null
          locale?: string
          onboarding_completed?: boolean
          password_hash?: string | null
          password_reset_expires?: string | null
          password_reset_token?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          plan_expires_at?: string | null
          sleep_time?: string | null
          timezone?: string
          updated_at?: string
          wake_time?: string | null
        }
        Update: {
          ai_budget_reset_date?: string
          ai_requests_used_today?: number
          avatar_url?: string | null
          created_at?: string
          daily_commitment_minutes?: number | null
          deleted_at?: string | null
          email?: string
          email_verification_token?: string | null
          email_verified?: boolean
          full_name?: string
          grind_type?: string | null
          id?: string
          last_active_at?: string | null
          last_synced_at?: string | null
          locale?: string
          onboarding_completed?: boolean
          password_hash?: string | null
          password_reset_expires?: string | null
          password_reset_token?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          plan_expires_at?: string | null
          sleep_time?: string | null
          timezone?: string
          updated_at?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      web_push_subscriptions: {
        Row: {
          active: boolean
          auth_key: string
          browser: string | null
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh_key: string
          user_id: string
        }
        Insert: {
          active?: boolean
          auth_key: string
          browser?: string | null
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh_key: string
          user_id: string
        }
        Update: {
          active?: boolean
          auth_key?: string
          browser?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_push_subscriptions_user_id_users_id_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ai_request_type: "generate_routine" | "extract_questions" | "reschedule"
      external_provider: "google_calendar" | "gmail" | "chrome_extension" | "slack" | "outlook" | "zoom"
      oauth_provider: "google" | "github" | "apple" | "microsoft"
      sync_operation: "INSERT" | "UPDATE" | "DELETE"
      task_priority: "critical" | "high" | "medium" | "low"
      task_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "missed"
        | "cancelled"
      user_plan: "free" | "pro" | "enterprise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      ai_request_type: ["generate_routine", "extract_questions", "reschedule"],
      oauth_provider: ["google", "github", "apple"],
      sync_operation: ["INSERT", "UPDATE", "DELETE"],
      task_priority: ["critical", "high", "medium", "low"],
      task_status: [
        "not_started",
        "in_progress",
        "completed",
        "missed",
        "cancelled",
      ],
      user_plan: ["free", "pro", "enterprise"],
    },
  },
} as const
