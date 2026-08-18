"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exerciseSchema, type ExerciseFormValues } from "@/lib/schemas/exercise";

/**
 * Normaliza os campos de texto opcionais: string vazia vira `null` no banco
 * (em vez de gravar "" — mais fácil de checar "preenchido ou não" depois).
 */
function toNullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type ExerciseActionResult = { error: string } | void;

export async function createExercise(
  values: ExerciseFormValues
): Promise<ExerciseActionResult> {
  const parsed = exerciseSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Dados inválidos. Confira os campos destacados." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const v = parsed.data;
  const { error } = await supabase.from("exercises").insert({
    user_id: user.id,
    name: v.name,
    muscle_group: v.muscle_group,
    category: toNullable(v.category),
    metric_type: v.metric_type,
    description: toNullable(v.description),
    image_url: toNullable(v.image_url),
    gif_url: toNullable(v.gif_url),
    video_url: toNullable(v.video_url),
    external_url: toNullable(v.external_url),
    notes: toNullable(v.notes),
  });

  if (error) {
    return { error: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/treino/biblioteca");
  redirect("/treino/biblioteca");
}

export async function updateExercise(
  id: string,
  values: ExerciseFormValues
): Promise<ExerciseActionResult> {
  const parsed = exerciseSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Dados inválidos. Confira os campos destacados." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const v = parsed.data;
  // RLS já impede editar exercício de outro usuário; o filtro por user_id
  // aqui é só uma segunda barreira explícita no código.
  const { error } = await supabase
    .from("exercises")
    .update({
      name: v.name,
      muscle_group: v.muscle_group,
      category: toNullable(v.category),
      metric_type: v.metric_type,
      description: toNullable(v.description),
      image_url: toNullable(v.image_url),
      gif_url: toNullable(v.gif_url),
      video_url: toNullable(v.video_url),
      external_url: toNullable(v.external_url),
      notes: toNullable(v.notes),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/treino/biblioteca");
  redirect("/treino/biblioteca");
}

/**
 * Soft delete (Fase 0, seção 9): marca deleted_at em vez de apagar a linha.
 * A tela de Lixeira/restaurar entra na Fase 7 — por enquanto, isso só tira o
 * exercício das buscas e das telas de novo template.
 */
export async function deleteExercise(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("exercises")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/treino/biblioteca");
  redirect("/treino/biblioteca");
}
