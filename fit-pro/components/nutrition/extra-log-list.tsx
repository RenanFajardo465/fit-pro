"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteExtraFoodLog } from "@/lib/actions/diet-days";

export type ExtraLogForList = {
  id: string;
  name: string;
  quantity: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function ExtraLogList({ logs, date }: { logs: ExtraLogForList[]; date: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      await deleteExtraFoodLog(id, date);
      router.refresh();
    });
  }

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum item extra registrado hoje.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{log.name}</span>
            <span className="text-xs text-muted-foreground">
              {log.quantity}× · {log.calories} kcal · P {log.protein_g}g · C {log.carbs_g}g · G{" "}
              {log.fat_g}g
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(log.id)}
            disabled={isPending}
            aria-label="Remover item extra"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
