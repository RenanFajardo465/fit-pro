"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DIET_TYPE_LABELS, FOOD_UNIT_LABELS, type DietType, type FoodUnit } from "@/lib/nutrition/vocabulary";
import { parseDietCsv, type DietCsvInput, type CsvRowIssue } from "@/lib/csv/diet-import";
import { importDietCsv } from "@/lib/actions/import-diet-csv";

export function DietCsvImportClient({ existingDietCodes }: { existingDietCodes: string[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [diets, setDiets] = useState<DietCsvInput[]>([]);
  const [errors, setErrors] = useState<CsvRowIssue[]>([]);
  const [warnings, setWarnings] = useState<CsvRowIssue[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const existingCodesSet = useMemo(() => new Set(existingDietCodes), [existingDietCodes]);

  async function handleFile(file: File) {
    setSubmitError(null);
    setSuccess(null);
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    const result = parseDietCsv(text);
    setDiets(result.diets);
    setErrors(result.errors);
    setWarnings(result.warnings);
  }

  function handleConfirm() {
    if (!csvText || !fileName) return;
    setSubmitError(null);
    startTransition(async () => {
      const result = await importDietCsv(fileName, csvText);
      if ("error" in result) {
        setSubmitError(result.error);
        return;
      }
      setSuccess(
        `Importado: ${result.summary.diets_count} dieta(s), ${result.summary.meals_count} refeição(ões), ${result.summary.items_count} item(ns).`
      );
      setDiets([]);
      setCsvText(null);
      setFileName(null);
      router.refresh();
    });
  }

  const canConfirm = diets.length > 0 && errors.length === 0 && !isPending;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Selecione o arquivo CSV no formato oficial de dieta (colunas documentadas na Fase 0, seção 21).
          Importar um código de dieta que já existe substitui as refeições dela — não duplica.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          {fileName ?? "Escolher arquivo CSV"}
        </Button>
      </Card>

      {success && (
        <Card className="flex items-start gap-2 border-primary/40 bg-primary/5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm">{success}</p>
        </Card>
      )}

      {errors.length > 0 && (
        <Card className="flex flex-col gap-2 border-destructive/40 bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {errors.length} erro(s) — corrija o CSV e selecione o arquivo de novo
            </p>
          </div>
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {errors.slice(0, 30).map((e, i) => (
              <li key={i}>
                Linha {e.row}: {e.message}
              </li>
            ))}
            {errors.length > 30 && <li>... e mais {errors.length - 30} erro(s).</li>}
          </ul>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card className="flex flex-col gap-2 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <FileWarning className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium">{warnings.length} aviso(s) — não impedem a importação</p>
          </div>
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {warnings.slice(0, 20).map((w, i) => (
              <li key={i}>
                Linha {w.row}: {w.message}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {diets.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Prévia — confira antes de confirmar:</p>
          {diets.map((d) => {
            const isReplace = existingCodesSet.has(d.code);
            const totalItems = d.meals.reduce((sum, m) => sum + m.items.length, 0);
            return (
              <Card key={d.code} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 items-center justify-center rounded-lg bg-primary px-2 text-xs font-bold text-primary-foreground">
                      {d.code}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium">{d.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {DIET_TYPE_LABELS[d.diet_type as DietType] ?? d.diet_type}
                      </span>
                    </div>
                  </div>
                  <span
                    className={
                      isReplace
                        ? "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400"
                        : "rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary"
                    }
                  >
                    {isReplace ? "Substitui dieta existente" : "Nova dieta"}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  {d.meals.length} refeição(ões) · {totalItems} item(ns)
                </p>

                <div className="flex flex-col gap-2">
                  {d.meals.map((meal) => (
                    <div key={meal.order_index} className="rounded-lg bg-secondary/50 p-2">
                      <p className="text-xs font-medium">
                        {meal.name}
                        {meal.meal_time && <span className="text-muted-foreground"> · {meal.meal_time}</span>}
                      </p>
                      <ul className="mt-1 flex flex-col gap-0.5">
                        {meal.items.map((item, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            {item.food_name} — {item.quantity} {FOOD_UNIT_LABELS[item.unit as FoodUnit] ?? item.unit}{" "}
                            ({item.calories} kcal)
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}

          {submitError && (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          )}

          <Button type="button" onClick={handleConfirm} disabled={!canConfirm} className="w-full">
            {isPending ? "Importando..." : "Confirmar importação"}
          </Button>
        </div>
      )}
    </div>
  );
}
