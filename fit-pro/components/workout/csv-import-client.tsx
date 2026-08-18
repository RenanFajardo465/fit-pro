"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MUSCLE_GROUP_LABELS, GROUP_TYPE_LABELS, type MuscleGroup } from "@/lib/workout/vocabulary";
import { parseWorkoutCsv, type WorkoutCsvInput, type CsvRowIssue } from "@/lib/csv/workout-import";
import { importWorkoutCsv } from "@/lib/actions/import-workout-csv";

export function CsvImportWorkout({
  existingExerciseNames,
  existingTemplateCodes,
}: {
  existingExerciseNames: string[];
  existingTemplateCodes: string[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutCsvInput[]>([]);
  const [errors, setErrors] = useState<CsvRowIssue[]>([]);
  const [warnings, setWarnings] = useState<CsvRowIssue[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const existingNamesLower = useMemo(
    () => new Set(existingExerciseNames.map((n) => n.toLowerCase())),
    [existingExerciseNames]
  );
  const existingCodesSet = useMemo(() => new Set(existingTemplateCodes), [existingTemplateCodes]);

  async function handleFile(file: File) {
    setSubmitError(null);
    setSuccess(null);
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    const result = parseWorkoutCsv(text);
    setWorkouts(result.workouts);
    setErrors(result.errors);
    setWarnings(result.warnings);
  }

  function handleConfirm() {
    if (!csvText || !fileName) return;
    setSubmitError(null);
    startTransition(async () => {
      const result = await importWorkoutCsv(fileName, csvText);
      if ("error" in result) {
        setSubmitError(result.error);
        return;
      }
      setSuccess(
        `Importado: ${result.summary.workouts_count} treino(s), ${result.summary.items_count} exercício(s), ${result.summary.exercises_created_count} exercício(s) novo(s) criado(s) na biblioteca.`
      );
      setWorkouts([]);
      setCsvText(null);
      setFileName(null);
      router.refresh();
    });
  }

  const canConfirm = workouts.length > 0 && errors.length === 0 && !isPending;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Selecione o arquivo CSV no formato oficial de treino (colunas documentadas na Fase 0).
          Importar um código de treino que já existe substitui os exercícios dele — não duplica.
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

      {workouts.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Prévia — confira antes de confirmar:
          </p>
          {workouts.map((w) => {
            const isReplace = existingCodesSet.has(w.code);
            return (
              <Card key={w.code} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                      {w.code}
                    </span>
                    <span className="font-medium">{w.name}</span>
                  </div>
                  <span
                    className={
                      isReplace
                        ? "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400"
                        : "rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary"
                    }
                  >
                    {isReplace ? "Substitui treino existente" : "Novo treino"}
                  </span>
                </div>

                <ul className="flex flex-col gap-1">
                  {w.items.map((item, i) => {
                    const isNewExercise = !existingNamesLower.has(item.exercise_name.toLowerCase());
                    return (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-2 py-1.5 text-xs"
                      >
                        <span>
                          {item.group_type !== "single" && (
                            <span className="mr-1 text-muted-foreground">
                              [{GROUP_TYPE_LABELS[item.group_type]}]
                            </span>
                          )}
                          {item.exercise_name}
                          <span className="text-muted-foreground">
                            {" "}
                            · {MUSCLE_GROUP_LABELS[item.muscle_group as MuscleGroup] ?? item.muscle_group}
                          </span>
                        </span>
                        {isNewExercise && (
                          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                            novo exercício
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
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
