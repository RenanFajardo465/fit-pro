"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDietCsv, type CsvRowIssue } from "@/lib/csv/diet-import";

export type ImportDietCsvSummary = {
  diets_count: number;
  meals_count: number;
  items_count: number;
  templates: { id: string; code: string; name: string }[];
};

export type ImportDietCsvResult =
  | { error: string; rowErrors?: CsvRowIssue[] }
  | { success: true; summary: ImportDietCsvSummary };

/**
 * Recebe o texto bruto do CSV (não o resultado já processado no navegador)
 * e reparseia do zero com a mesma função usada no preview — o servidor
 * nunca confia no agrupamento calculado no cliente (Fase 0, seção 22),
 * mesmo padrão de importWorkoutCsv.
 */
export async function importDietCsv(fileName: string, csvText: string): Promise<ImportDietCsvResult> {
  const parsed = parseDietCsv(csvText);
  if (parsed.errors.length > 0 || parsed.diets.length === 0) {
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

  const { data, error } = await supabase.rpc("import_diet_csv", {
    p_file_name: fileName,
    p_diets: parsed.diets,
  });

  if (error) {
    return { error: `Erro ao importar: ${error.message}` };
  }

  revalidatePath("/nutricao/dietas");
  revalidatePath("/nutricao/diario/[date]", "page");
  revalidatePath("/nutricao/importar");

  return { success: true, summary: data as ImportDietCsvSummary };
}
