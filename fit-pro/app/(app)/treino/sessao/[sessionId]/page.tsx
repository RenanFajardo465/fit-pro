import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { MUSCLE_GROUP_LABELS, GROUP_TYPE_LABELS, groupTypeForSize, type MuscleGroup } from "@/lib/workout/vocabulary";
import { buildClusters } from "@/lib/workout/session-rounds";
import { SessionRunner, type SessionExerciseForRunner, type SessionSetForRunner } from "@/components/workout/session-runner";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "Em andamento",
  completed: "Concluído",
  abandoned: "Abandonado",
};

export default async function SessaoPage(props: PageProps<"/treino/sessao/[sessionId]">) {
  const { sessionId } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("id, template_name, started_at, status")
    .eq("id", sessionId)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!session) notFound();

  const { data: exercises } = await supabase
    .from("session_exercises")
    .select(
      "id, exercise_name, muscle_group, metric_type, order_index, group_type, group_id, sets, reps_min, reps_max, duration_target_seconds, distance_target_meters, initial_load_kg, general_load_kg, rest_seconds"
    )
    .eq("session_id", sessionId)
    .order("order_index", { ascending: true });

  const { data: sets } = await supabase
    .from("session_sets")
    .select("id, session_exercise_id, set_number, status, weight_kg, reps, duration_seconds, distance_meters")
    .in("session_exercise_id", (exercises ?? []).map((e) => e.id))
    .order("set_number", { ascending: true });

  const { data: restRows } = await supabase
    .from("session_group_rest")
    .select("group_key, round_number, rest_ends_at, paused_remaining_seconds")
    .eq("session_id", sessionId);

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/treino" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Treino
      </Link>

      <div>
        <p className="text-sm text-muted-foreground">{STATUS_LABELS[session.status] ?? session.status}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{session.template_name}</h1>
      </div>

      {session.status === "in_progress" ? (
        <SessionRunner
          sessionId={session.id}
          exercises={(exercises ?? []) as SessionExerciseForRunner[]}
          sets={(sets ?? []) as SessionSetForRunner[]}
          restRows={restRows ?? []}
        />
      ) : (
        <ReadOnlySummary
          exercises={(exercises ?? []) as SessionExerciseForRunner[]}
          sets={(sets ?? []) as SessionSetForRunner[]}
        />
      )}
    </div>
  );
}

/** Sessões já concluídas/abandonadas: só leitura, sem nenhum controle. */
function ReadOnlySummary({
  exercises,
  sets,
}: {
  exercises: SessionExerciseForRunner[];
  sets: SessionSetForRunner[];
}) {
  const setsByExercise = new Map<string, SessionSetForRunner[]>();
  for (const s of sets) {
    if (!setsByExercise.has(s.session_exercise_id)) setsByExercise.set(s.session_exercise_id, []);
    setsByExercise.get(s.session_exercise_id)!.push(s);
  }

  const clusters = buildClusters(exercises);

  return (
    <div className="flex flex-col gap-3">
      {clusters.map((cluster) => {
        const isGroup = cluster.length > 1;
        const block = (
          <div className="flex flex-col gap-2">
            {cluster.map((item) => {
              const itemSets = (setsByExercise.get(item.id) ?? []).sort((a, b) => a.set_number - b.set_number);
              return (
                <Card key={item.id} className="flex flex-col gap-2">
                  <p className="font-medium">{item.exercise_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {MUSCLE_GROUP_LABELS[item.muscle_group as MuscleGroup] ?? item.muscle_group}
                    {" · "}
                    {item.sets}× {item.reps_min ?? "?"}–{item.reps_max ?? "?"}
                    {item.general_load_kg ? ` · ${item.general_load_kg} kg` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {itemSets.map((s) => (
                      <span
                        key={s.set_number}
                        className={`rounded-full px-2 py-1 text-[11px] ${
                          s.status === "completed"
                            ? "bg-primary text-primary-foreground"
                            : s.status === "skipped"
                              ? "bg-secondary text-muted-foreground line-through"
                              : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {s.set_number}
                        {s.status === "completed" && s.weight_kg != null ? ` · ${s.weight_kg}kg` : ""}
                      </span>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        );

        if (!isGroup) return <div key={cluster[0].id}>{block}</div>;

        return (
          <div
            key={cluster[0].group_id}
            className="flex flex-col gap-2 rounded-2xl border-2 border-primary/40 bg-primary/5 p-2"
          >
            <span className="px-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {GROUP_TYPE_LABELS[groupTypeForSize(cluster.length)]}
            </span>
            {block}
          </div>
        );
      })}
    </div>
  );
}
