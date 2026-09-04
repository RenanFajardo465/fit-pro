"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ScheduleActionResult = { error: string } | void;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Ajuste manual do "último treino concluído" da fila sequencial. Ao
 * finalizar uma sessão (`finish_workout_session`), a fila já avança
 * sozinha — isto aqui serve só para corrigir manualmente se precisar
 * (ex.: pular um treino sem executá-lo, ou zerar a fila).
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
  revalidatePath("/treino");
}
