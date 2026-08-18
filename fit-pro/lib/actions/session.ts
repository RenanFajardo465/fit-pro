"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAppToday } from "@/lib/date/today";

export type SessionActionResult = { error: string } | void;

/**
 * Inicia uma sessão a partir de um template (RPC transacional
 * `start_workout_session` — snapshot completo, Fase 0 seção 8). Redireciona
 * para a tela de execução assim que a sessão existe.
 */
export async function startWorkoutSession(templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { date } = getAppToday();

  const { data: sessionId, error } = await supabase.rpc("start_workout_session", {
    p_template_id: templateId,
    p_date: date,
  });

  if (error) {
    return { error: `Erro ao iniciar treino: ${error.message}` };
  }

  revalidatePath("/treino");
  revalidatePath("/hoje");
  redirect(`/treino/sessao/${sessionId}`);
}

export async function abandonWorkoutSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("abandon_workout_session", { p_session_id: sessionId });

  if (error) {
    return { error: `Erro ao abandonar treino: ${error.message}` };
  }

  revalidatePath("/treino");
  revalidatePath("/hoje");
  redirect("/treino");
}

/**
 * Finaliza a sessão em andamento (RPC `finish_workout_session`): séries
 * pendentes viram 'skipped', status vira 'completed'. Cálculos de
 * progresso/volume/PR e a tela de resumo pós-treino chegam no Incremento 4
 * — por enquanto isso só encerra a sessão de forma limpa.
 */
export async function finishWorkoutSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("finish_workout_session", { p_session_id: sessionId });

  if (error) {
    return { error: `Erro ao finalizar treino: ${error.message}` };
  }

  revalidatePath("/treino");
  revalidatePath("/hoje");
  revalidatePath(`/treino/sessao/${sessionId}`);
  redirect("/treino");
}
