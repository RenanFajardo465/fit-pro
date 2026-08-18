"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SCHEDULE_MODES, AVAILABLE_RULE_TYPES, type ScheduleMode } from "@/lib/workout/vocabulary";
import type { Json } from "@/lib/supabase/types";

export type ScheduleActionResult = { error: string } | void;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function setScheduleMode(mode: string): Promise<ScheduleActionResult> {
  if (!(SCHEDULE_MODES as readonly string[]).includes(mode)) {
    return { error: "Modo inválido." };
  }
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("schedule_settings")
    .upsert({ user_id: user.id, mode: mode as ScheduleMode }, { onConflict: "user_id" });

  if (error) return { error: `Erro ao salvar: ${error.message}` };
  revalidatePath("/configuracoes/recomendacao");
  revalidatePath("/hoje");
}

/**
 * Ajuste manual do "último treino concluído" para o Modo 1. Até a Fase 3
 * (execução de treino) existir, isso é a única forma de mover a fila da
 * sequência — depois, concluir uma sessão vai fazer isso automaticamente.
 */
export async function setSequenceState(templateId: string | null): Promise<ScheduleActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("sequence_state").upsert(
    {
      user_id: user.id,
      last_completed_template_id: templateId,
      last_completed_at: templateId ? new Date().toISOString() : null,
    },
    { onConflict: "user_id" }
  );

  if (error) return { error: `Erro ao salvar: ${error.message}` };
  revalidatePath("/configuracoes/recomendacao");
  revalidatePath("/hoje");
}

export async function saveWeekdayAssignments(
  assignments: { weekday: number; template_id: string | null }[]
): Promise<ScheduleActionResult> {
  const { supabase, user } = await requireUser();

  const rows = assignments.map((a) => ({
    user_id: user.id,
    weekday: a.weekday,
    template_id: a.template_id,
  }));

  const { error } = await supabase
    .from("weekday_assignments")
    .upsert(rows, { onConflict: "user_id,weekday" });

  if (error) return { error: `Erro ao salvar: ${error.message}` };
  revalidatePath("/configuracoes/recomendacao");
  revalidatePath("/hoje");
}

export async function addScheduleRule(
  ruleType: string,
  params: Record<string, unknown>
): Promise<ScheduleActionResult> {
  if (!AVAILABLE_RULE_TYPES.includes(ruleType as (typeof AVAILABLE_RULE_TYPES)[number])) {
    return { error: "Tipo de regra inválido ou ainda não disponível." };
  }
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("schedule_rules")
    .insert({ user_id: user.id, rule_type: ruleType, params: params as Json });

  if (error) return { error: `Erro ao criar regra: ${error.message}` };
  revalidatePath("/configuracoes/recomendacao");
  revalidatePath("/hoje");
}

export async function deleteScheduleRule(id: string): Promise<ScheduleActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("schedule_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: `Erro ao remover regra: ${error.message}` };
  revalidatePath("/configuracoes/recomendacao");
  revalidatePath("/hoje");
}

/**
 * Força um treino (ou descanso, se templateId for null) numa data
 * específica — prioridade máxima sobre qualquer modo/regra (Fase 0, seção
 * 12, passo 1). Chamado pela tela de detalhe do dia no calendário.
 */
export async function setManualOverride(
  date: string,
  templateId: string | null
): Promise<ScheduleActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("manual_overrides")
    .upsert(
      { user_id: user.id, date, template_id: templateId },
      { onConflict: "user_id,date" }
    );

  if (error) return { error: `Erro ao salvar: ${error.message}` };
  revalidatePath(`/calendario/${date}`);
  revalidatePath("/calendario");
  revalidatePath("/hoje");
}

export async function clearManualOverride(date: string): Promise<ScheduleActionResult> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("manual_overrides")
    .delete()
    .eq("user_id", user.id)
    .eq("date", date);

  if (error) return { error: `Erro ao remover: ${error.message}` };
  revalidatePath(`/calendario/${date}`);
  revalidatePath("/calendario");
  revalidatePath("/hoje");
}
