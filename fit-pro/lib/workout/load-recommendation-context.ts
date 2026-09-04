import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type RecommendationContext = {
  templatesInOrder: { id: string; code: string; name: string }[];
  sequenceState: { last_completed_template_id: string | null } | null;
};

/**
 * Carrega tudo que o motor de recomendação (`resolveNextWorkout`) precisa:
 * os templates ativos, na ordem da fila, e o estado atual dela. Usado por
 * Hoje, Treino e a tela de ajuste manual da fila, para não repetir as
 * mesmas duas queries em cada página.
 */
export async function loadRecommendationContext(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<RecommendationContext> {
  const [{ data: templates }, { data: sequenceState }] = await Promise.all([
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
  ]);

  return {
    templatesInOrder: templates ?? [],
    sequenceState: sequenceState ?? null,
  };
}
