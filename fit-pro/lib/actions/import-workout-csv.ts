"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseWorkoutCsv, type CsvRowIssue } from "@/lib/csv/workout-import";

export type ImportWorkoutCsvSummary = {
  workouts_count: number;
  items_count: number;
  exercises_created_count: number;
  templates: { id: string; code: string; name: string }[];
};

export type ImportWorkoutCsvResult =
  | { error: string; rowErrors?: CsvRowIssue[] }
  | { success: true; summary: ImportWorkoutCsvSummary };

/**
 * Recebe o texto bruto do CSV (não o resultado já processado no navegador)
 * e reparseia do zero com a mesma função usada no preview — o servidor
 * nunca confia no agrupamento calculado no cliente (Fase 0, seção 22).
 */
export async function importWorkoutCsv(
  fileName: string,
  csvText: string
): Promise<ImportWorkoutCsvResult> {
  const parsed = parseWorkoutCsv(csvText);
  if (parsed.errors.length > 0 || parsed.workouts.length === 0) {
    return {
      error: "CSV inválido — corrija os erros indicados e tente novamente.",
      rowErrors: parsed.errors,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("import_workout_csv", {
    p_file_name: fileName,
    p_workouts: parsed.workouts,
  });

  if (error) {
    return { error: `Erro ao importar: ${error.message}` };
  }

  revalidatePath("/treino/templates");
  revalidatePath("/treino/importar");

  return { success: true, summary: data as ImportWorkoutCsvSummary };
}
