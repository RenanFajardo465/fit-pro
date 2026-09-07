"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FoodPicker, type PickableFood } from "@/components/nutrition/food-picker";
import { DietMealItemRow } from "@/components/nutrition/diet-meal-item-row";
import type { DietMealEditor } from "@/components/nutrition/diet-editor";

export function DietMealCard({
  meal,
  availableFoods,
  onChangeName,
  onChangeTime,
  onAddItem,
  onChangeItemQuantity,
  onRemoveItem,
  onRemoveMeal,
}: {
  meal: DietMealEditor;
  availableFoods: PickableFood[];
  onChangeName: (name: string) => void;
  onChangeTime: (time: string) => void;
  onAddItem: (food: PickableFood) => void;
  onChangeItemQuantity: (itemClientId: string, quantity: number) => void;
  onRemoveItem: (itemClientId: string) => void;
  onRemoveMeal: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-1 flex-col gap-2">
          <Input
            value={meal.name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="Nome da refeição (ex.: Café da manhã)"
          />
          <Input
            type="time"
            value={meal.meal_time}
            onChange={(e) => onChangeTime(e.target.value)}
            className="w-32"
          />
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onRemoveMeal} aria-label="Remover refeição">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {meal.items.map((item) => (
          <DietMealItemRow
            key={item.clientId}
            item={item}
            onChangeQuantity={(quantity) => onChangeItemQuantity(item.clientId, quantity)}
            onRemove={() => onRemoveItem(item.clientId)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={() => setShowPicker(true)}>
        <Plus className="h-3.5 w-3.5" />
        Adicionar alimento
      </Button>

      {showPicker && (
        <FoodPicker
          foods={availableFoods}
          onPick={(food) => {
            onAddItem(food);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
