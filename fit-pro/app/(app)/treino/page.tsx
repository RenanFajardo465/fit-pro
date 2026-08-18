import Link from "next/link";
import { ChevronRight, Dumbbell, ClipboardList, Upload, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAppToday, getAppDateOf, getHoursSince } from "@/lib/date/today";
import { loadRecommendationContext } from "@/lib/workout/load-recommendation-context";
import { resolveWorkoutForDate } from "@/lib/workout/recommendation";
import { StartSessionButton } from "@/components/workout/start-session-button";
import { AbandonSessionButton } from "@/components/workout/abandon-session-button";

const LINKS = [
  {
    href: "/treino/biblioteca",
    icon: Dumbbell,
    title: "Biblioteca de exercícios",
    subtitle: "Cadastre e organize seus exercícios",
  },
  {
    href: "/treino/templates",
    icon: ClipboardList,
    title: "Templates de treino",
    subtitle: "Monte os treinos (A, B, C...) com séries, reps e agrupamentos",
  },
  {
    href: "/treino/importar",
    icon: Upload,
    title: "Importar CSV",
    subtitle: "Importe treinos prontos gerados por um agente de IA",
  },
] as const;

// Limite de "treino esquecido" (Fase 0, seção 10): 4h desde started_at, OU
// a sessão ter começado num dia de calendário anterior ao de hoje — o que
// vier primeiro.
const FORGOTTEN_SESSION_HOURS = 4;

export default async function TreinoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: activeSession } = await supabase
    .from("workout_sessions")
    .select("id, template_name, started_at, date")
    .eq("user_id", user!.id)
    .eq("status", "in_progress")
    .maybeSingle();

  let recommendedTemplate: { id: string; code: string; name: string } | null = null;
  let recommendationReason: string | null = null;

  if (!activeSession) {
    const today = getAppToday();
    const context = await loadRecommendationContext(supabase, user!.id);
    const { data: manualOverride } = await supabase
      .from("manual_overrides")
      .select("template_id")
      .eq("user_id", user!.id)
      .eq("date", today.date)
      .maybeSingle();

    const resolution = resolveWorkoutForDate({
      date: today.date,
      weekday: today.weekday,
      mode: context.mode,
      templatesInOrder: context.templatesInOrder,
      sequenceState: context.sequenceState,
      weekdayAssignments: context.weekdayAssignments,
      rules: context.rules,
      activities: context.activities,
      templateMuscleGroups: context.templateMuscleGroups,
      manualOverride: manualOverride ?? null,
    });

    recommendedTemplate = resolution.templateId
      ? (context.templatesInOrder.find((t) => t.id === resolution.templateId) ?? null)
      : null;
    recommendationReason = resolution.reason ?? null;
  }

  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-2xl font-semibold tracking-tight">Treino</h1>

      {activeSession ? (
        <ActiveSessionCard session={activeSession} />
      ) : (
        <Card className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Treino de hoje</p>
          {recommendedTemplate ? (
            <>
              <p className="text-lg font-medium">
                {recommendedTemplate.code} — {recommendedTemplate.name}
              </p>
              <StartSessionButton templateId={recommendedTemplate.id} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {recommendationReason ?? "Descanso hoje — nenhum treino recomendado."}
            </p>
          )}
        </Card>
      )}

      {LINKS.map(({ href, icon: Icon, title, subtitle }) => (
        <Link key={href} href={href}>
          <Card className="flex items-center justify-between gap-3 transition-colors hover:border-primary/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{title}</span>
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Card>
        </Link>
      ))}
    </div>
  );
}

function ActiveSessionCard({
  session,
}: {
  session: { id: string; template_name: string; started_at: string; date: string };
}) {
  const hoursSinceStart = getHoursSince(session.started_at);
  const startedOnPreviousDay = getAppDateOf(session.started_at) !== getAppToday().date;
  const isForgotten = hoursSinceStart >= FORGOTTEN_SESSION_HOURS || startedOnPreviousDay;

  return (
    <Card className="flex flex-col gap-3 border-primary/40 bg-primary/5">
      <div>
        <p className="text-sm text-muted-foreground">Treino em andamento</p>
        <p className="text-lg font-medium">{session.template_name}</p>
      </div>

      {isForgotten && (
        <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Este treino foi iniciado há {Math.floor(hoursSinceStart)}h. Deseja realmente continuar?
        </p>
      )}

      <div className="flex gap-2">
        <Link href={`/treino/sessao/${session.id}`} className="flex-1">
          <Button type="button" className="w-full">
            Continuar
          </Button>
        </Link>
        <div className="flex-1">
          <AbandonSessionButton sessionId={session.id} />
        </div>
      </div>
    </Card>
  );
}
