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
      exercises: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          muscle_group: string;
          category: string | null;
          metric_type: string;
          description: string | null;
          image_url: string | null;
          gif_url: string | null;
          video_url: string | null;
          external_url: string | null;
          notes: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          muscle_group: string;
          category?: string | null;
          metric_type: string;
          description?: string | null;
          image_url?: string | null;
          gif_url?: string | null;
          video_url?: string | null;
          external_url?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          muscle_group?: string;
          category?: string | null;
          metric_type?: string;
          description?: string | null;
          image_url?: string | null;
          gif_url?: string | null;
          video_url?: string | null;
          external_url?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          code: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          code: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          code?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_template_items: {
        Row: {
          id: string;
          template_id: string;
          user_id: string;
          order_index: number;
          group_type: string;
          group_id: string | null;
          group_order: number | null;
          exercise_id: string | null;
          sets: number;
          reps_min: number | null;
          reps_max: number | null;
          duration_target_seconds: number | null;
          distance_target_meters: number | null;
          initial_load_kg: number | null;
          unit: string;
          rest_seconds: number;
          technique: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          user_id: string;
          order_index: number;
          group_type?: string;
          group_id?: string | null;
          group_order?: number | null;
          exercise_id?: string | null;
          sets: number;
          reps_min?: number | null;
          reps_max?: number | null;
          duration_target_seconds?: number | null;
          distance_target_meters?: number | null;
          initial_load_kg?: number | null;
          unit?: string;
          rest_seconds?: number;
          technique?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          user_id?: string;
          order_index?: number;
          group_type?: string;
          group_id?: string | null;
          group_order?: number | null;
          exercise_id?: string | null;
          sets?: number;
          reps_min?: number | null;
          reps_max?: number | null;
          duration_target_seconds?: number | null;
          distance_target_meters?: number | null;
          initial_load_kg?: number | null;
          unit?: string;
          rest_seconds?: number;
          technique?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_template_items_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_template_items_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "workout_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      csv_import_batches: {
        Row: {
          id: string;
          user_id: string;
          file_name: string | null;
          workouts_count: number;
          items_count: number;
          exercises_created_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name?: string | null;
          workouts_count?: number;
          items_count?: number;
          exercises_created_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string | null;
          workouts_count?: number;
          items_count?: number;
          exercises_created_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      schedule_settings: {
        Row: { user_id: string; mode: string; updated_at: string };
        Insert: { user_id: string; mode?: string; updated_at?: string };
        Update: { user_id?: string; mode?: string; updated_at?: string };
        Relationships: [];
      };
      sequence_state: {
        Row: {
          user_id: string;
          last_completed_template_id: string | null;
          last_completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          last_completed_template_id?: string | null;
          last_completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          last_completed_template_id?: string | null;
          last_completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sequence_state_last_completed_template_id_fkey";
            columns: ["last_completed_template_id"];
            isOneToOne: false;
            referencedRelation: "workout_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      weekday_assignments: {
        Row: { id: string; user_id: string; weekday: number; template_id: string | null };
        Insert: {
          id?: string;
          user_id: string;
          weekday: number;
          template_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          weekday?: number;
          template_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "weekday_assignments_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "workout_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_rules: {
        Row: { id: string; user_id: string; rule_type: string; params: Json; created_at: string };
        Insert: {
          id?: string;
          user_id: string;
          rule_type: string;
          params?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          rule_type?: string;
          params?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      manual_overrides: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          template_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          template_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          template_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "manual_overrides_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "workout_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      external_activities: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          weekday: number | null;
          date: string | null;
          time_of_day: string | null;
          duration_minutes: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          weekday?: number | null;
          date?: string | null;
          time_of_day?: string | null;
          duration_minutes?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          weekday?: number | null;
          date?: string | null;
          time_of_day?: string | null;
          duration_minutes?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          template_id: string | null;
          template_name: string;
          date: string;
          started_at: string;
          finished_at: string | null;
          status: string;
          active_exercise_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          template_id?: string | null;
          template_name: string;
          date: string;
          started_at?: string;
          finished_at?: string | null;
          status?: string;
          active_exercise_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          template_id?: string | null;
          template_name?: string;
          date?: string;
          started_at?: string;
          finished_at?: string | null;
          status?: string;
          active_exercise_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "workout_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sessions_active_exercise_id_fkey";
            columns: ["active_exercise_id"];
            isOneToOne: false;
            referencedRelation: "session_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      session_exercises: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          exercise_id: string | null;
          exercise_name: string;
          muscle_group: string;
          metric_type: string;
          order_index: number;
          group_type: string;
          group_id: string | null;
          group_order: number | null;
          sets: number;
          reps_min: number | null;
          reps_max: number | null;
          duration_target_seconds: number | null;
          distance_target_meters: number | null;
          initial_load_kg: number | null;
          general_load_kg: number | null;
          rest_seconds: number;
          technique: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          exercise_id?: string | null;
          exercise_name: string;
          muscle_group: string;
          metric_type: string;
          order_index: number;
          group_type?: string;
          group_id?: string | null;
          group_order?: number | null;
          sets: number;
          reps_min?: number | null;
          reps_max?: number | null;
          duration_target_seconds?: number | null;
          distance_target_meters?: number | null;
          initial_load_kg?: number | null;
          general_load_kg?: number | null;
          rest_seconds?: number;
          technique?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          exercise_id?: string | null;
          exercise_name?: string;
          muscle_group?: string;
          metric_type?: string;
          order_index?: number;
          group_type?: string;
          group_id?: string | null;
          group_order?: number | null;
          sets?: number;
          reps_min?: number | null;
          reps_max?: number | null;
          duration_target_seconds?: number | null;
          distance_target_meters?: number | null;
          initial_load_kg?: number | null;
          general_load_kg?: number | null;
          rest_seconds?: number;
          technique?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_exercises_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      session_sets: {
        Row: {
          id: string;
          session_exercise_id: string;
          user_id: string;
          set_number: number;
          status: string;
          weight_kg: number | null;
          reps: number | null;
          duration_seconds: number | null;
          distance_meters: number | null;
          completed_at: string | null;
          client_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_exercise_id: string;
          user_id: string;
          set_number: number;
          status?: string;
          weight_kg?: number | null;
          reps?: number | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          completed_at?: string | null;
          client_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_exercise_id?: string;
          user_id?: string;
          set_number?: number;
          status?: string;
          weight_kg?: number | null;
          reps?: number | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          completed_at?: string | null;
          client_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_sets_session_exercise_id_fkey";
            columns: ["session_exercise_id"];
            isOneToOne: false;
            referencedRelation: "session_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      session_group_rest: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          group_key: string;
          round_number: number;
          rest_started_at: string | null;
          rest_ends_at: string | null;
          paused_remaining_seconds: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          group_key: string;
          round_number: number;
          rest_started_at?: string | null;
          rest_ends_at?: string | null;
          paused_remaining_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          group_key?: string;
          round_number?: number;
          rest_started_at?: string | null;
          rest_ends_at?: string | null;
          paused_remaining_seconds?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_group_rest_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      foods: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          brand: string | null;
          serving_quantity: number;
          serving_unit: string;
          grams_equivalent: number;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          brand?: string | null;
          serving_quantity: number;
          serving_unit: string;
          grams_equivalent: number;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          brand?: string | null;
          serving_quantity?: number;
          serving_unit?: string;
          grams_equivalent?: number;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          servings: number;
          computed_calories: number;
          computed_protein_g: number;
          computed_carbs_g: number;
          computed_fat_g: number;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          servings?: number;
          computed_calories?: number;
          computed_protein_g?: number;
          computed_carbs_g?: number;
          computed_fat_g?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          servings?: number;
          computed_calories?: number;
          computed_protein_g?: number;
          computed_carbs_g?: number;
          computed_fat_g?: number;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipe_items: {
        Row: {
          id: string;
          recipe_id: string;
          user_id: string;
          order_index: number;
          food_id: string | null;
          food_name: string;
          quantity_servings: number;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          user_id: string;
          order_index: number;
          food_id?: string | null;
          food_name: string;
          quantity_servings: number;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          user_id?: string;
          order_index?: number;
          food_id?: string | null;
          food_name?: string;
          quantity_servings?: number;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_items_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_items_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      diet_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          code: string;
          diet_type: string;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          code: string;
          diet_type: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          code?: string;
          diet_type?: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      diet_meals: {
        Row: {
          id: string;
          diet_template_id: string;
          user_id: string;
          order_index: number;
          name: string;
          meal_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          diet_template_id: string;
          user_id: string;
          order_index: number;
          name: string;
          meal_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          diet_template_id?: string;
          user_id?: string;
          order_index?: number;
          name?: string;
          meal_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diet_meals_diet_template_id_fkey";
            columns: ["diet_template_id"];
            isOneToOne: false;
            referencedRelation: "diet_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      diet_meal_items: {
        Row: {
          id: string;
          diet_meal_id: string;
          user_id: string;
          order_index: number;
          food_id: string | null;
          food_name: string;
          quantity: number;
          unit: string;
          grams_equivalent: number;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          diet_meal_id: string;
          user_id: string;
          order_index: number;
          food_id?: string | null;
          food_name: string;
          quantity: number;
          unit: string;
          grams_equivalent: number;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          diet_meal_id?: string;
          user_id?: string;
          order_index?: number;
          food_id?: string | null;
          food_name?: string;
          quantity?: number;
          unit?: string;
          grams_equivalent?: number;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diet_meal_items_diet_meal_id_fkey";
            columns: ["diet_meal_id"];
            isOneToOne: false;
            referencedRelation: "diet_meals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diet_meal_items_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      diet_days: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          diet_template_id: string | null;
          diet_name: string;
          diet_type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          diet_template_id?: string | null;
          diet_name: string;
          diet_type: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          diet_template_id?: string | null;
          diet_name?: string;
          diet_type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      diet_day_meals: {
        Row: {
          id: string;
          diet_day_id: string;
          user_id: string;
          order_index: number;
          name: string;
          meal_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          diet_day_id: string;
          user_id: string;
          order_index: number;
          name: string;
          meal_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          diet_day_id?: string;
          user_id?: string;
          order_index?: number;
          name?: string;
          meal_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diet_day_meals_diet_day_id_fkey";
            columns: ["diet_day_id"];
            isOneToOne: false;
            referencedRelation: "diet_days";
            referencedColumns: ["id"];
          },
        ];
      };
      diet_day_items: {
        Row: {
          id: string;
          diet_day_meal_id: string;
          user_id: string;
          order_index: number;
          food_id: string | null;
          food_name: string;
          quantity: number;
          unit: string;
          grams_equivalent: number;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          notes: string | null;
          consumed_quantity: number | null;
          consumed_at: string | null;
          consumed_calories: number | null;
          consumed_protein_g: number | null;
          consumed_carbs_g: number | null;
          consumed_fat_g: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          diet_day_meal_id: string;
          user_id: string;
          order_index: number;
          food_id?: string | null;
          food_name: string;
          quantity: number;
          unit: string;
          grams_equivalent: number;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          notes?: string | null;
          consumed_quantity?: number | null;
          consumed_at?: string | null;
          consumed_calories?: number | null;
          consumed_protein_g?: number | null;
          consumed_carbs_g?: number | null;
          consumed_fat_g?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          diet_day_meal_id?: string;
          user_id?: string;
          order_index?: number;
          food_id?: string | null;
          food_name?: string;
          quantity?: number;
          unit?: string;
          grams_equivalent?: number;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          notes?: string | null;
          consumed_quantity?: number | null;
          consumed_at?: string | null;
          consumed_calories?: number | null;
          consumed_protein_g?: number | null;
          consumed_carbs_g?: number | null;
          consumed_fat_g?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diet_day_items_diet_day_meal_id_fkey";
            columns: ["diet_day_meal_id"];
            isOneToOne: false;
            referencedRelation: "diet_day_meals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diet_day_items_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
        ];
      };
      extra_food_logs: {
        Row: {
          id: string;
          diet_day_id: string;
          user_id: string;
          source: string;
          food_id: string | null;
          recipe_id: string | null;
          name: string;
          quantity: number;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          notes: string | null;
          logged_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          diet_day_id: string;
          user_id: string;
          source: string;
          food_id?: string | null;
          recipe_id?: string | null;
          name: string;
          quantity?: number;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          notes?: string | null;
          logged_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          diet_day_id?: string;
          user_id?: string;
          source?: string;
          food_id?: string | null;
          recipe_id?: string | null;
          name?: string;
          quantity?: number;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          notes?: string | null;
          logged_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "extra_food_logs_diet_day_id_fkey";
            columns: ["diet_day_id"];
            isOneToOne: false;
            referencedRelation: "diet_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extra_food_logs_food_id_fkey";
            columns: ["food_id"];
            isOneToOne: false;
            referencedRelation: "foods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "extra_food_logs_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      replace_template_items: {
        Args: { p_template_id: string; p_items: Json };
        Returns: undefined;
      };
      import_workout_csv: {
        Args: { p_file_name: string; p_workouts: Json };
        Returns: Json;
      };
      start_workout_session: {
        Args: { p_template_id: string; p_date: string };
        Returns: string;
      };
      abandon_workout_session: {
        Args: { p_session_id: string };
        Returns: undefined;
      };
      finish_workout_session: {
        Args: { p_session_id: string };
        Returns: undefined;
      };
      replace_recipe_items: {
        Args: { p_recipe_id: string; p_servings: number; p_items: Json };
        Returns: undefined;
      };
      replace_diet_meals: {
        Args: { p_diet_template_id: string; p_meals: Json };
        Returns: undefined;
      };
      select_diet_for_day: {
        Args: { p_date: string; p_diet_template_id: string };
        Returns: string;
      };
      set_item_consumption: {
        Args: { p_item_id: string; p_consumed_quantity: number | null };
        Returns: undefined;
      };
      set_meal_consumption: {
        Args: { p_diet_day_meal_id: string; p_consumed: boolean };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
