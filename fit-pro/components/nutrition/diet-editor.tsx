"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DietMealCard } from "@/components/nutrition/diet-meal-card";
import type { PickableFood } from "@/components/nutrition/food-picker";
import { saveDietMeals } from "@/lib/actions/diet-templates";
import type { DietMealValues } from "@/lib/schemas/diet-template";

export type DietMealItemEditor = {
  clientId: string;
  food_id: string;
  food_name: string;
  serving_quantity: number;
  serving_unit: string;
  serving_grams_equivalent: number;
  per_serving_calories: number;
  per_serving_protein_g: number;
  per_serving_carbs_g: number;
  per_serving_fat_g: number;
  quantity_servings: number;
};

export type DietMealEditor = {
  clientId: string;
  name: string;
  /** String "HH:MM" (formato do <input type="time">) ou "" pra sem horário. */
  meal_time: string;
  items: DietMealItemEditor[];
};

function newClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function DietEditor({
  dietTemplateId,
  initialMeals,
  availableFoods,
}: {
  dietTemplateId: string;
  initialMeals: DietMealEditor[];
  availableFoods: PickableFood[];
}) {
  const router = useRouter();
  const [meals, setMeals] = useState<DietMealEditor[]>(initialMeals);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function mutate(fn: (prev: DietMealEditor[]) => DietMealEditor[]) {
    setMeals(fn);
    setIsDirty(true);
  }

  function addMeal() {
    mutate((prev) => [
      ...prev,
      { clientId: newClientId(), name: "", meal_time: "", items: [] },
    ]);
  }

  function removeMeal(mealClientId: string) {
    mutate((prev) => prev.filter((m) => m.clientId !== mealClientId));
  }

  function updateMealName(mealClientId: string, name: string) {
    mutate((prev) => prev.map((m) => (m.clientId === mealClientId ? { ...m, name } : m)));
  }

  function updateMealTime(mealClientId: string, meal_time: string) {
    mutate((prev) => prev.map((m) => (m.clientId === mealClientId ? { ...m, meal_time } : m)));
  }

  function addItem(mealClientId: string, food: PickableFood) {
    mutate((prev) =>
      prev.map((m) =>
        m.clientId === mealClientId
          ? {
              ...m,
              items: [
                ...m.items,
                {
                  clientId: newClientId(),
                  food_id: food.id,
                  food_name: food.brand ? `${food.name} · ${food.brand}` : food.name,
                  serving_quantity: food.serving_quantity,
                  serving_unit: food.serving_unit,
                  serving_grams_equivalent: food.grams_equivalent,
                  per_serving_calories: food.calories,
                  per_serving_protein_g: food.protein_g,
                  per_serving_carbs_g: food.carbs_g,
                  per_serving_fat_g: food.fat_g,
                  quantity_servings: 1,
                },
              ],
            }
          : m
      )
    );
  }

  function updateItemQuantity(mealClientId: string, itemClientId: string, quantity: number) {
    mutate((prev) =>
      prev.map((m) =>
        m.clientId === mealClientId
          ? {
              ...m,
              items: m.items.map((i) =>
                i.clientId === itemClientId ? { ...i, quantity_servings: quantity } : i
              ),
            }
          : m
      )
    );
  }

  function removeItem(mealClientId: string, itemClientId: string) {
    mutate((prev) =>
      prev.map((m) =>
        m.clientId === mealClientId
          ? { ...m, items: m.items.filter((i) => i.clientId !== itemClientId) }
          : m
      )
    );
  }

  function handleSave() {
    setError(null);

    const payload: DietMealValues[] = meals.map((meal, mealIndex) => ({
      order_index: mealIndex,
      name: meal.name,
      meal_time: meal.meal_time || null,
      items: meal.items.map((item, itemIndex) => ({
        order_index: itemIndex,
        food_id: item.food_id || null,
        food_name: item.food_name,
        quantity: round2(item.serving_quantity * item.quantity_servings),
        unit: item.serving_unit as DietMealValues["items"][number]["unit"],
        grams_equivalent: round2(item.serving_grams_equivalent * item.quantity_servings),
        calories: round2(item.per_serving_calories * item.quantity_servings),
        protein_g: round2(item.per_serving_protein_g * item.quantity_servings),
        carbs_g: round2(item.per_serving_carbs_g * item.quantity_servings),
        fat_g: round2(item.per_serving_fat_g * item.quantity_servings),
        notes: null,
      })),
    }));

    startTransition(async () => {
      const result = await saveDietMeals(dietTemplateId, payload);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setIsDirty(false);
      router.refresh();
    });
  }

  const canSave = meals.length > 0 && meals.every((m) => m.name.trim() && m.items.length > 0);

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {meals.length} refeiç{meals.length === 1 ? "ão" : "ões"}
        </p>
        <Button type="button" size="sm" onClick={addMeal}>
          <Plus className="h-4 w-4" />
          Adicionar refeição
        </Button>
      </div>

      {meals.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Nenhuma refeição ainda. Toque em &quot;Adicionar refeição&quot; para montar a dieta.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {meals.map((meal) => (
          <DietMealCard
            key={meal.clientId}
            meal={meal}
            availableFoods={availableFoods}
            onChangeName={(name) => updateMealName(meal.clientId, name)}
            onChangeTime={(time) => updateMealTime(meal.clientId, time)}
            onAddItem={(food) => addItem(meal.clientId, food)}
            onChangeItemQuantity={(itemClientId, quantity) =>
              updateItemQuantity(meal.clientId, itemClientId, quantity)
            }
            onRemoveItem={(itemClientId) => removeItem(meal.clientId, itemClientId)}
            onRemoveMeal={() => removeMeal(meal.clientId)}
          />
        ))}
      </div>

      {meals.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Toda refeição precisa de um nome e pelo menos um alimento antes de salvar.
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <span className="flex-1 text-xs text-muted-foreground">
            {isPending ? "Salvando..." : isDirty ? "Alterações não salvas" : "✓ Tudo salvo"}
          </span>
          <Button type="button" onClick={handleSave} disabled={isPending || !isDirty || !canSave}>
            Salvar dieta
          </Button>
        </div>
      </div>
    </div>
  );
}
