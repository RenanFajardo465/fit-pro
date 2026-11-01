"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exerciseSchema, type ExerciseFormValues } from "@/lib/schemas/exercise";
import { EXERCISE_CATALOG_SEED } from "@/lib/workout/exercise-catalog-seed";

/**
 * Normaliza os campos de texto opcionais: string vazia vira `null` no banco
 * (em vez de gravar "" — mais fácil de checar "preenchido ou não" depois).
 */
function toNullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Mesma ideia, pros campos de enum opcional (equipment, grip_type etc.) — "" vira null. */
function toNullableEnum<T extends string>(value: T | "" | undefined): T | null {
  return value ? value : null;
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
  const { data: inserted, error } = await supabase
    .from("exercises")
    .insert({
      user_id: user.id,
      name: v.name,
      muscle_group: v.muscle_group,
      secondary_muscle_groups: v.secondary_muscle_groups?.length ? v.secondary_muscle_groups : null,
      category: toNullable(v.category),
      metric_type: v.metric_type,
      equipment: toNullableEnum(v.equipment),
      movement_pattern: toNullableEnum(v.movement_pattern),
      grip_type: toNullableEnum(v.grip_type),
      position_variant: toNullableEnum(v.position_variant),
      is_unilateral: v.is_unilateral ?? null,
      description: toNullable(v.description),
      image_url: toNullable(v.image_url),
      gif_url: toNullable(v.gif_url),
      video_url: toNullable(v.video_url),
      external_url: toNullable(v.external_url),
      notes: toNullable(v.notes),
    })
    .select("id")
    .single();

  if (error) {
    // O trigger de duplicata (migration 0019) chega aqui como mensagem de
    // erro comum do Postgres — já vem pronta em português, sem precisar de
    // tratamento especial (ex.: "Já existe um exercício com esse nome...").
    return { error: `Erro ao salvar: ${error.message}` };
  }

  if (v.aliases?.length) {
    const { error: aliasError } = await supabase.rpc("replace_exercise_aliases", {
      p_exercise_id: inserted.id,
      p_aliases: v.aliases,
    });
    if (aliasError) {
      return { error: `Exercício criado, mas houve erro ao salvar os sinônimos: ${aliasError.message}` };
    }
  }

  revalidatePath("/treino/biblioteca");
  redirect("/treino/biblioteca");
}

/**
 * Catálogo Inteligente, seção 5: antes de criar um exercício, consulta
 * correspondências exatas (própria query aqui, normalização igual à do
 * banco) e parecidas (RPC `find_similar_exercises`, trigrama) — pra
 * sugerir usar o existente em vez de duplicar. Nunca funde nada sozinho,
 * só devolve candidatos pro formulário mostrar.
 */
export type ExerciseDuplicateCandidate = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string | null;
  similarity: number;
};

export async function findSimilarExercises(name: string): Promise<ExerciseDuplicateCandidate[]> {
  if (!name.trim()) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.rpc("find_similar_exercises", {
    p_name: name,
    p_threshold: 0.35,
  });
  if (error || !data) return [];
  return data;
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
      secondary_muscle_groups: v.secondary_muscle_groups?.length ? v.secondary_muscle_groups : null,
      category: toNullable(v.category),
      metric_type: v.metric_type,
      equipment: toNullableEnum(v.equipment),
      movement_pattern: toNullableEnum(v.movement_pattern),
      grip_type: toNullableEnum(v.grip_type),
      position_variant: toNullableEnum(v.position_variant),
      is_unilateral: v.is_unilateral ?? null,
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

  const { error: aliasError } = await supabase.rpc("replace_exercise_aliases", {
    p_exercise_id: id,
    p_aliases: v.aliases ?? [],
  });
  if (aliasError) {
    return { error: `Exercício salvo, mas houve erro ao atualizar os sinônimos: ${aliasError.message}` };
  }

  revalidatePath("/treino/biblioteca");
  redirect("/treino/biblioteca");
}

/**
 * Catálogo Inteligente, seção 8: importação opt-in do catálogo inicial
 * semeado (`EXERCISE_CATALOG_SEED`) pra biblioteca do próprio usuário. Insere
 * um de cada vez (não em lote único) — assim, se um item colidir com algo
 * que o usuário já tem (bloqueado pelo trigger de duplicata da migration
 * 0019), só aquele item é pulado, o resto continua sendo importado
 * normalmente. Nunca força nada: o usuário escolhe quais ids importar.
 */
export type ImportCatalogSeedResult = {
  created: number;
  skipped: { name: string; reason: string }[];
};

export async function importExerciseCatalogSeed(
  selectedIds: string[]
): Promise<ImportCatalogSeedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const selected = EXERCISE_CATALOG_SEED.filter((item) => selectedIds.includes(item.id));

  const result: ImportCatalogSeedResult = { created: 0, skipped: [] };

  for (const item of selected) {
    const { error } = await supabase.from("exercises").insert({
      user_id: user.id,
      name: item.name,
      muscle_group: item.muscle_group,
      metric_type: item.metric_type,
      equipment: item.equipment ?? null,
      movement_pattern: item.movement_pattern ?? null,
      grip_type: item.grip_type ?? null,
      position_variant: item.position_variant ?? null,
      is_unilateral: item.is_unilateral ?? null,
    });

    if (error) {
      // Erro mais comum aqui é o trigger de duplicata (nome já existe como
      // exercício ou sinônimo do próprio usuário) — pula e segue o lote.
      result.skipped.push({ name: item.name, reason: error.message });
    } else {
      result.created += 1;
    }
  }

  if (result.created > 0) {
    revalidatePath("/treino/biblioteca");
  }

  return result;
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
