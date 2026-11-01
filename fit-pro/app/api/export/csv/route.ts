import Papa from "papaparse";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { getCompletedSetHistory, computePersonalRecords } from "@/lib/workout/evolution";
import { getNutritionHistory } from "@/lib/nutrition/day-totals";

/**
 * Fase 6 — Exportação CSV (Fase 0, seção 23): um arquivo por entidade
 * (sessões, séries, volume por sessão, PRs, diário nutricional), zipados
 * num único download. Mesma fonte de dados do export JSON — nunca
 * divergem porque ambos partem das mesmas consultas/funções puras
 * (lib/workout/evolution.ts, lib/nutrition/day-totals.ts).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const userId = user.id;

  const [{ data: sessions }, completedSetHistory, nutritionHistory] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id, date, template_name, status, started_at, finished_at")
      .eq("user_id", userId)
      .order("date", { ascending: true }),
    getCompletedSetHistory(supabase, userId),
    getNutritionHistory(supabase, userId),
  ]);

  // Séries: uma linha por série concluída, com nome do treino resolvido via `sessions`.
  const sessionTemplateByDate = new Map<string, string>();
  for (const s of sessions ?? []) sessionTemplateByDate.set(s.id, s.template_name);

  const seriesRows = completedSetHistory.map((r) => ({
    session_date: r.sessionDate,
    template_name: sessionTemplateByDate.get(r.sessionId) ?? "",
    exercise_name: r.exerciseName,
    muscle_group: r.muscleGroup,
    weight_kg: r.weightKg ?? "",
    reps: r.reps ?? "",
  }));

  // Volume por sessão: soma de carga × repetições, agrupado por sessão (não por semana).
  const volumeBySession = new Map<string, { date: string; templateName: string; volumeKg: number }>();
  for (const r of completedSetHistory) {
    if (r.weightKg === null || r.reps === null) continue;
    const current = volumeBySession.get(r.sessionId) ?? {
      date: r.sessionDate,
      templateName: sessionTemplateByDate.get(r.sessionId) ?? "",
      volumeKg: 0,
    };
    current.volumeKg += r.weightKg * r.reps;
    volumeBySession.set(r.sessionId, current);
  }
  const volumeRows = Array.from(volumeBySession.values())
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((v) => ({
      session_date: v.date,
      template_name: v.templateName,
      volume_kg: Math.round(v.volumeKg * 100) / 100,
    }));

  const personalRecordsRows = Array.from(computePersonalRecords(completedSetHistory).values()).map((pr) => ({
    exercise_name: pr.exerciseName,
    max_weight_kg: pr.maxWeightKg,
    session_date: pr.sessionDate,
  }));

  const nutritionRows = nutritionHistory.map((d) => ({
    date: d.date,
    diet_name: d.dietName,
    diet_type: d.dietType,
    planned_calories: d.totals.plannedCalories,
    planned_protein_g: d.totals.plannedProteinG,
    planned_carbs_g: d.totals.plannedCarbsG,
    planned_fat_g: d.totals.plannedFatG,
    consumed_calories: d.totals.consumedCalories,
    consumed_protein_g: d.totals.consumedProteinG,
    consumed_carbs_g: d.totals.consumedCarbsG,
    consumed_fat_g: d.totals.consumedFatG,
  }));

  const sessionsRows = (sessions ?? []).map((s) => ({
    date: s.date,
    template_name: s.template_name,
    status: s.status,
    started_at: s.started_at,
    finished_at: s.finished_at ?? "",
  }));

  const zip = new JSZip();
  zip.file("sessoes.csv", Papa.unparse(sessionsRows));
  zip.file("series.csv", Papa.unparse(seriesRows));
  zip.file("volume_por_sessao.csv", Papa.unparse(volumeRows));
  zip.file("recordes_pessoais.csv", Papa.unparse(personalRecordsRows));
  zip.file("diario_nutricional.csv", Papa.unparse(nutritionRows));

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const date = new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="fit-pro-export-${date}.zip"`,
    },
  });
}
