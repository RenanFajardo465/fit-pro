"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DietDayItemRow, type DietDayItemForRow } from "@/components/nutrition/diet-day-item-row";
import { setMealConsumption } from "@/lib/actions/diet-days";

export type DietDayMealForSection = {
  id: string;
  name: string;
  meal_time: string | null;
  items: DietDayItemForRow[];
};

export function DietDayMealSection({ meal, date }: { meal: DietDayMealForSection; date: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const allConsumed = meal.items.length > 0 && meal.items.every((i) => i.consumed_quantity !== null);

  function toggleAll() {
    startTransition(async () => {
      await setMealConsumption(meal.id, !allConsumed, date);
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{meal.name}</span>
          {meal.meal_time && <span className="text-xs text-muted-foreground">{meal.meal_time}</span>}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={toggleAll} disabled={isPending}>
          {allConsumed ? "Desmarcar tudo" : "Marcar tudo"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {meal.items.map((item) => (
          <DietDayItemRow key={item.id} item={item} date={date} />
        ))}
      </div>
    </Card>
  );
}
