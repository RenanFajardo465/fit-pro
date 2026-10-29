import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Fase 4 (Evolução) e resumo pós-treino (Fase 3) compartilham a mesma base:
 * o histórico de séries CONCLUÍDAS de sessões CONCLUÍDAS (nunca de sessões
 * abandonadas, nem séries puladas) de todo o usuário. Uma única consulta
 * aqui, usada pelos dois.
 */
export type CompletedSetRecord = {
  sessionId: string;
  sessionDate: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  weightKg: number | null;
  reps: number | null;
};

export async function getCompletedSetHistory(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CompletedSetRecord[]> {
  const { data } = await supabase
    .from("session_exercises")
    .select(
      "session_id, exercise_id, exercise_name, muscle_group, workout_sessions!inner(status, date), session_sets(weight_kg, reps, status)"
    )
    .eq("user_id", userId)
    .eq("workout_sessions.status", "completed")
    .not("exercise_id", "is", null);

  const records: CompletedSetRecord[] = [];
  for (const se of data ?? []) {
    const session = se.workout_sessions as { status: string; date: string } | null;
    if (!session) continue;
    for (const s of se.session_sets ?? []) {
      if (s.status !== "completed") continue;
      records.push({
        sessionId: se.session_id,
        sessionDate: session.date,
        exerciseId: se.exercise_id as string,
        exerciseName: se.exercise_name,
        muscleGroup: se.muscle_group,
        weightKg: s.weight_kg,
        reps: s.reps,
      });
    }
  }
  return records;
}

export type ExercisePR = {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  sessionId: string;
  sessionDate: string;
};

/** PR = maior carga já levantada numa série concluída, por exercício (decisão do usuário — ignora reps). */
export function computePersonalRecords(records: CompletedSetRecord[]): Map<string, ExercisePR> {
  const prs = new Map<string, ExercisePR>();
  for (const r of records) {
    if (r.weightKg === null) continue;
    const current = prs.get(r.exerciseId);
    if (!current || r.weightKg > current.maxWeightKg) {
      prs.set(r.exerciseId, {
        exerciseId: r.exerciseId,
        exerciseName: r.exerciseName,
        maxWeightKg: r.weightKg,
        sessionId: r.sessionId,
        sessionDate: r.sessionDate,
      });
    }
  }
  return prs;
}

export type WeeklyVolumePoint = { weekStart: string; volumeKg: number };

/** Segunda-feira da semana ISO de uma data flutuante YYYY-MM-DD (sem depender de fuso). */
function mondayOfWeek(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = dt.getUTCDay(); // 0 = domingo
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  dt.setUTCDate(dt.getUTCDate() + diffToMonday);
  return dt.toISOString().slice(0, 10);
}

/** Volume = soma de carga × repetições de toda série concluída com os dois valores preenchidos, agrupado por semana. */
export function computeWeeklyVolume(records: CompletedSetRecord[]): WeeklyVolumePoint[] {
  const byWeek = new Map<string, number>();
  for (const r of records) {
    if (r.weightKg === null || r.reps === null) continue;
    const weekStart = mondayOfWeek(r.sessionDate);
    byWeek.set(weekStart, (byWeek.get(weekStart) ?? 0) + r.weightKg * r.reps);
  }
  return Array.from(byWeek.entries())
    .map(([weekStart, volumeKg]) => ({ weekStart, volumeKg: Math.round(volumeKg * 100) / 100 }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
}

export type ExerciseLoadPoint = { sessionDate: string; maxWeightKg: number };

/** Progresso de carga: maior peso usado NAQUELA sessão (não toda série isolada) pro exercício escolhido, uma por sessão, em ordem cronológica. */
export function computeLoadProgress(records: CompletedSetRecord[], exerciseId: string): ExerciseLoadPoint[] {
  const bySession = new Map<string, { date: string; max: number }>();
  for (const r of records) {
    if (r.exerciseId !== exerciseId || r.weightKg === null) continue;
    const existing = bySession.get(r.sessionId);
    if (!existing || r.weightKg > existing.max) {
      bySession.set(r.sessionId, { date: r.sessionDate, max: r.weightKg });
    }
  }
  return Array.from(bySession.values())
    .map((v) => ({ sessionDate: v.date, maxWeightKg: v.max }))
    .sort((a, b) => (a.sessionDate < b.sessionDate ? -1 : 1));
}

export function listDistinctExercises(records: CompletedSetRecord[]): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const r of records) map.set(r.exerciseId, r.exerciseName);
  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
