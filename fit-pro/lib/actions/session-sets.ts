"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SetActionResult = { error: string } | { ok: true };

type SetValues = {
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
};

type CompleteSetInput = SetValues & {
  setId: string;
  sessionId: string;
  sessionExerciseId: string;
};

/**
 * Marca uma série como concluída — ou atualiza os valores de uma série já
 * concluída, ao reabrir para correção (mesmo endpoint para os dois casos).
 * Também atualiza a carga geral do exercício nesta sessão (general_load_kg)
 * para o último peso registrado: é esse campo que `start_workout_session`
 * lê para sugerir carga na próxima vez que o exercício aparecer (Fase 0,
 * seção 13) — sem essa atualização, a sugestão nunca refletiria o que foi
 * realmente usado, só a carga inicial prescrita no template.
 */
export async function completeSet(input: CompleteSetInput): Promise<SetActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const { error: setError } = await supabase
    .from("session_sets")
    .update({
      status: "completed",
      weight_kg: input.weightKg,
      reps: input.reps,
      duration_seconds: input.durationSeconds,
      distance_meters: input.distanceMeters,
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.setId)
    .eq("user_id", user.id);

  if (setError) return { error: `Erro ao salvar série: ${setError.message}` };

  if (input.weightKg !== null) {
    const { error: exError } = await supabase
      .from("session_exercises")
      .update({ general_load_kg: input.weightKg })
      .eq("id", input.sessionExerciseId)
      .eq("user_id", user.id);
    if (exError) return { error: `Erro ao salvar carga: ${exError.message}` };
  }

  revalidatePath(`/treino/sessao/${input.sessionId}`);
  return { ok: true };
}

/**
 * Desfaz uma série marcada por engano — volta para pending e limpa os
 * valores registrados, liberando-a de novo como a série corrente.
 */
export async function uncompleteSet(input: {
  setId: string;
  sessionId: string;
}): Promise<SetActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const { error } = await supabase
    .from("session_sets")
    .update({
      status: "pending",
      weight_kg: null,
      reps: null,
      duration_seconds: null,
      distance_meters: null,
      completed_at: null,
    })
    .eq("id", input.setId)
    .eq("user_id", user.id);

  if (error) return { error: `Erro ao desfazer série: ${error.message}` };

  revalidatePath(`/treino/sessao/${input.sessionId}`);
  return { ok: true };
}
