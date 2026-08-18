"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, CheckCircle2, ChevronDown, ChevronUp, ArrowUp, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MUSCLE_GROUP_LABELS,
  GROUP_TYPE_LABELS,
  groupTypeForSize,
  metricUsesReps,
  metricUsesLoad,
  metricUsesDuration,
  metricUsesDistance,
  type MuscleGroup,
} from "@/lib/workout/vocabulary";
import {
  buildClusters,
  getGroupKey,
  getCurrentRound,
  getJustFinishedRound,
  isRoundComplete,
  getActiveGroupKey,
  computeRemainingSeconds,
} from "@/lib/workout/session-rounds";
import { completeSet, uncompleteSet } from "@/lib/actions/session-sets";
import { startRest, pauseRest, resumeRest, adjustRest, skipRest } from "@/lib/actions/session-rest";
import { finishWorkoutSession } from "@/lib/actions/session";
import { AbandonSessionButton } from "@/components/workout/abandon-session-button";

export type SessionExerciseForRunner = {
  id: string;
  exercise_name: string;
  muscle_group: string;
  metric_type: string;
  order_index: number;
  group_type: string;
  group_id: string | null;
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  duration_target_seconds: number | null;
  distance_target_meters: number | null;
  general_load_kg: number | null;
  rest_seconds: number;
};

export type SessionSetForRunner = {
  id: string;
  session_exercise_id: string;
  set_number: number;
  status: "pending" | "completed" | "skipped";
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
};

export type RestTimerState = {
  restEndsAt: string | null;
  pausedRemainingSeconds: number | null;
};

type SetValues = {
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
};

// Um único AudioContext reaproveitado entre descansos — criado (ou
// retomado) sempre dentro de um gesto real do usuário ("Concluir série"),
// o que evita a política de autoplay do navegador bloquear o som quando o
// descanso termina minutos depois, fora de qualquer clique.
let sharedAudioCtx: AudioContext | null = null;

function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedAudioCtx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      sharedAudioCtx = new Ctor();
    }
    if (sharedAudioCtx.state === "suspended") void sharedAudioCtx.resume();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/** Dois bipes curtos — alerta de fim de descanso (Fase 0, seções 14-15: incluído por padrão, com mudo por sessão). */
function playBeep() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  [0, 0.25].forEach((offset) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    const t0 = ctx.currentTime + offset;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(t0);
    oscillator.stop(t0 + 0.22);
  });
}

function restKey(groupKey: string, roundNumber: number) {
  return `${groupKey}:${roundNumber}`;
}

