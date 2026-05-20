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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      actividades: {
        Row: {
          created_at: string
          descripcion: string | null
          duracion: string | null
          estado: string
          fecha: string | null
          hora: string | null
          id: string
          imagen_url: string | null
          intensidad: string | null
          nombre: string
          orden: number | null
          rating: number | null
          reviews: number | null
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          duracion?: string | null
          estado?: string
          fecha?: string | null
          hora?: string | null
          id?: string
          imagen_url?: string | null
          intensidad?: string | null
          nombre: string
          orden?: number | null
          rating?: number | null
          reviews?: number | null
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          duracion?: string | null
          estado?: string
          fecha?: string | null
          hora?: string | null
          id?: string
          imagen_url?: string | null
          intensidad?: string | null
          nombre?: string
          orden?: number | null
          rating?: number | null
          reviews?: number | null
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      atracciones: {
        Row: {
          accent: string | null
          badge: string | null
          created_at: string
          descripcion: string | null
          duracion: string | null
          edad_min: number | null
          estado: string
          id: string
          imagen_url: string | null
          intensidad: string | null
          nombre: string
          orden: number | null
          rating: number | null
          reviews: number | null
          tags: Json | null
          ubicacion: string | null
          updated_at: string
        }
        Insert: {
          accent?: string | null
          badge?: string | null
          created_at?: string
          descripcion?: string | null
          duracion?: string | null
          edad_min?: number | null
          estado?: string
          id?: string
          imagen_url?: string | null
          intensidad?: string | null
          nombre: string
          orden?: number | null
          rating?: number | null
          reviews?: number | null
          tags?: Json | null
          ubicacion?: string | null
          updated_at?: string
        }
        Update: {
          accent?: string | null
          badge?: string | null
          created_at?: string
          descripcion?: string | null
          duracion?: string | null
          edad_min?: number | null
          estado?: string
          id?: string
          imagen_url?: string | null
          intensidad?: string | null
          nombre?: string
          orden?: number | null
          rating?: number | null
          reviews?: number | null
          tags?: Json | null
          ubicacion?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      codigos_qr: {
        Row: {
          compra_id: string
          created_at: string
          id: string
          usado: boolean
          usado_at: string | null
          usado_por: string | null
          uuid_code: string
        }
        Insert: {
          compra_id: string
          created_at?: string
          id?: string
          usado?: boolean
          usado_at?: string | null
          usado_por?: string | null
          uuid_code?: string
        }
        Update: {
          compra_id?: string
          created_at?: string
          id?: string
          usado?: boolean
          usado_at?: string | null
          usado_por?: string | null
          uuid_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "codigos_qr_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          cantidad: number
          created_at: string
          estado_pago: string
          evento_id: string | null
          id: string
          mp_payment_id: string | null
          tipo_entrada_id: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          estado_pago?: string
          evento_id?: string | null
          id?: string
          mp_payment_id?: string | null
          tipo_entrada_id?: string | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          estado_pago?: string
          evento_id?: string | null
          id?: string
          mp_payment_id?: string | null
          tipo_entrada_id?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_tipo_entrada_id_fkey"
            columns: ["tipo_entrada_id"]
            isOneToOne: false
            referencedRelation: "tipos_entrada"
            referencedColumns: ["id"]
          },
        ]
      }
      contenido_web: {
        Row: {
          clave: string
          created_at: string
          id: string
          tipo: string
          updated_at: string
          valor: string
        }
        Insert: {
          clave: string
          created_at?: string
          id?: string
          tipo?: string
          updated_at?: string
          valor?: string
        }
        Update: {
          clave?: string
          created_at?: string
          id?: string
          tipo?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          created_at: string
          descripcion: string | null
          edicion: string | null
          emoji: string | null
          estado: string
          fecha: string | null
          gradiente: string | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          imagen_url: string | null
          nombre: string
          precio: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          edicion?: string | null
          emoji?: string | null
          estado?: string
          fecha?: string | null
          gradiente?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          imagen_url?: string | null
          nombre: string
          precio?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          edicion?: string | null
          emoji?: string | null
          estado?: string
          fecha?: string | null
          gradiente?: string | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          imagen_url?: string | null
          nombre?: string
          precio?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          accent: string
          created_at: string
          cta_text: string
          estado: string
          id: string
          image_url: string
          location: string
          orden: number
          rating: number
          subtitle: string
          tag: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          accent?: string
          created_at?: string
          cta_text?: string
          estado?: string
          id?: string
          image_url?: string
          location?: string
          orden?: number
          rating?: number
          subtitle?: string
          tag?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          accent?: string
          created_at?: string
          cta_text?: string
          estado?: string
          id?: string
          image_url?: string
          location?: string
          orden?: number
          rating?: number
          subtitle?: string
          tag?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          apellido: string
          created_at: string
          email: string
          id: string
          nombre: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          apellido?: string
          created_at?: string
          email?: string
          id: string
          nombre?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          apellido?: string
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      tipos_entrada: {
        Row: {
          created_at: string
          emoji: string | null
          estado: string
          features: Json | null
          highlight: boolean | null
          id: string
          nombre: string
          precio_finde: number
          precio_semana: number
          tag: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          estado?: string
          features?: Json | null
          highlight?: boolean | null
          id?: string
          nombre: string
          precio_finde?: number
          precio_semana?: number
          tag?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          estado?: string
          features?: Json | null
          highlight?: boolean | null
          id?: string
          nombre?: string
          precio_finde?: number
          precio_semana?: number
          tag?: string | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "control_entradas"
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
      app_role: ["admin", "editor", "control_entradas"],
    },
  },
} as const
