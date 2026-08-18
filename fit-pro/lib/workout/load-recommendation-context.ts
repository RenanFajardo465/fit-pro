import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { ScheduleMode } from "@/lib/workout/vocabulary";
import type { ScheduleRule, ExternalActivityRef } from "@/lib/workout/recommendation";

export type RecommendationContext = {
  mode: ScheduleMode;
  templatesInOrder: { id: string; code: string; name: string }[];
  sequenceState: { last_completed_template_id: string | null } | null;
  weekdayAssignments: Map<number, string | null>;
  rules: ScheduleRule[];
  activities: (ExternalActivityRef & {
    name: string;
    time_of_day: string | null;
    duration_minutes: number | null;
  })[];
  templateMuscleGroups: Map<string, Set<string>>;
};

/**
 * Carrega tudo que o motor de recomendação (`resolveWorkoutForDate`)
 * precisa, exceto o override manual (que é por data — cada tela busca só
 * a(s) data(s) que precisa). Usado por Hoje, Calendário e o detalhe de
 * dia do calendário, para não repetir a mesma bateria de queries em cada
 * página.
 */
export async function loadRecommendationContext(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<RecommendationContext> {
  const [
    { data: settings },
    { data: templates },
    { data: sequenceState },
    { data: weekdayRows },
    { data: rules },
    { data: activities },
    { data: itemsWithMuscle },
  ] = await Promise.all([
    supabase.from("schedule_settings").select("mode").eq("user_id", userId).maybeSingle(),
    supabase
      .from("workout_templates")
      .select("id, code, name")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("code", { ascending: true }),
    supabase
      .from("sequence_state")
      .select("last_completed_template_id")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("weekday_assignments").select("weekday, template_id").eq("user_id", userId),
    supabase.from("schedule_rules").select("rule_type, params").eq("user_id", userId),
    supabase
      .from("external_activities")
      .select("id, name, weekday, date, time_of_day, duration_minutes")
      .eq("user_id", userId),
    supabase
      .from("workout_template_items")
      .select("template_id, exercises(muscle_group)")
      .eq("user_id", userId),
  ]);

  const weekdayAssignments = new Map<number, string | null>();
  for (const row of weekdayRows ?? []) weekdayAssignments.set(row.weekday, row.template_id);

  const templateMuscleGroups = new Map<string, Set<string>>();
  for (const item of itemsWithMuscle ?? []) {
    const muscleGroup = item.exercises?.muscle_group;
    if (!muscleGroup) continue;
    if (!templateMuscleGroups.has(item.template_id)) {
      templateMuscleGroups.set(item.template_id, new Set());
    }
    templateMuscleGroups.get(item.template_id)!.add(muscleGroup);
  }

  return {
    mode: (settings?.mode as ScheduleMode) ?? "sequence",
    templatesInOrder: templates ?? [],
    sequenceState: sequenceState ?? null,
    weekdayAssignments,
    rules: (rules ?? []) as ScheduleRule[],
    activities: activities ?? [],
    templateMuscleGroups,
  };
}
