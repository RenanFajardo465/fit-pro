import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { DaySummaryTotals } from "@/components/nutrition/day-summary-card";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const ZERO_TOTALS: DaySummaryTotals = {
  plannedCalories: 0,
  plannedProteinG: 0,
  plannedCarbsG: 0,
  plannedFatG: 0,
  consumedCalories: 0,
  consumedProteinG: 0,
  consumedCarbsG: 0,
  consumedFatG: 0,
};

export type DietDaySummary = {
  id: string;
  diet_name: string;
  diet_type: string;
};

/**
 * Versão enxuta do cálculo de totais usado em `/nutricao/diario/[date]`
 * (só soma planejado × consumido, sem trazer a lista de refeições/itens) —
 * usada no resumo do Hoje (Fase 5, Incremento 5), que não precisa do
 * checklist completo.
 */
export async function getDayTotals(
  supabase: SupabaseClient<Database>,
  userId: string,
  date: string
): Promise<{ dietDay: DietDaySummary | null; totals: DaySummaryTotals }> {
  const { data: dietDay } = await supabase
    .from("diet_days")
    .select("id, diet_name, diet_type")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (!dietDay) {
    return { dietDay: null, totals: ZERO_TOTALS };
  }

  const [{ data: rawMeals }, { data: rawExtras }] = await Promise.all([
    supabase
      .from("diet_day_meals")
      .select(
        "diet_day_items(calories, protein_g, carbs_g, fat_g, consumed_calories, consumed_protein_g, consumed_carbs_g, consumed_fat_g)"
      )
      .eq("diet_day_id", dietDay.id),
    supabase.from("extra_food_logs").select("calories, protein_g, carbs_g, fat_g").eq("diet_day_id", dietDay.id),
  ]);

  const allItems = (rawMeals ?? []).flatMap((m) => m.diet_day_items ?? []);
  const extras = rawExtras ?? [];

  const plannedCalories = allItems.reduce((sum, i) => sum + i.calories, 0);
  const plannedProteinG = allItems.reduce((sum, i) => sum + i.protein_g, 0);
  const plannedCarbsG = allItems.reduce((sum, i) => sum + i.carbs_g, 0);
  const plannedFatG = allItems.reduce((sum, i) => sum + i.fat_g, 0);

  const consumedFromItemsCalories = allItems.reduce((sum, i) => sum + (i.consumed_calories ?? 0), 0);
  const consumedFromItemsProteinG = allItems.reduce((sum, i) => sum + (i.consumed_protein_g ?? 0), 0);
  const consumedFromItemsCarbsG = allItems.reduce((sum, i) => sum + (i.consumed_carbs_g ?? 0), 0);
  const consumedFromItemsFatG = allItems.reduce((sum, i) => sum + (i.consumed_fat_g ?? 0), 0);

  const extraCalories = extras.reduce((sum, l) => sum + l.calories, 0);
  const extraProteinG = extras.reduce((sum, l) => sum + l.protein_g, 0);
  const extraCarbsG = extras.reduce((sum, l) => sum + l.carbs_g, 0);
  const extraFatG = extras.reduce((sum, l) => sum + l.fat_g, 0);

  return {
    dietDay,
    totals: {
      plannedCalories: round2(plannedCalories),
      plannedProteinG: round2(plannedProteinG),
      plannedCarbsG: round2(plannedCarbsG),
      plannedFatG: round2(plannedFatG),
      consumedCalories: round2(consumedFromItemsCalories + extraCalories),
      consumedProteinG: round2(consumedFromItemsProteinG + extraProteinG),
      consumedCarbsG: round2(consumedFromItemsCarbsG + extraCarbsG),
      consumedFatG: round2(consumedFromItemsFatG + extraFatG),
    },
  };
}
