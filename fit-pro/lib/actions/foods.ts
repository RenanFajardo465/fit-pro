"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { foodSchema, type FoodFormValues } from "@/lib/schemas/food";

/**
 * Normaliza campos de texto opcionais: string vazia vira `null` no banco.
 */
function toNullable(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type FoodActionResult = { error: string } | void;

export async function createFood(values: FoodFormValues): Promise<FoodActionResult> {
  const parsed = foodSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Dados inválidos. Confira os campos destacados." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const v = parsed.data;
  const { error } = await supabase.from("foods").insert({
    user_id: user.id,
    name: v.name,
    brand: toNullable(v.brand),
    serving_quantity: v.serving_quantity,
    serving_unit: v.serving_unit,
    grams_equivalent: v.grams_equivalent,
    calories: v.calories,
    protein_g: v.protein_g,
    carbs_g: v.carbs_g,
    fat_g: v.fat_g,
  });

  if (error) {
    return { error: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/nutricao/alimentos");
  redirect("/nutricao/alimentos");
}

export async function updateFood(
  id: string,
  values: FoodFormValues
): Promise<FoodActionResult> {
  const parsed = foodSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Dados inválidos. Confira os campos destacados." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const v = parsed.data;
  // RLS já impede editar alimento de outro usuário; o filtro por user_id
  // aqui é só uma segunda barreira explícita no código.
  const { error } = await supabase
    .from("foods")
    .update({
      name: v.name,
      brand: toNullable(v.brand),
      serving_quantity: v.serving_quantity,
      serving_unit: v.serving_unit,
      grams_equivalent: v.grams_equivalent,
      calories: v.calories,
      protein_g: v.protein_g,
      carbs_g: v.carbs_g,
      fat_g: v.fat_g,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { error: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath("/nutricao/alimentos");
  redirect("/nutricao/alimentos");
}

/**
 * Soft delete (Fase 0, seção 9): marca deleted_at em vez de apagar a linha.
 * Receitas e diário nutricional (Incrementos 2-4) sempre congelam uma cópia
 * dos macros no momento do uso, então nada quebra quando um alimento some
 * daqui pra frente.
 */
export async function deleteFood(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("foods")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/nutricao/alimentos");
  redirect("/nutricao/alimentos");
}
