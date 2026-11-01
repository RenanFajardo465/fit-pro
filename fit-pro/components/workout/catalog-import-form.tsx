"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  EXERCISE_CATALOG_SEED,
  type CatalogSeedExercise,
} from "@/lib/workout/exercise-catalog-seed";
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_TYPE_LABELS,
  type MuscleGroup,
  type EquipmentType,
} from "@/lib/workout/vocabulary";
import { importExerciseCatalogSeed, type ImportCatalogSeedResult } from "@/lib/actions/exercises";

/**
 * Catálogo Inteligente, seção 8/9: tela de importação do catálogo inicial,
 * agrupada por grupo muscular, com seleção opt-in (nada é importado sem o
 * usuário escolher). "Selecionar todos" por grupo é uma conveniência — ainda
 * assim o usuário pode desmarcar itens individuais antes de importar.
 */
export function CatalogImportForm({
  alreadyInLibrary,
}: {
  /** Nomes (normalizados) já presentes na biblioteca do usuário — usado só pra marcar visualmente, nunca bloqueia nada aqui (o backend decide, via trigger). */
  alreadyInLibrary: Set<string>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportCatalogSeedResult | null>(null);

  const groups = useMemo(() => {
    const byGroup = new Map<MuscleGroup, CatalogSeedExercise[]>();
    for (const mg of MUSCLE_GROUPS) byGroup.set(mg, []);
    for (const item of EXERCISE_CATALOG_SEED) {
      byGroup.get(item.muscle_group)?.push(item);
    }
    return MUSCLE_GROUPS.filter((mg) => (byGroup.get(mg)?.length ?? 0) > 0).map((mg) => ({
      muscleGroup: mg,
      items: byGroup.get(mg)!,
    }));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(items: CatalogSeedExercise[]) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = items.every((item) => next.has(item.id));
      for (const item of items) {
        if (allSelected) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });
  }

  function handleImport() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await importExerciseCatalogSeed(ids);
      setResult(res);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {result && (
        <Card className="flex flex-col gap-1.5 border-primary/40 bg-primary/5">
          <p className="text-sm font-medium">
            {result.created} exercício{result.created === 1 ? "" : "s"} importado
            {result.created === 1 ? "" : "s"}.
          </p>
          {result.skipped.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <p>{result.skipped.length} pulado(s) por já existir algo equivalente na sua biblioteca:</p>
              <ul className="mt-1 list-inside list-disc">
                {result.skipped.map((s) => (
                  <li key={s.name}>{s.name}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {groups.map(({ muscleGroup, items }) => {
        const allSelected = items.every((item) => selected.has(item.id));
        return (
          <Card key={muscleGroup} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{MUSCLE_GROUP_LABELS[muscleGroup]}</h2>
              <button
                type="button"
                onClick={() => toggleGroup(items)}
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                {allSelected ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {items.map((item) => {
                const alreadyHave = alreadyInLibrary.has(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex items-start gap-2.5 rounded-xl border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      checked={selected.has(item.id)}
                      onChange={() => toggle(item.id)}
                    />
                    <span className="flex flex-col">
                      <span>{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.equipment ? EQUIPMENT_TYPE_LABELS[item.equipment as EquipmentType] : ""}
                        {item.is_unilateral ? " · unilateral" : ""}
                        {alreadyHave ? " · você já tem algo parecido" : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>
        );
      })}

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background px-4 py-3">
        <Button
          type="button"
          className="w-full"
          disabled={selected.size === 0 || isPending}
          onClick={handleImport}
        >
          {isPending
            ? "Importando..."
            : selected.size > 0
              ? `Importar ${selected.size} exercício${selected.size === 1 ? "" : "s"}`
              : "Selecione exercícios para importar"}
        </Button>
      </div>
    </div>
  );
}
