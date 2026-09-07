"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  dietTemplateMetaSchema,
  dietMealsPayloadSchema,
  type DietTemplateMetaValues,
  type DietMealValues,
} from "@/lib/schemas/diet-template";

export type DietTemplateActionResult = { error: string } | void;

export async function createDietTemplate(
  values: DietTemplateMetaValues
): Promise<DietTemplateActionResult> {
  const parsed = dietTemplateMetaSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("diet_templates")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      code: parsed.data.code,
      diet_type: parsed.data.diet_type,
    })
    .select("id")
    .single();

  if (error) {
    const message = error.code === "23505" ? "Já existe uma dieta com esse código." : error.message;
    return { error: `Erro ao criar: ${message}` };
  }

  revalidatePath("/nutricao/dietas");
  redirect(`/nutricao/dietas/${data.id}`);
}

export async function updateDietTemplateMeta(
  id: string,
  values: DietTemplateMetaValues
): Promise<DietTemplateActionResult> {
  const parsed = dietTemplateMetaSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("diet_templates")
    .update({
      name: parsed.data.name,
      code: parsed.data.code,
      diet_type: parsed.data.diet_type,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    const message = error.code === "23505" ? "Já existe uma dieta com esse código." : error.message;
    return { error: `Erro ao salvar: ${message}` };
  }

  revalidatePath("/nutricao/dietas");
  revalidatePath(`/nutricao/dietas/${id}`);
}

export async function deleteDietTemplate(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("diet_templates")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/nutricao/dietas");
  redirect("/nutricao/dietas");
}

/**
 * Substitui todas as refeições (e itens) de uma dieta de uma vez (Fase 0,
 * seção 11/22 — mesma estratégia transacional de saveTemplateItems /
 * saveRecipeItems). O editor mantém tudo em estado local até o usuário
 * tocar em "Salvar"; só então isso é chamado.
 */
export async function saveDietMeals(
  dietTemplateId: string,
  meals: DietMealValues[]
): Promise<DietTemplateActionResult> {
  const parsed = dietMealsPayloadSchema.safeParse(meals);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("replace_diet_meals", {
    p_diet_template_id: dietTemplateId,
    p_meals: parsed.data,
  });

  if (error) {
    return { error: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath(`/nutricao/dietas/${dietTemplateId}`);
  revalidatePath("/nutricao/dietas");
}
