"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FoodPicker, type PickableFood } from "@/components/nutrition/food-picker";
import { RecipeItemCard } from "@/components/nutrition/recipe-item-card";
import { saveRecipeItems } from "@/lib/actions/recipes";
import type { RecipeItemValues } from "@/lib/schemas/recipe";

export type RecipeEditorItem = {
  clientId: string;
  food_id: string;
  food_name: string;
  serving_quantity: number;
  serving_unit: string;
  per_serving_calories: number;
  per_serving_protein_g: number;
  per_serving_carbs_g: number;
  per_serving_fat_g: number;
  quantity_servings: number;
};

function newClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Soma dos itens (alimento × quantidade), dividida pelo rendimento — mesma conta que a RPC faz no servidor, usada aqui só pra pré-visualização. */
function computeTotals(items: RecipeEditorItem[], servings: number) {
  const sum = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.per_serving_calories * item.quantity_servings,
      protein_g: acc.protein_g + item.per_serving_protein_g * item.quantity_servings,
      carbs_g: acc.carbs_g + item.per_serving_carbs_g * item.quantity_servings,
      fat_g: acc.fat_g + item.per_serving_fat_g * item.quantity_servings,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const safeServings = servings > 0 ? servings : 1;
  return {
    calories: round2(sum.calories / safeServings),
    protein_g: round2(sum.protein_g / safeServings),
    carbs_g: round2(sum.carbs_g / safeServings),
    fat_g: round2(sum.fat_g / safeServings),
  };
}

export function RecipeEditor({
  recipeId,
  initialServings,
  initialItems,
  availableFoods,
}: {
  recipeId: string;
  initialServings: number;
  initialItems: RecipeEditorItem[];
  availableFoods: PickableFood[];
}) {
  const router = useRouter();
  const [servings, setServings] = useState(initialServings);
  const [items, setItems] = useState<RecipeEditorItem[]>(initialItems);
  const [isDirty, setIsDirty] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function mutate(fn: (prev: RecipeEditorItem[]) => RecipeEditorItem[]) {
    setItems(fn);
    setIsDirty(true);
  }

  function addFood(food: PickableFood) {
    mutate((prev) => [
      ...prev,
      {
        clientId: newClientId(),
        food_id: food.id,
        food_name: food.brand ? `${food.name} · ${food.brand}` : food.name,
        serving_quantity: food.serving_quantity,
        serving_unit: food.serving_unit,
        per_serving_calories: food.calories,
        per_serving_protein_g: food.protein_g,
        per_serving_carbs_g: food.carbs_g,
        per_serving_fat_g: food.fat_g,
        quantity_servings: 1,
      },
    ]);
    setShowPicker(false);
  }

  function removeItem(clientId: string) {
    mutate((prev) => prev.filter((i) => i.clientId !== clientId));
  }

  function updateQuantity(clientId: string, quantity: number) {
    mutate((prev) =>
      prev.map((i) => (i.clientId === clientId ? { ...i, quantity_servings: quantity } : i))
    );
  }

  function updateServings(value: number) {
    setServings(value);
    setIsDirty(true);
  }

  const totals = useMemo(() => computeTotals(items, servings), [items, servings]);

  function handleSave() {
    setError(null);

    const payloadItems: RecipeItemValues[] = items.map((item) => ({
      food_id: item.food_id,
      food_name: item.food_name,
      quantity_servings: item.quantity_servings,
      calories: round2(item.per_serving_calories * item.quantity_servings),
      protein_g: round2(item.per_serving_protein_g * item.quantity_servings),
      carbs_g: round2(item.per_serving_carbs_g * item.quantity_servings),
      fat_g: round2(item.per_serving_fat_g * item.quantity_servings),
    }));

    startTransition(async () => {
      const result = await saveRecipeItems(recipeId, { servings, items: payloadItems });
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setIsDirty(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="servings">Rendimento (nº de porções que a receita rende)</Label>
        <Input
          id="servings"
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          className="w-32"
          value={servings}
          onChange={(e) => updateServings(Number(e.target.value))}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} alimento{items.length === 1 ? "" : "s"}
        </p>
        <Button type="button" size="sm" onClick={() => setShowPicker(true)}>
          <Plus className="h-4 w-4" />
          Adicionar alimento
        </Button>
      </div>

      {items.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Nenhum alimento ainda. Toque em &quot;Adicionar alimento&quot; para montar a receita.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <RecipeItemCard
            key={item.clientId}
            item={item}
            onChangeQuantity={(quantity) => updateQuantity(item.clientId, quantity)}
            onRemove={() => removeItem(item.clientId)}
          />
        ))}
      </div>

      {items.length > 0 && (
        <Card className="flex flex-col gap-1">
          <p className="text-sm font-medium">Por 1 porção da receita (pré-visualização)</p>
          <p className="text-sm text-muted-foreground">
            {totals.calories} kcal · P {totals.protein_g}g · C {totals.carbs_g}g · G {totals.fat_g}g
          </p>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Só fica salvo (congelado) depois de tocar em &quot;Salvar receita&quot;.
          </p>
        </Card>
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
          <Button type="button" onClick={handleSave} disabled={isPending || !isDirty || items.length === 0}>
            Salvar receita
          </Button>
        </div>
      </div>

      {showPicker && (
        <FoodPicker foods={availableFoods} onPick={addFood} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}
