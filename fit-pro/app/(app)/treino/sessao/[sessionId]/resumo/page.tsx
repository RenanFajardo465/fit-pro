import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, Clock, Dumbbell, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCompletedSetHistory, computePersonalRecords } from "@/lib/workout/evolution";

function formatDuration(startedAt: string, finishedAt: string): string {
  const minutes = Math.max(0, Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export default async function SessionResumoPage(props: PageProps<"/treino/sessao/[sessionId]/resumo">) {
  const { sessionId } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sessionRow } = await supabase
    .from("workout_sessions")
    .select("id, template_name, date, started_at, finished_at, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Resumo só existe pra sessão concluída (finishWorkoutSession redireciona
  // pra cá só depois de marcar status='completed') — qualquer outro caso
  // (sessão de outro usuário, ainda em andamento, ou inexistente) não tem
  // o que resumir.
  if (!sessionRow || sessionRow.status !== "completed" || !sessionRow.finished_at) {
    redirect("/treino");
  }

  const { data: exercisesRaw } = await supabase
    .from("session_exercises")
    .select("id, order_index, exercise_id, exercise_name, muscle_group, session_sets(weight_kg, reps, status)")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });

  const exercises = exercisesRaw ?? [];

  const perExercise = exercises.map((ex) => {
    const sets = ex.session_sets ?? [];
    const completedSets = sets.filter((s) => s.status === "completed");
    const skippedCount = sets.filter((s) => s.status === "skipped").length;
    const bestWeightKg = completedSets.reduce<number | null>(
      (max, s) => (s.weight_kg !== null && (max === null || s.weight_kg > max) ? s.weight_kg : max),
      null
    );
    const volumeKg = completedSets.reduce(
      (sum, s) => sum + (s.weight_kg !== null && s.reps !== null ? s.weight_kg * s.reps : 0),
      0
    );
    return {
      id: ex.id,
      exerciseId: ex.exercise_id,
      exerciseName: ex.exercise_name,
      muscleGroup: ex.muscle_group,
      bestWeightKg,
      completedCount: completedSets.length,
      skippedCount,
      volumeKg,
    };
  });

  const setsCompleted = perExercise.reduce((sum, ex) => sum + ex.completedCount, 0);
  const setsSkipped = perExercise.reduce((sum, ex) => sum + ex.skippedCount, 0);
  const totalVolumeKg = perExercise.reduce((sum, ex) => sum + ex.volumeKg, 0);

  const history = await getCompletedSetHistory(supabase, user.id);
  const prs = computePersonalRecords(history);

  const newPRs = perExercise.filter(
    (ex) =>
      ex.exerciseId &&
      ex.bestWeightKg !== null &&
      prs.get(ex.exerciseId)?.sessionId === sessionId &&
      prs.get(ex.exerciseId)?.maxWeightKg === ex.bestWeightKg
  );

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col items-center gap-1 py-2 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Treino concluído!</h1>
        <p className="text-sm text-muted-foreground">{sessionRow.template_name}</p>
      </div>

      {newPRs.length > 0 && (
        <Card className="flex flex-col gap-2 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              {newPRs.length} recorde{newPRs.length > 1 ? "s" : ""} pessoal{newPRs.length > 1 ? "is" : ""} batido
              {newPRs.length > 1 ? "s" : ""}!
            </p>
          </div>
          <ul className="flex flex-col gap-0.5 text-sm">
            {newPRs.map((ex) => (
              <li key={ex.id}>
                {ex.exerciseName} — {ex.bestWeightKg}kg
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Card className="flex flex-col items-center gap-1 py-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{formatDuration(sessionRow.started_at, sessionRow.finished_at)}</span>
          <span className="text-[10px] text-muted-foreground">Duração</span>
        </Card>
        <Card className="flex flex-col items-center gap-1 py-3">
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{Math.round(totalVolumeKg)}kg</span>
          <span className="text-[10px] text-muted-foreground">Volume total</span>
        </Card>
        <Card className="flex flex-col items-center gap-1 py-3">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {setsCompleted}
            {setsSkipped > 0 && <span className="text-muted-foreground">/{setsCompleted + setsSkipped}</span>}
          </span>
          <span className="text-[10px] text-muted-foreground">Séries feitas</span>
        </Card>
      </div>

      <Card className="flex flex-col gap-2">
        <p className="text-sm font-medium">Melhor série por exercício</p>
        <ul className="flex flex-col gap-1.5">
          {perExercise.map((ex) => (
            <li key={ex.id} className="flex items-center justify-between text-sm">
              <span>{ex.exerciseName}</span>
              <span className="text-muted-foreground">{ex.bestWeightKg !== null ? `${ex.bestWeightKg}kg` : "—"}</span>
            </li>
          ))}
        </ul>
      </Card>

      {setsSkipped > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          {setsSkipped} série{setsSkipped > 1 ? "s" : ""} ficou{setsSkipped > 1 ? "aram" : ""} pendente
          {setsSkipped > 1 ? "s" : ""} e foi{setsSkipped > 1 ? "ram" : ""} marcada{setsSkipped > 1 ? "s" : ""} como
          pulada{setsSkipped > 1 ? "s" : ""} ao finalizar.
        </p>
      )}

      <div className="flex gap-2">
        <Link href="/evolucao" className="flex-1">
          <Button type="button" variant="outline" className="w-full">
            Ver evolução
          </Button>
        </Link>
        <Link href="/treino" className="flex-1">
          <Button type="button" className="w-full">
            Voltar
          </Button>
        </Link>
      </div>
    </div>
  );
}
