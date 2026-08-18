import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { getAppToday } from "@/lib/date/today";
import { addDays, getWeekdayOf } from "@/lib/date/calendar-grid";
import { loadRecommendationContext } from "@/lib/workout/load-recommendation-context";
import { resolveWorkoutForDate } from "@/lib/workout/recommendation";
import { WEEKDAY_SHORT_LABELS, type Weekday } from "@/lib/workout/vocabulary";

export default async function HojePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single();

  const today = getAppToday();
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(today.date, i));

  const context = await loadRecommendationContext(supabase, user!.id);

  const { data: overrides } = await supabase
    .from("manual_overrides")
    .select("date, template_id")
    .eq("user_id", user!.id)
    .gte("date", weekDates[0])
    .lte("date", weekDates[weekDates.length - 1]);

  const overridesByDate = new Map((overrides ?? []).map((o) => [o.date, { template_id: o.template_id }]));
  const templatesById = new Map(context.templatesInOrder.map((t) => [t.id, t]));

  const week = weekDates.map((date) => {
    const weekday = getWeekdayOf(date);
    const resolution = resolveWorkoutForDate({
      date,
      weekday,
      mode: context.mode,
      templatesInOrder: context.templatesInOrder,
      sequenceState: context.sequenceState,
      weekdayAssignments: context.weekdayAssignments,
      rules: context.rules,
      activities: context.activities,
      templateMuscleGroups: context.templateMuscleGroups,
      manualOverride: overridesByDate.get(date) ?? null,
    });
    return {
      date,
      weekday,
      code: resolution.templateId ? templatesById.get(resolution.templateId)?.code ?? null : null,
      isRest: resolution.templateId === null && resolution.source !== "none",
    };
  });

  const fullTodayResolution = resolveWorkoutForDate({
    date: today.date,
    weekday: today.weekday,
    mode: context.mode,
    templatesInOrder: context.templatesInOrder,
    sequenceState: context.sequenceState,
    weekdayAssignments: context.weekdayAssignments,
    rules: context.rules,
    activities: context.activities,
    templateMuscleGroups: context.templateMuscleGroups,
    manualOverride: overridesByDate.get(today.date) ?? null,
  });
  const recommendedTemplate = context.templatesInOrder.find((t) => t.id === fullTodayResolution.templateId);

  return (
    <div className="flex flex-col gap-4 py-2">
      <div>
        <p className="text-sm text-muted-foreground">Olá,</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile?.display_name ?? user?.email}
        </h1>
      </div>

      <Card className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Treino de hoje</p>
        {recommendedTemplate ? (
          <p className="text-lg font-medium">
            {recommendedTemplate.code} — {recommendedTemplate.name}
          </p>
        ) : fullTodayResolution.source === "none" ? (
          <p className="text-lg font-medium text-muted-foreground">
            {fullTodayResolution.reason ?? "Nada configurado ainda"}
          </p>
        ) : (
          <p className="text-lg font-medium">Descanso</p>
        )}
        {fullTodayResolution.reason && recommendedTemplate === undefined && fullTodayResolution.source !== "none" && (
          <p className="text-xs text-muted-foreground">{fullTodayResolution.reason}</p>
        )}
        <p className="text-xs text-muted-foreground">
          A execução do treino (&quot;Iniciar treino&quot;) chega na próxima fase — por enquanto esta é só a
          prévia de qual treino a{" "}
          <Link href="/configuracoes/recomendacao" className="underline">
            configuração de recomendação
          </Link>{" "}
          escolheria para hoje.
        </p>
      </Card>

      <Link href="/calendario">
        <Card className="flex flex-col gap-2 transition-colors hover:border-primary/50">
          <p className="text-sm text-muted-foreground">Próximos 7 dias</p>
          <div className="grid grid-cols-7 gap-1 text-center">
            {week.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {WEEKDAY_SHORT_LABELS[day.weekday as Weekday]}
                </span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold ${
                    day.code
                      ? "bg-primary text-primary-foreground"
                      : day.isRest
                        ? "bg-secondary text-muted-foreground"
                        : ""
                  }`}
                >
                  {day.code ?? (day.isRest ? "—" : "")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </Link>

      <Card>
        <p className="text-sm text-muted-foreground">Resumo nutricional chega nas próximas entregas.</p>
      </Card>
    </div>
  );
}
