/**
 * Tipos do banco Supabase.
 *
 * Este arquivo é escrito à mão na Fase 1 (só a tabela `profiles` existe até
 * aqui), seguindo o formato exato que `supabase gen types typescript` produz.
 * A partir da Fase 2, quando o schema crescer, gere este arquivo
 * automaticamente com:
 *
 *   npx supabase gen types typescript --project-id <seu-project-id> > lib/supabase/types.ts
 *
 * e pare de editá-lo manualmente.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
