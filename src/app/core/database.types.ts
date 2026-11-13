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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          icono: string | null
          id: number
          nombre: string
        }
        Insert: {
          icono?: string | null
          id?: never
          nombre: string
        }
        Update: {
          icono?: string | null
          id?: never
          nombre?: string
        }
        Relationships: []
      }
      lista_manual: {
        Row: {
          comprado: boolean
          created_at: string
          id: number
          producto_id: number | null
          texto: string
          usuario_id: string | null
        }
        Insert: {
          comprado?: boolean
          created_at?: string
          id?: never
          producto_id?: number | null
          texto: string
          usuario_id?: string | null
        }
        Update: {
          comprado?: boolean
          created_at?: string
          id?: never
          producto_id?: number | null
          texto?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_manual_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "lista_super"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_manual_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "por_caducar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_manual_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos: {
        Row: {
          cantidad: number
          created_at: string
          id: number
          nota: string | null
          precio: number | null
          producto_id: number
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: never
          nota?: string | null
          precio?: number | null
          producto_id: number
          tipo: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: never
          nota?: string | null
          precio?: number | null
          producto_id?: number
          tipo?: Database["public"]["Enums"]["tipo_movimiento"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "lista_super"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "por_caducar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id: string
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      productos: {
        Row: {
          activo: boolean
          caduca_el: string | null
          cantidad: number
          categoria_id: number | null
          codigo_barras: string | null
          created_at: string
          id: number
          imagen_path: string | null
          marca: string | null
          minimo: number
          nombre: string
          ubicacion_id: number | null
          unidad: Database["public"]["Enums"]["unidad_medida"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          caduca_el?: string | null
          cantidad?: number
          categoria_id?: number | null
          codigo_barras?: string | null
          created_at?: string
          id?: never
          imagen_path?: string | null
          marca?: string | null
          minimo?: number
          nombre: string
          ubicacion_id?: number | null
          unidad?: Database["public"]["Enums"]["unidad_medida"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          caduca_el?: string | null
          cantidad?: number
          categoria_id?: number | null
          codigo_barras?: string | null
          created_at?: string
          id?: never
          imagen_path?: string | null
          marca?: string | null
          minimo?: number
          nombre?: string
          ubicacion_id?: number | null
          unidad?: Database["public"]["Enums"]["unidad_medida"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_ubicacion_id_fkey"
            columns: ["ubicacion_id"]
            isOneToOne: false
            referencedRelation: "ubicaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      ubicaciones: {
        Row: {
          id: number
          nombre: string
        }
        Insert: {
          id?: never
          nombre: string
        }
        Update: {
          id?: never
          nombre?: string
        }
        Relationships: []
      }
    }
    Views: {
      lista_super: {
        Row: {
          cantidad: number | null
          categoria: string | null
          id: number | null
          marca: string | null
          minimo: number | null
          nombre: string | null
          unidad: Database["public"]["Enums"]["unidad_medida"] | null
        }
        Relationships: []
      }
      por_caducar: {
        Row: {
          caduca_el: string | null
          cantidad: number | null
          dias_restantes: number | null
          id: number | null
          nombre: string | null
        }
        Insert: {
          caduca_el?: string | null
          cantidad?: number | null
          dias_restantes?: never
          id?: number | null
          nombre?: string | null
        }
        Update: {
          caduca_el?: string | null
          cantidad?: number | null
          dias_restantes?: never
          id?: number | null
          nombre?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tipo_movimiento: "compra" | "consumo" | "merma" | "ajuste"
      unidad_medida: "pieza" | "kg" | "g" | "litro" | "ml" | "paquete"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      tipo_movimiento: ["compra", "consumo", "merma", "ajuste"],
      unidad_medida: ["pieza", "kg", "g", "litro", "ml", "paquete"],
    },
  },
} as const
