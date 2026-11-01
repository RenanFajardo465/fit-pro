import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  getCompletedSetHistory,
  computePersonalRecords,
  computeWeeklyVolume,
} from "@/lib/workout/evolution";
import { getNutritionHistory } from "@/lib/nutrition/day-totals";

/**
 * Fase 6 — Exportação (Fase 0, seção 23): um único bundle JSON por
 * domínio, nomes de campo iguais às colunas do banco (pensado pra ser
 * consumido por agentes de IA depois), mais as versões em CSV (uma
 * entidade por arquivo) derivadas dos MESMOS dados, pra nunca divergir.
 *
 * Tudo lido com o cliente do próprio usuário (sujeito a RLS) — nunca
 * service_role. `peso corporal` não entra: a Fase 4 não incluiu esse
 * domínio (decisão do usuário), então não existe tabela pra exportar.
 */

export const EXPORT_VERSION = 1;

export type ExportBundle = {
  export_version: number;
  generated_at: string;
  workouts: {
    templates: Record<string, unknown>[];
    template_items: Record<string, unknown>[];
  };
  sessions: {
    workout_sessions: Record<string, unknown>[];
    session_exercises: Record<string, unknown>[];
    session_sets: Record<string, unknown>[];
  };
  personal_records: Record<string, unknown>[];
  diets: {
    diet_templates: Record<string, unknown>[];
    diet_meals: Record<string, unknown>[];
    diet_meal_items: Record<string, unknown>[];
  };
  diet_days: {
    diet_days: Record<string, unknown>[];
    diet_day_meals: Record<string, unknown>[];
    diet_day_items: Record<string, unknown>[];
    extra_food_logs: Record<string, unknown>[];
  };
  nutrition_summary: Record<string, unknown>[];
};

export async function buildExportBundle(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ExportBundle> {
  const [
    { data: templates },
    { data: templateItems },
    { data: workoutSessions },
    { data: sessionExercises },
    { data: sessionSets },
    { data: dietTemplates },
    { data: dietMeals },
    { data: dietMealItems },
    { data: dietDays },
    { data: dietDayMeals },
    { data: dietDayItems },
    { data: extraFoodLogs },
    completedSetHistory,
    nutritionHistory,
  ] = await Promise.all([
    supabase.from("workout_templates").select("*").eq("user_id", userId).is("deleted_at", null),
    supabase.from("workout_template_items").select("*").eq("user_id", userId),
    supabase.from("workout_sessions").select("*").eq("user_id", userId).order("date", { ascending: true }),
    supabase.from("session_exercises").select("*").eq("user_id", userId),
    supabase.from("session_sets").select("*").eq("user_id", userId),
    supabase.from("diet_templates").select("*").eq("user_id", userId).is("deleted_at", null),
    supabase.from("diet_meals").select("*").eq("user_id", userId),
    supabase.from("diet_meal_items").select("*").eq("user_id", userId),
    supabase.from("diet_days").select("*").eq("user_id", userId).order("date", { ascending: true }),
    supabase.from("diet_day_meals").select("*").eq("user_id", userId),
    supabase.from("diet_day_items").select("*").eq("user_id", userId),
    supabase.from("extra_food_logs").select("*").eq("user_id", userId),
    getCompletedSetHistory(supabase, userId),
    getNutritionHistory(supabase, userId),
  ]);

  const personalRecords = Array.from(computePersonalRecords(completedSetHistory).values());

  return {
    export_version: EXPORT_VERSION,
    generated_at: new Date().toISOString(),
    workouts: {
      templates: templates ?? [],
      template_items: templateItems ?? [],
    },
    sessions: {
      workout_sessions: workoutSessions ?? [],
      session_exercises: sessionExercises ?? [],
      session_sets: sessionSets ?? [],
    },
    personal_records: personalRecords,
    diets: {
      diet_templates: dietTemplates ?? [],
      diet_meals: dietMeals ?? [],
      diet_meal_items: dietMealItems ?? [],
    },
    diet_days: {
      diet_days: dietDays ?? [],
      diet_day_meals: dietDayMeals ?? [],
      diet_day_items: dietDayItems ?? [],
      extra_food_logs: extraFoodLogs ?? [],
    },
    nutrition_summary: nutritionHistory.map((d) => ({
      date: d.date,
      diet_name: d.dietName,
      diet_type: d.dietType,
      planned_calories: d.totals.plannedCalories,
      planned_protein_g: d.totals.plannedProteinG,
      planned_carbs_g: d.totals.plannedCarbsG,
      planned_fat_g: d.totals.plannedFatG,
      consumed_calories: d.totals.consumedCalories,
      consumed_protein_g: d.totals.consumedProteinG,
      consumed_carbs_g: d.totals.consumedCarbsG,
      consumed_fat_g: d.totals.consumedFatG,
    })),
  };
}

/** Volume semanal (Fase 4) reaproveitado como mais uma tabela do CSV. */
export async function buildWeeklyVolumeRows(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ week_start: string; volume_kg: number }[]> {
  const history = await getCompletedSetHistory(supabase, userId);
  return computeWeeklyVolume(history).map((v) => ({ week_start: v.weekStart, volume_kg: v.volumeKg }));
}
