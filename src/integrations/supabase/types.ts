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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          changed_by_user_id: string | null
          log_id: string
          new_data_jsonb: Json | null
          old_data_jsonb: Json | null
          record_id: string
          table_name: string
          timestamp: string
        }
        Insert: {
          action: string
          changed_by_user_id?: string | null
          log_id?: string
          new_data_jsonb?: Json | null
          old_data_jsonb?: Json | null
          record_id: string
          table_name: string
          timestamp?: string
        }
        Update: {
          action?: string
          changed_by_user_id?: string | null
          log_id?: string
          new_data_jsonb?: Json | null
          old_data_jsonb?: Json | null
          record_id?: string
          table_name?: string
          timestamp?: string
        }
        Relationships: []
      }
      medical_reports: {
        Row: {
          content_jsonb: Json | null
          created_at: string
          created_by_user_id: string
          patient_id: string
          report_id: string
          signed_pdf_path: string | null
          status: string
          updated_at: string
        }
        Insert: {
          content_jsonb?: Json | null
          created_at?: string
          created_by_user_id: string
          patient_id: string
          report_id?: string
          signed_pdf_path?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          content_jsonb?: Json | null
          created_at?: string
          created_by_user_id?: string
          patient_id?: string
          report_id?: string
          signed_pdf_path?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          absenteeism_risk_score: number | null
          address_city: string | null
          address_complement: string | null
          address_district: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          behavior_score: number | null
          birth_city: string | null
          birth_date: string
          birth_state: string | null
          communication_preferences: Json | null
          cpf: string
          created_at: string | null
          email: string | null
          ethnicity: string | null
          father_name: string | null
          full_name: string
          gender: string | null
          id: string
          legacy_code: string | null
          marital_status: string | null
          mother_name: string | null
          nationality: string | null
          observations: string | null
          other_document_number: string | null
          other_document_type: string | null
          phone_primary: string
          phone_secondary: string | null
          photo_url: string | null
          profession: string | null
          race: string | null
          responsible_cpf: string | null
          responsible_name: string | null
          rg: string | null
          social_name: string | null
          updated_at: string | null
        }
        Insert: {
          absenteeism_risk_score?: number | null
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          behavior_score?: number | null
          birth_city?: string | null
          birth_date: string
          birth_state?: string | null
          communication_preferences?: Json | null
          cpf: string
          created_at?: string | null
          email?: string | null
          ethnicity?: string | null
          father_name?: string | null
          full_name: string
          gender?: string | null
          id?: string
          legacy_code?: string | null
          marital_status?: string | null
          mother_name?: string | null
          nationality?: string | null
          observations?: string | null
          other_document_number?: string | null
          other_document_type?: string | null
          phone_primary: string
          phone_secondary?: string | null
          photo_url?: string | null
          profession?: string | null
          race?: string | null
          responsible_cpf?: string | null
          responsible_name?: string | null
          rg?: string | null
          social_name?: string | null
          updated_at?: string | null
        }
        Update: {
          absenteeism_risk_score?: number | null
          address_city?: string | null
          address_complement?: string | null
          address_district?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          behavior_score?: number | null
          birth_city?: string | null
          birth_date?: string
          birth_state?: string | null
          communication_preferences?: Json | null
          cpf?: string
          created_at?: string | null
          email?: string | null
          ethnicity?: string | null
          father_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          legacy_code?: string | null
          marital_status?: string | null
          mother_name?: string | null
          nationality?: string | null
          observations?: string | null
          other_document_number?: string | null
          other_document_type?: string | null
          phone_primary?: string
          phone_secondary?: string | null
          photo_url?: string | null
          profession?: string | null
          race?: string | null
          responsible_cpf?: string | null
          responsible_name?: string | null
          rg?: string | null
          social_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