// Funções puras de módulo (fora do componente) que encapsulam Date.now()/
// `new Date()` sem argumento — o React Compiler sinaliza esses dois como
// chamadas impuras quando aparecem direto dentro do corpo de um componente,
// mas não quando estão numa função auxiliar comum como estas (mesmo padrão
// de getHoursSince em lib/date/today.ts, Fase 3 Incremento 1).
function isoNowPlusSeconds(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function isoNow(): string {
  return new Date().toISOString();
}

/**
 * Fase 3, Incremento 3: rodadas de bi-set/tri-set/superset (2 checks
 * individuais por bloco, não 1 compartilhado) + cronômetro de descanso.
 * Estado local otimista, como no Incremento 2 — o cronômetro em si sempre
 * deriva de rest_ends_at (nunca decrementa um contador em memória), então
 * sobrevive a segundo plano/bloqueio de tela sem perder precisão.
 */
export function SessionRunner({
  sessionId,
  exercises,
  sets,
  restRows,
}: {
  sessionId: string;
  exercises: SessionExerciseForRunner[];
  sets: SessionSetForRunner[];
  restRows: { group_key: string; round_number: number; rest_ends_at: string | null; paused_remaining_seconds: number | null }[];
}) {
  const [setsState, setSetsState] = useState(sets);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [expandedCompactIds, setExpandedCompactIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [muted, setMuted] = useState(false);
  const [dismissedRestKeys, setDismissedRestKeys] = useState<Set<string>>(new Set());

  const [restTimers, setRestTimers] = useState<Map<string, RestTimerState>>(() => {
    const map = new Map<string, RestTimerState>();
    for (const r of restRows) {
      map.set(restKey(r.group_key, r.round_number), {
        restEndsAt: r.rest_ends_at,
        pausedRemainingSeconds: r.paused_remaining_seconds,
      });
    }
    return map;
  });

  const clusters = useMemo(() => buildClusters(exercises), [exercises]);

  const totalSets = setsState.length;
  const completedCount = setsState.filter((s) => s.status === "completed").length;
  const pendingCount = setsState.filter((s) => s.status === "pending").length;

  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isFinishing, startFinishTransition] = useTransition();

  function handleFinishClick() {
    if (pendingCount > 0 && !confirmFinish) {
      setConfirmFinish(true);
      return;
    }
    setFinishError(null);
    startFinishTransition(async () => {
      const result = await finishWorkoutSession(sessionId);
      if (result && "error" in result) setFinishError(result.error);
    });
  }

  // FAB "ir para exercício atual": aponta pro primeiro bloco ainda não
  // concluído (não uma série específica — um bloco pode ter mais de uma
  // série "corrente" ao mesmo tempo, uma por exercício da rodada).
  const activeGroupKey = useMemo(() => getActiveGroupKey(clusters, setsState), [clusters, setsState]);

  const [notIntersecting, setNotIntersecting] = useState(false);
  useEffect(() => {
    if (!activeGroupKey) return;
    const el = document.getElementById(`session-cluster-${activeGroupKey}`);
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setNotIntersecting(!entry.isIntersecting), {
      threshold: 0.15,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeGroupKey]);
  const showFab = Boolean(activeGroupKey) && notIntersecting;

  function scrollToActiveCluster() {
    if (!activeGroupKey) return;
    document.getElementById(`session-cluster-${activeGroupKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSaveSet(
    setId: string,
    exerciseId: string,
    groupKey: string,
    clusterExerciseIds: string[],
    roundRestSeconds: number,
    values: SetValues
  ) {
    // Desbloqueia o áudio dentro deste gesto do usuário — antes de qualquer
    // await — para o bipe do descanso funcionar mesmo minutos depois.
    ensureAudioContext();

    const previous = setsState.find((s) => s.id === setId);
    if (!previous) return;

    const nextSets = setsState.map((s) => (s.id === setId ? { ...s, status: "completed" as const, ...values } : s));
    setSetsState(nextSets);
    setSavingIds((prev) => new Set(prev).add(setId));
    setErrors((prev) => {
      const next = new Map(prev);
      next.delete(setId);
      return next;
    });

    const result = await completeSet({
      setId,
      sessionId,
      sessionExerciseId: exerciseId,
      ...values,
    });

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(setId);
      return next;
    });

    if (result && "error" in result) {
      setSetsState((prev) => prev.map((s) => (s.id === setId ? previous : s)));
      setErrors((prev) => new Map(prev).set(setId, result.error));
      return;
    }

    setEditingSetId(null);

    const roundNumber = previous.set_number;
    if (roundRestSeconds > 0 && isRoundComplete(clusterExerciseIds, roundNumber, nextSets)) {
      void triggerStartRest(groupKey, roundNumber, roundRestSeconds);
    }
  }

  async function triggerStartRest(groupKey: string, roundNumber: number, seconds: number) {
    const key = restKey(groupKey, roundNumber);
    const endsAt = isoNowPlusSeconds(seconds);
    setRestTimers((prev) => new Map(prev).set(key, { restEndsAt: endsAt, pausedRemainingSeconds: null }));
    setDismissedRestKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

    const result = await startRest({ sessionId, groupKey, roundNumber, seconds });
    // Falha ao persistir não é crítica: o cronômetro local já está rodando
    // e termina normalmente — só não sobreviveria a um reload no meio do
    // descanso. Se deu certo, reconcilia com o valor vigente no banco (caso
    // outra chamada tenha vencido a corrida do upsert idempotente).
    if (!("error" in result) && result.rest) {
      setRestTimers((prev) =>
        new Map(prev).set(key, {
          restEndsAt: result.rest!.rest_ends_at,
          pausedRemainingSeconds: result.rest!.paused_remaining_seconds,
        })
      );
    }
  }

  async function handleUndoSet(setId: string) {
    const previous = setsState.find((s) => s.id === setId);
    if (!previous) return;

    setSetsState((prev) =>
      prev.map((s) =>
        s.id === setId
          ? { ...s, status: "pending", weight_kg: null, reps: null, duration_seconds: null, distance_meters: null }
          : s
      )
    );
    setSavingIds((prev) => new Set(prev).add(setId));

    const result = await uncompleteSet({ setId, sessionId });

    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(setId);
      return next;
    });

    if (result && "error" in result) {
      setSetsState((prev) => prev.map((s) => (s.id === setId ? previous : s)));
      setErrors((prev) => new Map(prev).set(setId, result.error));
    } else {
      setEditingSetId(null);
    }
  }

  function updateRestLocal(key: string, next: RestTimerState) {
    setRestTimers((prev) => new Map(prev).set(key, next));
  }

  async function handlePauseRest(groupKey: string, roundNumber: number) {
    const key = restKey(groupKey, roundNumber);
    const current = restTimers.get(key);
    if (!current || !current.restEndsAt) return;
    const remaining = computeRemainingSeconds(current.restEndsAt, null);
    updateRestLocal(key, { restEndsAt: null, pausedRemainingSeconds: remaining });
    await pauseRest({ sessionId, groupKey, roundNumber });
  }

  async function handleResumeRest(groupKey: string, roundNumber: number) {
    const key = restKey(groupKey, roundNumber);
    const current = restTimers.get(key);
    if (!current || current.pausedRemainingSeconds == null) return;
    const endsAt = isoNowPlusSeconds(current.pausedRemainingSeconds);
    updateRestLocal(key, { restEndsAt: endsAt, pausedRemainingSeconds: null });
    await resumeRest({ sessionId, groupKey, roundNumber });
  }

  async function handleAdjustRest(groupKey: string, roundNumber: number, delta: number) {
    const key = restKey(groupKey, roundNumber);
    const current = restTimers.get(key);
    if (!current) return;
    if (current.restEndsAt) {
      const endsAt = new Date(new Date(current.restEndsAt).getTime() + delta * 1000).toISOString();
      updateRestLocal(key, { ...current, restEndsAt: endsAt });
    } else if (current.pausedRemainingSeconds != null) {
      updateRestLocal(key, { ...current, pausedRemainingSeconds: Math.max(0, current.pausedRemainingSeconds + delta) });
    }
    await adjustRest({ sessionId, groupKey, roundNumber, deltaSeconds: delta });
  }

  async function handleSkipRest(groupKey: string, roundNumber: number) {
    const key = restKey(groupKey, roundNumber);
    const current = restTimers.get(key);
    if (!current) return;
    updateRestLocal(key, { restEndsAt: isoNow(), pausedRemainingSeconds: null });
    await skipRest({ sessionId, groupKey, roundNumber });
  }

  function handleDismissRest(groupKey: string, roundNumber: number) {
    setDismissedRestKeys((prev) => new Set(prev).add(restKey(groupKey, roundNumber)));
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {completedCount}/{totalSets} séries concluídas
        </p>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="flex items-center gap-1 text-xs text-muted-foreground"
          aria-label={muted ? "Ativar som do descanso" : "Silenciar som do descanso"}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {muted ? "Mudo" : "Som"}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {clusters.map((cluster) => {
          const isGroup = cluster.length > 1;
          const groupKey = getGroupKey(cluster);
          const clusterExerciseIds = cluster.map((e) => e.id);
          const currentRound = getCurrentRound(clusterExerciseIds, setsState);
          const roundRestSeconds = cluster[cluster.length - 1].rest_seconds;

          const justFinishedRound = getJustFinishedRound(clusterExerciseIds, setsState);
          const timerKey = justFinishedRound != null ? restKey(groupKey, justFinishedRound) : null;
          const timerState = timerKey ? restTimers.get(timerKey) : undefined;
          const showTimer = Boolean(timerState) && !dismissedRestKeys.has(timerKey!);

          const block = (
            <div className="flex flex-col gap-2">
              {cluster.map((exercise) => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  exSetsSorted={setsState
                    .filter((s) => s.session_exercise_id === exercise.id)
                    .sort((a, b) => a.set_number - b.set_number)}
                  currentRound={currentRound}
                  editingSetId={editingSetId}
                  onStartEdit={setEditingSetId}
                  onCancelEdit={() => setEditingSetId(null)}
                  onSave={(setId, values) =>
                    handleSaveSet(setId, exercise.id, groupKey, clusterExerciseIds, roundRestSeconds, values)
                  }
                  onUndo={handleUndoSet}
                  savingIds={savingIds}
                  errors={errors}
                  expandedCompact={expandedCompactIds.has(exercise.id)}
                  onToggleCompact={() =>
                    setExpandedCompactIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(exercise.id)) next.delete(exercise.id);
                      else next.add(exercise.id);
                      return next;
                    })
                  }
                  showRestHint={!isGroup || exercise.id === cluster[cluster.length - 1].id}
                />
              ))}
            </div>
          );

          return (
            <div key={groupKey} id={`session-cluster-${groupKey}`} className="flex flex-col gap-2">
              {isGroup ? (
                <div className="flex flex-col gap-2 rounded-2xl border-2 border-primary/40 bg-primary/5 p-2">
                  <span className="px-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    {GROUP_TYPE_LABELS[groupTypeForSize(cluster.length)]}
                    {roundRestSeconds ? ` · descanso ${roundRestSeconds}s ao final da rodada` : ""}
                  </span>
                  {block}
                </div>
              ) : (
                block
              )}

              {showTimer && timerState && justFinishedRound != null && (
                <RestTimerCard
                  state={timerState}
                  muted={muted}
                  onPause={() => handlePauseRest(groupKey, justFinishedRound)}
                  onResume={() => handleResumeRest(groupKey, justFinishedRound)}
                  onAdjust={(delta) => handleAdjustRest(groupKey, justFinishedRound, delta)}
                  onSkip={() => handleSkipRest(groupKey, justFinishedRound)}
                  onDismiss={() => handleDismissRest(groupKey, justFinishedRound)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 pt-2">
        {confirmFinish && pendingCount > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {pendingCount} série(s) ainda pendente(s) — serão marcadas como puladas. Toque de novo
            para confirmar.
          </p>
        )}
        <Button type="button" size="lg" onClick={handleFinishClick} disabled={isFinishing}>
          {isFinishing ? "Finalizando..." : confirmFinish ? "Confirmar finalização" : "Finalizar treino"}
        </Button>
        {finishError && (
          <p className="text-sm text-destructive" role="alert">
            {finishError}
          </p>
        )}
        <AbandonSessionButton sessionId={sessionId} />
      </div>

      {showFab && (
        <button
          type="button"
          onClick={scrollToActiveCluster}
          className="fixed left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
        >
          <ArrowUp className="h-4 w-4" />
          Ir para exercício atual
        </button>
      )}
    </div>
  );
}

function RestTimerCard({
  state,
  muted,
  onPause,
  onResume,
  onAdjust,
  onSkip,
  onDismiss,
}: {
  state: RestTimerState;
  muted: boolean;
  onPause: () => void;
  onResume: () => void;
  onAdjust: (delta: number) => void;
  onSkip: () => void;
  onDismiss: () => void;
}) {
  // Só força re-render em loop enquanto o cronômetro está rodando; pausado
  // não precisa (o valor não muda sozinho). O tempo em si é sempre
  // recalculado de state.restEndsAt — este contador só serve pra "acordar"
  // o componente a cada 250ms, nunca é ele que guarda o tempo restante.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!state.restEndsAt) return;
    const id = setInterval(() => forceTick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [state.restEndsAt]);

  const remaining = computeRemainingSeconds(state.restEndsAt, state.pausedRemainingSeconds);
  const isRunning = state.restEndsAt !== null;
  const isDone = remaining <= 0;

  const playedRef = useRef(false);
  useEffect(() => {
    if (isRunning && isDone) {
      if (!playedRef.current) {
        playedRef.current = true;
        if (!muted) playBeep();
      }
    } else {
      playedRef.current = false;
    }
  }, [isRunning, isDone, muted]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const label = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {isDone ? "Descanso concluído" : "Descansando..."}
        </span>
        {isDone && (
          <button type="button" onClick={onDismiss} className="text-xs text-muted-foreground underline">
            Fechar
          </button>
        )}
      </div>
      <p className="text-center text-4xl font-semibold tabular-nums">{label}</p>
      {!isDone && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onAdjust(15)}>
            +15s
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onAdjust(30)}>
            +30s
          </Button>
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={isRunning ? onPause : onResume}>
            {isRunning ? "Pausar" : "Retomar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
            Pular
          </Button>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  exercise,
  exSetsSorted,
  currentRound,
  editingSetId,
  onStartEdit,
  onCancelEdit,
  onSave,
  onUndo,
  savingIds,
  errors,
  expandedCompact,
  onToggleCompact,
  showRestHint,
}: {
  exercise: SessionExerciseForRunner;
  exSetsSorted: SessionSetForRunner[];
  currentRound: number | null;
  editingSetId: string | null;
  onStartEdit: (setId: string) => void;
  onCancelEdit: () => void;
  onSave: (setId: string, values: SetValues) => void;
  onUndo: (setId: string) => void;
  savingIds: Set<string>;
  errors: Map<string, string>;
  expandedCompact: boolean;
  onToggleCompact: () => void;
  showRestHint: boolean;
}) {
  const isComplete = exSetsSorted.length > 0 && exSetsSorted.every((s) => s.status !== "pending");
  const hasEditingSet = editingSetId !== null && exSetsSorted.some((s) => s.id === editingSetId);
  const expanded = !isComplete || hasEditingSet || expandedCompact;

  const prescriptionSummary = [
    `${exercise.sets}× ${exercise.reps_min ?? "?"}–${exercise.reps_max ?? "?"}`,
    exercise.general_load_kg ? `${exercise.general_load_kg} kg` : null,
    exercise.duration_target_seconds ? `${exercise.duration_target_seconds}s` : null,
    exercise.distance_target_meters ? `${exercise.distance_target_meters}m` : null,
    showRestHint && exercise.rest_seconds ? `descanso ${exercise.rest_seconds}s` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!expanded) {
    const lastCompleted = [...exSetsSorted].reverse().find((s) => s.status === "completed");
    return (
      <button
        type="button"
        onClick={onToggleCompact}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 text-left"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
          <div className="flex flex-col">
            <span className="font-medium">{exercise.exercise_name}</span>
            <span className="text-xs text-muted-foreground">
              {exercise.sets} séries concluídas
              {lastCompleted?.weight_kg != null ? ` · última ${lastCompleted.weight_kg}kg` : ""}
              {lastCompleted?.reps != null ? ` × ${lastCompleted.reps}` : ""}
            </span>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{exercise.exercise_name}</p>
          <p className="text-xs text-muted-foreground">
            {MUSCLE_GROUP_LABELS[exercise.muscle_group as MuscleGroup] ?? exercise.muscle_group}
            {" · "}
            {prescriptionSummary}
          </p>
        </div>
        {isComplete && (
          <button
            type="button"
            onClick={onToggleCompact}
            className="shrink-0 text-muted-foreground"
            aria-label="Recolher"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {exSetsSorted.map((set) => {
          const isCurrent = set.status === "pending" && set.set_number === currentRound;
          const isEditing = set.id === editingSetId;

          if (set.status === "pending" && !isCurrent) {
            return (
              <div
                key={set.id}
                className="rounded-xl border border-dashed border-border p-2.5 text-sm text-muted-foreground opacity-60"
              >
                Série {set.set_number}
              </div>
            );
          }

          if (set.status === "skipped") {
            return (
              <div
                key={set.id}
                className="rounded-xl border border-border p-2.5 text-sm text-muted-foreground line-through opacity-60"
              >
                Série {set.set_number} — pulada
              </div>
            );
          }

          if (set.status === "completed" && !isEditing) {
            return (
              <button
                key={set.id}
                type="button"
                onClick={() => onStartEdit(set.id)}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-secondary/40 p-2.5 text-left text-sm"
              >
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Série {set.set_number}
                    {" — "}
                    {[
                      set.weight_kg != null ? `${set.weight_kg}kg` : null,
                      set.reps != null ? `${set.reps} reps` : null,
                      set.duration_seconds != null ? `${set.duration_seconds}s` : null,
                      set.distance_meters != null ? `${set.distance_meters}m` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">editar</span>
              </button>
            );
          }

          // Corrente (pending, editável agora) ou uma série concluída reaberta.
          const defaults = getDefaultsForSet(exercise, exSetsSorted, set);
          return (
            <SetForm
              key={set.id}
              exercise={exercise}
              set={set}
              defaults={defaults}
              saving={savingIds.has(set.id)}
              error={errors.get(set.id) ?? null}
              isEditingCompleted={set.status === "completed"}
              onSave={(values) => onSave(set.id, values)}
              onCancel={onCancelEdit}
              onUndo={() => onUndo(set.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function getDefaultsForSet(
  exercise: SessionExerciseForRunner,
  exSetsSorted: SessionSetForRunner[],
  set: SessionSetForRunner
): SetValues {
  const priorWithWeight = [...exSetsSorted]
    .reverse()
    .find((s) => s.set_number < set.set_number && s.weight_kg != null);

  return {
    weightKg: set.weight_kg ?? priorWithWeight?.weight_kg ?? exercise.general_load_kg ?? null,
    reps: set.reps ?? exercise.reps_max ?? exercise.reps_min ?? null,
    durationSeconds: set.duration_seconds ?? exercise.duration_target_seconds ?? null,
    distanceMeters: set.distance_meters ?? exercise.distance_target_meters ?? null,
  };
}

function SetForm({
  exercise,
  set,
  defaults,
  saving,
  error,
  isEditingCompleted,
  onSave,
  onCancel,
  onUndo,
}: {
  exercise: SessionExerciseForRunner;
  set: SessionSetForRunner;
  defaults: SetValues;
  saving: boolean;
  error: string | null;
  isEditingCompleted: boolean;
  onSave: (values: SetValues) => void;
  onCancel: () => void;
  onUndo: () => void;
}) {
  const usesReps = metricUsesReps(exercise.metric_type);
  const usesLoad = metricUsesLoad(exercise.metric_type);
  const usesDuration = metricUsesDuration(exercise.metric_type);
  const usesDistance = metricUsesDistance(exercise.metric_type);

  // key={set.id} no ponto de uso remonta este form ao trocar de série, então
  // é seguro inicializar o estado local só a partir dos defaults recebidos.
  const [weight, setWeight] = useState(defaults.weightKg?.toString() ?? "");
  const [reps, setReps] = useState(defaults.reps?.toString() ?? "");
  const [duration, setDuration] = useState(defaults.durationSeconds?.toString() ?? "");
  const [distance, setDistance] = useState(defaults.distanceMeters?.toString() ?? "");

  const primaryFilled = usesDuration ? duration.trim() !== "" : usesReps ? reps.trim() !== "" : true;

  function handleSubmit() {
    onSave({
      weightKg: usesLoad && weight.trim() !== "" ? Number(weight) : null,
      reps: usesReps && reps.trim() !== "" ? Number(reps) : null,
      durationSeconds: usesDuration && duration.trim() !== "" ? Number(duration) : null,
      distanceMeters: usesDistance && distance.trim() !== "" ? Number(distance) : null,
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-2.5",
        isEditingCompleted ? "border-border bg-secondary/20" : "border-primary/50 bg-primary/5"
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">Série {set.set_number}</p>
      <div className="flex flex-wrap gap-2">
        {usesLoad && (
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            Carga (kg)
            <Input
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
            />
          </label>
        )}
        {usesReps && (
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            Reps
            <Input
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder={exercise.reps_max ? String(exercise.reps_max) : "0"}
            />
          </label>
        )}
        {usesDuration && (
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            Duração (s)
            <Input
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="0"
            />
          </label>
        )}
        {usesDistance && (
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            Distância (m)
            <Input
              inputMode="decimal"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="0"
            />
          </label>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error} — os valores digitados foram mantidos, toque em concluir para tentar de novo.
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={handleSubmit} disabled={saving || !primaryFilled}>
          {saving ? "Salvando..." : "Concluir série"}
        </Button>
        {isEditingCompleted && (
          <>
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" variant="ghost" onClick={onUndo} disabled={saving}>
              Desfazer
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
