"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileGoalsSchema, type ProfileGoalsFormValues } from "@/lib/schemas/profile-goals";

export type ProfileActionResult = { error: string } | void;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Define (ou limpa, com `null`) a meta diária de calorias/proteína usada nos resumos. */
export async function updateNutritionGoals(values: ProfileGoalsFormValues): Promise<ProfileActionResult> {
  const parsed = profileGoalsSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("profiles")
    .update({
      daily_calorie_goal: parsed.data.daily_calorie_goal,
      daily_protein_goal_g: parsed.data.daily_protein_goal_g,
    })
    .eq("id", user.id);

  if (error) return { error: `Erro ao salvar: ${error.message}` };

  revalidatePath("/configuracoes/nutricao");
  revalidatePath("/hoje");
  revalidatePath("/nutricao/diario/[date]", "page");
}
