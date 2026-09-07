"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FOOD_UNIT_LABELS, type FoodUnit } from "@/lib/nutrition/vocabulary";
import { setItemConsumption } from "@/lib/actions/diet-days";

export type DietDayItemForRow = {
  id: string;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  consumed_quantity: number | null;
  consumed_calories: number | null;
  consumed_protein_g: number | null;
  consumed_carbs_g: number | null;
  consumed_fat_g: number | null;
};

export function DietDayItemRow({ item, date }: { item: DietDayItemForRow; date: string }) {
  const router = useRouter();
  const isConsumed = item.consumed_quantity !== null;
  const [quantityDraft, setQuantityDraft] = useState(item.consumed_quantity ?? item.quantity);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setItemConsumption(item.id, isConsumed ? null : item.quantity, date);
      router.refresh();
    });
  }

  function commitQuantity() {
    if (quantityDraft === item.consumed_quantity) return;
    startTransition(async () => {
      await setItemConsumption(item.id, quantityDraft, date);
      router.refresh();
    });
  }

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border px-3 py-2.5", isConsumed ? "border-primary/40 bg-primary/5" : "border-border bg-background")}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={toggle}
          disabled={isPending}
          aria-label={isConsumed ? "Desmarcar como consumido" : "Marcar como consumido"}
          className="mt-0.5 shrink-0"
        >
          {isConsumed ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        <div className="flex flex-1 flex-col gap-0.5">
          <span className={cn("text-sm font-medium", isConsumed && "line-through decoration-muted-foreground/50")}>
            {item.food_name}
          </span>
          <span className="text-xs text-muted-foreground">
            Planejado: {item.quantity} {FOOD_UNIT_LABELS[item.unit as FoodUnit] ?? item.unit} ·{" "}
            {item.calories} kcal · P {item.protein_g}g · C {item.carbs_g}g · G {item.fat_g}g
          </span>
        </div>
      </div>

      {isConsumed && (
        <div className="flex items-center gap-2 pl-7">
          <label className="text-xs text-muted-foreground">Quantidade consumida</label>
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            className="w-24"
            value={quantityDraft}
            onChange={(e) => setQuantityDraft(Number(e.target.value))}
            onBlur={commitQuantity}
          />
          <span className="text-xs text-muted-foreground">
            {item.consumed_calories} kcal · P {item.consumed_protein_g}g · C {item.consumed_carbs_g}g ·
            G {item.consumed_fat_g}g
          </span>
        </div>
      )}
    </div>
  );
}
