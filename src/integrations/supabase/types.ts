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
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      bookings: {
        Row: {
          base_price: number
          cancellation_fee: number
          created_at: string
          crew_count: number
          customer_id: string
          distance_fee: number
          distance_km: number | null
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          floor_level: number
          has_elevator: boolean
          id: string
          items: Json
          items_summary: Json | null
          move_size: Database["public"]["Enums"]["move_size"]
          move_type: Database["public"]["Enums"]["move_type"]
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          recommended_vehicle: string | null
          scheduled_at: string | null
          service_fee: number
          status: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id: string | null
          tip_amount: number
          total_price: number
          updated_at: string
          vehicle_category:
            | Database["public"]["Enums"]["vehicle_category"]
            | null
        }
        Insert: {
          base_price?: number
          cancellation_fee?: number
          created_at?: string
          crew_count?: number
          customer_id: string
          distance_fee?: number
          distance_km?: number | null
          dropoff_address: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          floor_level?: number
          has_elevator?: boolean
          id?: string
          items?: Json
          items_summary?: Json | null
          move_size: Database["public"]["Enums"]["move_size"]
          move_type?: Database["public"]["Enums"]["move_type"]
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          recommended_vehicle?: string | null
          scheduled_at?: string | null
          service_fee?: number
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          tip_amount?: number
          total_price?: number
          updated_at?: string
          vehicle_category?:
            | Database["public"]["Enums"]["vehicle_category"]
            | null
        }
        Update: {
          base_price?: number
          cancellation_fee?: number
          created_at?: string
          crew_count?: number
          customer_id?: string
          distance_fee?: number
          distance_km?: number | null
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          floor_level?: number
          has_elevator?: boolean
          id?: string
          items?: Json
          items_summary?: Json | null
          move_size?: Database["public"]["Enums"]["move_size"]
          move_type?: Database["public"]["Enums"]["move_type"]
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          recommended_vehicle?: string | null
          scheduled_at?: string | null
          service_fee?: number
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_payment_intent_id?: string | null
          tip_amount?: number
          total_price?: number
          updated_at?: string
          vehicle_category?:
            | Database["public"]["Enums"]["vehicle_category"]
            | null
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          preferred_currency: string
          preferred_language: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_currency?: string
          preferred_language?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_currency?: string
          preferred_language?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      driver_bank_details: {
        Row: {
          account_holder_name: string
          account_last4: string
          bank_name: string
          created_at: string
          driver_id: string
          id: string
          institution_number: string
          is_verified: boolean
          transit_number: string
          updated_at: string
        }
        Insert: {
          account_holder_name: string
          account_last4: string
          bank_name: string
          created_at?: string
          driver_id: string
          id?: string
          institution_number: string
          is_verified?: boolean
          transit_number: string
          updated_at?: string
        }
        Update: {
          account_holder_name?: string
          account_last4?: string
          bank_name?: string
          created_at?: string
          driver_id?: string
          id?: string
          institution_number?: string
          is_verified?: boolean
          transit_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_documents: {
        Row: {
          created_at: string
          document_type: Database["public"]["Enums"]["driver_document_type"]
          driver_id: string
          file_path: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["driver_document_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type: Database["public"]["Enums"]["driver_document_type"]
          driver_id: string
          file_path: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["driver_document_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["driver_document_type"]
          driver_id?: string
          file_path?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["driver_document_status"]
          updated_at?: string
        }
        Relationships: []
      }
      driver_payouts: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          driver_id: string
          failure_reason: string | null
          id: string
          status: Database["public"]["Enums"]["payout_status"]
          stripe_payout_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          driver_id: string
          failure_reason?: string | null
          id?: string
          status?: Database["public"]["Enums"]["payout_status"]
          stripe_payout_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          driver_id?: string
          failure_reason?: string | null
          id?: string
          status?: Database["public"]["Enums"]["payout_status"]
          stripe_payout_id?: string | null
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          background_check_status: Database["public"]["Enums"]["background_check_status"]
          background_check_url: string | null
          cargo_capacity_lbs: number | null
          cargo_space_cuft: number | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          date_of_birth: string | null
          driver_license_url: string | null
          full_name: string | null
          id: string
          is_online: boolean | null
          is_verified: boolean | null
          languages: string[] | null
          license_plate: string | null
          location_updated_at: string | null
          phone: string | null
          preferred_currency: string
          preferred_language: string
          profile_picture_url: string | null
          rating: number | null
          stripe_connect_id: string | null
          updated_at: string
          user_id: string
          vehicle_category:
            | Database["public"]["Enums"]["vehicle_category"]
            | null
          vehicle_color: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_year: number | null
          verification_status: Database["public"]["Enums"]["driver_verification_status"]
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          background_check_status?: Database["public"]["Enums"]["background_check_status"]
          background_check_url?: string | null
          cargo_capacity_lbs?: number | null
          cargo_space_cuft?: number | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          date_of_birth?: string | null
          driver_license_url?: string | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          license_plate?: string | null
          location_updated_at?: string | null
          phone?: string | null
          preferred_currency?: string
          preferred_language?: string
          profile_picture_url?: string | null
          rating?: number | null
          stripe_connect_id?: string | null
          updated_at?: string
          user_id: string
          vehicle_category?:
            | Database["public"]["Enums"]["vehicle_category"]
            | null
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          verification_status?: Database["public"]["Enums"]["driver_verification_status"]
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          background_check_status?: Database["public"]["Enums"]["background_check_status"]
          background_check_url?: string | null
          cargo_capacity_lbs?: number | null
          cargo_space_cuft?: number | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          date_of_birth?: string | null
          driver_license_url?: string | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          license_plate?: string | null
          location_updated_at?: string | null
          phone?: string | null
          preferred_currency?: string
          preferred_language?: string
          profile_picture_url?: string | null
          rating?: number | null
          stripe_connect_id?: string | null
          updated_at?: string
          user_id?: string
          vehicle_category?:
            | Database["public"]["Enums"]["vehicle_category"]
            | null
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          verification_status?: Database["public"]["Enums"]["driver_verification_status"]
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          booking_id: string
          completed_at: string | null
          completion_code: string | null
          created_at: string
          customer_rating: number | null
          driver_earnings: number
          driver_id: string
          driver_rating: number | null
          earnings_status: Database["public"]["Enums"]["earnings_status"]
          id: string
          platform_fee: number
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          stripe_transfer_id: string | null
          tip_amount: number | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          completed_at?: string | null
          completion_code?: string | null
          created_at?: string
          customer_rating?: number | null
          driver_earnings?: number
          driver_id: string
          driver_rating?: number | null
          earnings_status?: Database["public"]["Enums"]["earnings_status"]
          id?: string
          platform_fee?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          stripe_transfer_id?: string | null
          tip_amount?: number | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          completed_at?: string | null
          completion_code?: string | null
          created_at?: string
          customer_rating?: number | null
          driver_earnings?: number
          driver_id?: string
          driver_rating?: number | null
          earnings_status?: Database["public"]["Enums"]["earnings_status"]
          id?: string
          platform_fee?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          stripe_transfer_id?: string | null
          tip_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      moving_items: {
        Row: {
          category: string | null
          created_at: string
          cubic_feet: number
          display_order: number
          id: number
          item_name: string
          updated_at: string
          weight_lbs: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          cubic_feet: number
          display_order?: number
          id?: number
          item_name: string
          updated_at?: string
          weight_lbs: number
        }
        Update: {
          category?: string | null
          created_at?: string
          cubic_feet?: number
          display_order?: number
          id?: number
          item_name?: string
          updated_at?: string
          weight_lbs?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          job_id: string
          ratee_id: string
          rater_id: string
          stars: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          job_id: string
          ratee_id: string
          rater_id: string
          stars: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          job_id?: string
          ratee_id?: string
          rater_id?: string
          stars?: number
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_categories: {
        Row: {
          code: string
          created_at: string
          description: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          display_order?: number
          icon: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      customer_has_job_with_driver: {
        Args: { _customer_id: string; _driver_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      driver_within_radius: {
        Args: { _booking_id: string; _driver_id: string; _km: number }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          role: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      haversine_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      is_customer_for_job: {
        Args: { _customer_id: string; _job_id: string }
        Returns: boolean
      }
      is_driver_for_booking: {
        Args: { _booking_id: string; _driver_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "customer" | "driver" | "admin"
      background_check_status: "pending" | "approved" | "rejected"
      booking_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      driver_document_status: "pending" | "approved" | "rejected"
      driver_document_type:
        | "police_check"
        | "license"
        | "insurance"
        | "vehicle_registration"
        | "other"
      driver_verification_status: "pending" | "approved" | "rejected"
      earnings_status: "pending" | "released" | "paid_out"
      job_status:
        | "assigned"
        | "en_route"
        | "arrived"
        | "loading"
        | "in_transit"
        | "completed"
      move_size: "small" | "medium" | "large" | "xlarge"
      move_type: "local" | "intercity" | "inter-province"
      payout_status: "pending" | "processing" | "paid" | "failed"
      vehicle_category:
        | "pickup_truck"
        | "cargo_van"
        | "box_truck"
        | "moving_truck_16"
        | "suv"
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
      app_role: ["customer", "driver", "admin"],
      background_check_status: ["pending", "approved", "rejected"],
      booking_status: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      driver_document_status: ["pending", "approved", "rejected"],
      driver_document_type: [
        "police_check",
        "license",
        "insurance",
        "vehicle_registration",
        "other",
      ],
      driver_verification_status: ["pending", "approved", "rejected"],
      earnings_status: ["pending", "released", "paid_out"],
      job_status: [
        "assigned",
        "en_route",
        "arrived",
        "loading",
        "in_transit",
        "completed",
      ],
      move_size: ["small", "medium", "large", "xlarge"],
      move_type: ["local", "intercity", "inter-province"],
      payout_status: ["pending", "processing", "paid", "failed"],
      vehicle_category: [
        "pickup_truck",
        "cargo_van",
        "box_truck",
        "moving_truck_16",
        "suv",
      ],
    },
  },
} as const
