"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  recipeMetaSchema,
  recipeItemsPayloadSchema,
  type RecipeMetaValues,
  type RecipeItemsPayload,
} from "@/lib/schemas/recipe";

export type RecipeActionResult = { error: string } | void;

export async function createRecipe(values: RecipeMetaValues): Promise<RecipeActionResult> {
  const parsed = recipeMetaSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("recipes")
    .insert({ user_id: user.id, name: parsed.data.name })
    .select("id")
    .single();

  if (error) {
    return { error: `Erro ao criar: ${error.message}` };
  }

  revalidatePath("/nutricao/receitas");
  redirect(`/nutricao/receitas/${data.id}`);
}

export async function updateRecipeMeta(
  id: string,
  values: RecipeMetaValues
): Promise<RecipeActionResult> {
  const parsed = recipeMetaSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("recipes")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/nutricao/receitas");
  revalidatePath(`/nutricao/receitas/${id}`);
}

export async function deleteRecipe(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("recipes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/nutricao/receitas");
  redirect("/nutricao/receitas");
}

/**
 * Substitui todos os itens de uma receita de uma vez e recongela os totais
 * por porção (Fase 0, seção 11/22 — mesma estratégia transacional de
 * saveTemplateItems). O editor mantém tudo em estado local até o usuário
 * tocar em "Salvar"; só então isso é chamado.
 */
export async function saveRecipeItems(
  recipeId: string,
  payload: RecipeItemsPayload
): Promise<RecipeActionResult> {
  const parsed = recipeItemsPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("replace_recipe_items", {
    p_recipe_id: recipeId,
    p_servings: parsed.data.servings,
    p_items: parsed.data.items,
  });

  if (error) {
    return { error: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath(`/nutricao/receitas/${recipeId}`);
  revalidatePath("/nutricao/receitas");
}
