import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DietDayPicker } from "@/components/nutrition/diet-day-picker";
import { DietDayMealSection, type DietDayMealForSection } from "@/components/nutrition/diet-day-meal-section";
import { DaySummaryCard, type DaySummaryTotals } from "@/components/nutrition/day-summary-card";
import { ExtraFoodLogForm } from "@/components/nutrition/extra-food-log-form";
import { ExtraLogList } from "@/components/nutrition/extra-log-list";
import { removeDietDay } from "@/lib/actions/diet-days";
import { getAppToday, addDaysToIsoDate, formatIsoDateShort } from "@/lib/date/today";
import { DIET_TYPE_LABELS, type DietType } from "@/lib/nutrition/vocabulary";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default async function DiarioDiaPage(props: PageProps<"/nutricao/diario/[date]">) {
  const { date } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { date: todayDate } = getAppToday();
  const previousDate = addDaysToIsoDate(date, -1);
  const nextDate = addDaysToIsoDate(date, 1);

  const { data: dietDay } = await supabase
    .from("diet_days")
    .select("id, diet_name, diet_type")
    .eq("user_id", user!.id)
    .eq("date", date)
    .maybeSingle();

  let mealsForSection: DietDayMealForSection[] = [];
  let totals: DaySummaryTotals = {
    plannedCalories: 0,
    plannedProteinG: 0,
    plannedCarbsG: 0,
    plannedFatG: 0,
    consumedCalories: 0,
    consumedProteinG: 0,
    consumedCarbsG: 0,
    consumedFatG: 0,
  };
  let extraLogs: { id: string; name: string; quantity: number; calories: number; protein_g: number; carbs_g: number; fat_g: number }[] = [];
  let pickableFoods: { id: string; name: string; brand: string | null; serving_quantity: number; serving_unit: string; grams_equivalent: number; calories: number; protein_g: number; carbs_g: number; fat_g: number }[] = [];
  let pickableRecipes: { id: string; name: string; servings: number; computed_calories: number; computed_protein_g: number; computed_carbs_g: number; computed_fat_g: number }[] = [];

  if (dietDay) {
    const [{ data: rawMeals }, { data: rawExtras }, { data: foods }, { data: recipes }] = await Promise.all([
      supabase
        .from("diet_day_meals")
        .select(
          "id, order_index, name, meal_time, diet_day_items(id, order_index, food_name, quantity, unit, calories, protein_g, carbs_g, fat_g, consumed_quantity, consumed_calories, consumed_protein_g, consumed_carbs_g, consumed_fat_g)"
        )
        .eq("diet_day_id", dietDay.id)
        .order("order_index", { ascending: true }),
      supabase
        .from("extra_food_logs")
        .select("id, name, quantity, calories, protein_g, carbs_g, fat_g")
        .eq("diet_day_id", dietDay.id)
        .order("logged_at", { ascending: true }),
      supabase
        .from("foods")
        .select(
          "id, name, brand, serving_quantity, serving_unit, grams_equivalent, calories, protein_g, carbs_g, fat_g"
        )
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
      supabase
        .from("recipes")
        .select("id, name, servings, computed_calories, computed_protein_g, computed_carbs_g, computed_fat_g")
        .eq("user_id", user!.id)
        .is("deleted_at", null)
        .order("name", { ascending: true }),
    ]);

    mealsForSection = (rawMeals ?? []).map((meal) => ({
      id: meal.id,
      name: meal.name,
      meal_time: meal.meal_time ? meal.meal_time.slice(0, 5) : null,
      items: (meal.diet_day_items ?? []).sort((a, b) => a.order_index - b.order_index),
    }));

    extraLogs = rawExtras ?? [];
    pickableFoods = foods ?? [];
    pickableRecipes = recipes ?? [];

    const allItems = mealsForSection.flatMap((m) => m.items);
    const plannedCalories = allItems.reduce((sum, i) => sum + i.calories, 0);
    const plannedProteinG = allItems.reduce((sum, i) => sum + i.protein_g, 0);
    const plannedCarbsG = allItems.reduce((sum, i) => sum + i.carbs_g, 0);
    const plannedFatG = allItems.reduce((sum, i) => sum + i.fat_g, 0);

    const consumedFromItemsCalories = allItems.reduce((sum, i) => sum + (i.consumed_calories ?? 0), 0);
    const consumedFromItemsProteinG = allItems.reduce((sum, i) => sum + (i.consumed_protein_g ?? 0), 0);
    const consumedFromItemsCarbsG = allItems.reduce((sum, i) => sum + (i.consumed_carbs_g ?? 0), 0);
    const consumedFromItemsFatG = allItems.reduce((sum, i) => sum + (i.consumed_fat_g ?? 0), 0);

    const extraCalories = extraLogs.reduce((sum, l) => sum + l.calories, 0);
    const extraProteinG = extraLogs.reduce((sum, l) => sum + l.protein_g, 0);
    const extraCarbsG = extraLogs.reduce((sum, l) => sum + l.carbs_g, 0);
    const extraFatG = extraLogs.reduce((sum, l) => sum + l.fat_g, 0);

    totals = {
      plannedCalories: round2(plannedCalories),
      plannedProteinG: round2(plannedProteinG),
      plannedCarbsG: round2(plannedCarbsG),
      plannedFatG: round2(plannedFatG),
      consumedCalories: round2(consumedFromItemsCalories + extraCalories),
      consumedProteinG: round2(consumedFromItemsProteinG + extraProteinG),
      consumedCarbsG: round2(consumedFromItemsCarbsG + extraCarbsG),
      consumedFatG: round2(consumedFromItemsFatG + extraFatG),
    };
  }

  const { data: diets } = await supabase
    .from("diet_templates")
    .select("id, name, code, diet_type")
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .order("code", { ascending: true });

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/nutricao" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Nutrição
      </Link>

      <div className="flex items-center justify-between gap-2">
        <Link href={`/nutricao/diario/${previousDate}`} aria-label="Dia anterior">
          <Button type="button" variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex flex-col items-center">
          <h1 className="text-lg font-semibold tracking-tight capitalize">{formatIsoDateShort(date)}</h1>
          {date !== todayDate && (
            <Link href={`/nutricao/diario/${todayDate}`} className="text-xs text-muted-foreground underline">
              Ir para hoje
            </Link>
          )}
        </div>

        <Link href={`/nutricao/diario/${nextDate}`} aria-label="Próximo dia">
          <Button type="button" variant="ghost" size="icon">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {!dietDay && (
        <Card className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Nenhuma dieta selecionada para esse dia ainda.
          </p>
          <DietDayPicker date={date} diets={diets ?? []} />
        </Card>
      )}

      {dietDay && (
        <>
          <Card className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{dietDay.diet_name}</span>
              <span className="text-xs text-muted-foreground">
                {DIET_TYPE_LABELS[dietDay.diet_type as DietType] ?? dietDay.diet_type}
              </span>
            </div>
            <form action={removeDietDay.bind(null, dietDay.id, date)}>
              <Button type="submit" variant="outline" size="sm">
                Remover dieta do dia
              </Button>
            </form>
          </Card>

          <DaySummaryCard totals={totals} />

          <div className="flex flex-col gap-3">
            {mealsForSection.map((meal) => (
              <DietDayMealSection key={meal.id} meal={meal} date={date} />
            ))}
          </div>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Itens extra (fora da dieta)</p>
              <ExtraFoodLogForm
                dietDayId={dietDay.id}
                date={date}
                foods={pickableFoods}
                recipes={pickableRecipes}
              />
            </div>
            <ExtraLogList logs={extraLogs} date={date} />
          </Card>
        </>
      )}
    </div>
  );
}
