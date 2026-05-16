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
      bookings: {
        Row: {
          base_price: number
          created_at: string
          customer_id: string
          distance_fee: number
          dropoff_address: string
          id: string
          move_size: Database["public"]["Enums"]["move_size"]
          pickup_address: string
          pickup_lat: number | null
          pickup_lng: number | null
          scheduled_at: string | null
          service_fee: number
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at: string
        }
        Insert: {
          base_price: number
          created_at?: string
          customer_id: string
          distance_fee?: number
          dropoff_address: string
          id?: string
          move_size: Database["public"]["Enums"]["move_size"]
          pickup_address: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          scheduled_at?: string | null
          service_fee: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_price: number
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          customer_id?: string
          distance_fee?: number
          dropoff_address?: string
          id?: string
          move_size?: Database["public"]["Enums"]["move_size"]
          pickup_address?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          scheduled_at?: string | null
          service_fee?: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
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
          driver_license_url: string | null
          full_name: string | null
          id: string
          is_online: boolean | null
          is_verified: boolean | null
          languages: string[] | null
          license_plate: string | null
          location_updated_at: string | null
          phone: string | null
          profile_picture_url: string | null
          rating: number | null
          updated_at: string
          user_id: string
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
          driver_license_url?: string | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          license_plate?: string | null
          location_updated_at?: string | null
          phone?: string | null
          profile_picture_url?: string | null
          rating?: number | null
          updated_at?: string
          user_id: string
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
          driver_license_url?: string | null
          full_name?: string | null
          id?: string
          is_online?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          license_plate?: string | null
          location_updated_at?: string | null
          phone?: string | null
          profile_picture_url?: string | null
          rating?: number | null
          updated_at?: string
          user_id?: string
          vehicle_color?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_year?: number | null
          verification_status?: Database["public"]["Enums"]["driver_verification_status"]
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
          driver_id: string
          driver_rating: number | null
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          tip_amount: number | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          completed_at?: string | null
          completion_code?: string | null
          created_at?: string
          customer_rating?: number | null
          driver_id: string
          driver_rating?: number | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          tip_amount?: number | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          completed_at?: string | null
          completion_code?: string | null
          created_at?: string
          customer_rating?: number | null
          driver_id?: string
          driver_rating?: number | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      driver_within_radius: {
        Args: { _booking_id: string; _driver_id: string; _km: number }
        Returns: boolean
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
      job_status:
        | "assigned"
        | "en_route"
        | "arrived"
        | "loading"
        | "in_transit"
        | "completed"
      move_size: "small" | "medium" | "large" | "xlarge"
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
      job_status: [
        "assigned",
        "en_route",
        "arrived",
        "loading",
        "in_transit",
        "completed",
      ],
      move_size: ["small", "medium", "large", "xlarge"],
    },
  },
} as const
