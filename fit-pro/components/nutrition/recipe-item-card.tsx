"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FOOD_UNIT_LABELS, type FoodUnit } from "@/lib/nutrition/vocabulary";
import type { RecipeEditorItem } from "@/components/nutrition/recipe-editor";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function RecipeItemCard({
  item,
  onChangeQuantity,
  onRemove,
}: {
  item: RecipeEditorItem;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const totalCalories = round2(item.per_serving_calories * item.quantity_servings);
  const totalProtein = round2(item.per_serving_protein_g * item.quantity_servings);
  const totalCarbs = round2(item.per_serving_carbs_g * item.quantity_servings);
  const totalFat = round2(item.per_serving_fat_g * item.quantity_servings);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{item.food_name}</span>
          <span className="text-xs text-muted-foreground">
            1 porção = {item.serving_quantity}{" "}
            {FOOD_UNIT_LABELS[item.serving_unit as FoodUnit] ?? item.serving_unit} ·{" "}
            {item.per_serving_calories} kcal
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remover alimento"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Quantidade (em porções)</label>
        <Input
          type="number"
          inputMode="decimal"
          step="any"
          min={0}
          className="w-24"
          value={item.quantity_servings}
          onChange={(e) => onChangeQuantity(Number(e.target.value))}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {totalCalories} kcal · P {totalProtein}g · C {totalCarbs}g · G {totalFat}g
      </p>
    </div>
  );
}
