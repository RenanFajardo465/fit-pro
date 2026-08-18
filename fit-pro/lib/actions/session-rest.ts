"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type RestRow = {
  rest_started_at: string | null;
  rest_ends_at: string | null;
  paused_remaining_seconds: number | null;
};

export type RestActionResult = { error: string } | { ok: true; rest: RestRow | null };

type RestKey = { sessionId: string; groupKey: string; roundNumber: number };

async function getRestRow(
  supabase: SupabaseClient<Database>,
  key: RestKey,
  userId: string
): Promise<RestRow | null> {
  const { data } = await supabase
    .from("session_group_rest")
    .select("rest_started_at, rest_ends_at, paused_remaining_seconds")
    .eq("session_id", key.sessionId)
    .eq("group_key", key.groupKey)
    .eq("round_number", key.roundNumber)
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Inicia o descanso de uma rodada (Fase 0, seções 14-15). Upsert com
 * ignoreDuplicates (ON CONFLICT DO NOTHING no unique(session_id, group_key,
 * round_number)) — se o cliente chamar duas vezes por engano (retry após
 * queda de wifi, ou duas séries do mesmo bi-set terminando quase juntas), a
 * segunda chamada não reinicia o cronômetro; sempre devolvemos a linha
 * vigente no banco para o cliente convergir com o que realmente venceu.
 */
export async function startRest(input: RestKey & { seconds: number }): Promise<RestActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const now = new Date();
  const endsAt = new Date(now.getTime() + input.seconds * 1000);

  const { error } = await supabase.from("session_group_rest").upsert(
    {
      session_id: input.sessionId,
      user_id: user.id,
      group_key: input.groupKey,
      round_number: input.roundNumber,
      rest_started_at: now.toISOString(),
      rest_ends_at: endsAt.toISOString(),
      paused_remaining_seconds: null,
    },
    { onConflict: "session_id,group_key,round_number", ignoreDuplicates: true }
  );
  if (error) return { error: `Erro ao iniciar descanso: ${error.message}` };

  const rest = await getRestRow(supabase, input, user.id);
  return { ok: true, rest };
}

/** Pausa o descanso corrente — congela o tempo restante em vez de deixar rest_ends_at correndo. */
export async function pauseRest(input: RestKey): Promise<RestActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const row = await getRestRow(supabase, input, user.id);
  if (!row || !row.rest_ends_at) return { ok: true, rest: row };

  const remaining = Math.max(0, Math.round((new Date(row.rest_ends_at).getTime() - Date.now()) / 1000));
  const { error } = await supabase
    .from("session_group_rest")
    .update({ paused_remaining_seconds: remaining, rest_ends_at: null })
    .eq("session_id", input.sessionId)
    .eq("group_key", input.groupKey)
    .eq("round_number", input.roundNumber)
    .eq("user_id", user.id);
  if (error) return { error: `Erro ao pausar descanso: ${error.message}` };

  return { ok: true, rest: { ...row, rest_ends_at: null, paused_remaining_seconds: remaining } };
}

/** Retoma um descanso pausado — recalcula rest_ends_at a partir de agora + o que sobrava. */
export async function resumeRest(input: RestKey): Promise<RestActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const row = await getRestRow(supabase, input, user.id);
  if (!row || row.paused_remaining_seconds == null) return { ok: true, rest: row };

  const endsAt = new Date(Date.now() + row.paused_remaining_seconds * 1000).toISOString();
  const { error } = await supabase
    .from("session_group_rest")
    .update({ rest_ends_at: endsAt, paused_remaining_seconds: null })
    .eq("session_id", input.sessionId)
    .eq("group_key", input.groupKey)
    .eq("round_number", input.roundNumber)
    .eq("user_id", user.id);
  if (error) return { error: `Erro ao retomar descanso: ${error.message}` };

  return { ok: true, rest: { ...row, rest_ends_at: endsAt, paused_remaining_seconds: null } };
}

/** +15/+30: soma segundos ao tempo restante, rodando ou pausado. */
export async function adjustRest(input: RestKey & { deltaSeconds: number }): Promise<RestActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const row = await getRestRow(supabase, input, user.id);
  if (!row) return { ok: true, rest: null };

  if (row.rest_ends_at) {
    const endsAt = new Date(new Date(row.rest_ends_at).getTime() + input.deltaSeconds * 1000).toISOString();
    const { error } = await supabase
      .from("session_group_rest")
      .update({ rest_ends_at: endsAt })
      .eq("session_id", input.sessionId)
      .eq("group_key", input.groupKey)
      .eq("round_number", input.roundNumber)
      .eq("user_id", user.id);
    if (error) return { error: `Erro ao ajustar descanso: ${error.message}` };
    return { ok: true, rest: { ...row, rest_ends_at: endsAt } };
  }

  if (row.paused_remaining_seconds != null) {
    const remaining = Math.max(0, row.paused_remaining_seconds + input.deltaSeconds);
    const { error } = await supabase
      .from("session_group_rest")
      .update({ paused_remaining_seconds: remaining })
      .eq("session_id", input.sessionId)
      .eq("group_key", input.groupKey)
      .eq("round_number", input.roundNumber)
      .eq("user_id", user.id);
    if (error) return { error: `Erro ao ajustar descanso: ${error.message}` };
    return { ok: true, rest: { ...row, paused_remaining_seconds: remaining } };
  }

  return { ok: true, rest: row };
}

/** Pula o descanso — zera o tempo restante na hora, sem esperar o cronômetro chegar a 0. */
export async function skipRest(input: RestKey): Promise<RestActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada — faça login novamente." };

  const { error } = await supabase
    .from("session_group_rest")
    .update({ rest_ends_at: new Date().toISOString(), paused_remaining_seconds: null })
    .eq("session_id", input.sessionId)
    .eq("group_key", input.groupKey)
    .eq("round_number", input.roundNumber)
    .eq("user_id", user.id);
  if (error) return { error: `Erro ao pular descanso: ${error.message}` };

  return { ok: true, rest: null };
}
