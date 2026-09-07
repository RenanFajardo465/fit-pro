"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  selectDietForDaySchema,
  itemConsumptionSchema,
  mealConsumptionSchema,
  extraFoodLogSchema,
  type ExtraFoodLogValues,
} from "@/lib/schemas/diet-day";

export type DietDayActionResult = { error: string } | void;

/**
 * Seleciona uma dieta pra uma data (RPC `select_diet_for_day` — snapshot
 * completo da dieta pro dia, Fase 0 seção 8). Falha se o dia já tem uma
 * dieta selecionada (troca exige remover antes, `removeDietDay`).
 */
export async function selectDietForDay(
  date: string,
  dietTemplateId: string
): Promise<DietDayActionResult> {
  const parsed = selectDietForDaySchema.safeParse({ date, diet_template_id: dietTemplateId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("select_diet_for_day", {
    p_date: parsed.data.date,
    p_diet_template_id: parsed.data.diet_template_id,
  });

  if (error) {
    return { error: `Erro ao selecionar dieta: ${error.message}` };
  }

  revalidatePath(`/nutricao/diario/${date}`);
}

/** Remove a dieta selecionada de um dia (cascade cuida de refeições, itens e itens extra). */
export async function removeDietDay(dietDayId: string, date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("diet_days").delete().eq("id", dietDayId).eq("user_id", user.id);

  revalidatePath(`/nutricao/diario/${date}`);
}

/**
 * Marca/desmarca o consumo de um item, com quantidade (parcial ou total).
 * `consumedQuantity: null` desmarca. O servidor (RPC `set_item_consumption`)
 * é quem calcula os macros consumidos proporcionalmente — nunca confiamos
 * num macro vindo do cliente aqui.
 */
export async function setItemConsumption(
  itemId: string,
  consumedQuantity: number | null,
  date: string
): Promise<DietDayActionResult> {
  const parsed = itemConsumptionSchema.safeParse({ item_id: itemId, consumed_quantity: consumedQuantity });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("set_item_consumption", {
    p_item_id: parsed.data.item_id,
    p_consumed_quantity: parsed.data.consumed_quantity,
  });

  if (error) {
    return { error: `Erro ao atualizar consumo: ${error.message}` };
  }

  revalidatePath(`/nutricao/diario/${date}`);
}

/** Marca/desmarca todos os itens de uma refeição de uma vez (sempre 100% ou 0%). */
export async function setMealConsumption(
  mealId: string,
  consumed: boolean,
  date: string
): Promise<DietDayActionResult> {
  const parsed = mealConsumptionSchema.safeParse({ meal_id: mealId, consumed });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("set_meal_consumption", {
    p_diet_day_meal_id: parsed.data.meal_id,
    p_consumed: parsed.data.consumed,
  });

  if (error) {
    return { error: `Erro ao atualizar consumo: ${error.message}` };
  }

  revalidatePath(`/nutricao/diario/${date}`);
}

export async function addExtraFoodLog(
  dietDayId: string,
  values: ExtraFoodLogValues,
  date: string
): Promise<DietDayActionResult> {
  const parsed = extraFoodLogSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const v = parsed.data;
  const { error } = await supabase.from("extra_food_logs").insert({
    diet_day_id: dietDayId,
    user_id: user.id,
    source: v.source,
    food_id: v.food_id,
    recipe_id: v.recipe_id,
    name: v.name,
    quantity: v.quantity,
    calories: v.calories,
    protein_g: v.protein_g,
    carbs_g: v.carbs_g,
    fat_g: v.fat_g,
    notes: v.notes,
  });

  if (error) {
    return { error: `Erro ao adicionar item: ${error.message}` };
  }

  revalidatePath(`/nutricao/diario/${date}`);
}

export async function deleteExtraFoodLog(id: string, date: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("extra_food_logs").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath(`/nutricao/diario/${date}`);
}
