"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DIET_TYPE_LABELS, type DietType } from "@/lib/nutrition/vocabulary";
import { selectDietForDay } from "@/lib/actions/diet-days";

export type PickableDietTemplate = { id: string; name: string; code: string; diet_type: string };

export function DietDayPicker({
  date,
  diets,
}: {
  date: string;
  diets: PickableDietTemplate[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!selectedId) {
      setError("Selecione uma dieta");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await selectDietForDay(date, selectedId);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (diets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Você ainda não tem dietas cadastradas. Crie uma em Nutrição → Dietas antes de selecionar
        pra um dia.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="diet-select">Qual dieta você vai seguir nesse dia?</Label>
        <Select id="diet-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          <option value="" disabled>
            Selecione
          </option>
          {diets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} · {d.name} ({DIET_TYPE_LABELS[d.diet_type as DietType] ?? d.diet_type})
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="button" onClick={handleSubmit} disabled={isPending}>
        {isPending ? "Selecionando..." : "Selecionar dieta para esse dia"}
      </Button>
    </div>
  );
}
