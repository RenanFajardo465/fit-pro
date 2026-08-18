import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { getWeekdayOf } from "@/lib/date/calendar-grid";
import { loadRecommendationContext } from "@/lib/workout/load-recommendation-context";
import { resolveWorkoutForDate } from "@/lib/workout/recommendation";
import { ManualOverrideForm } from "@/components/schedule/manual-override-form";
import { WEEKDAY_LABELS, type Weekday } from "@/lib/workout/vocabulary";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default async function CalendarioDiaPage(props: PageProps<"/calendario/[date]">) {
  const { date } = await props.params;
  if (!DATE_RE.test(date)) notFound();

  const weekday = getWeekdayOf(date);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [context, { data: override }] = await Promise.all([
    loadRecommendationContext(supabase, user!.id),
    supabase
      .from("manual_overrides")
      .select("template_id")
      .eq("user_id", user!.id)
      .eq("date", date)
      .maybeSingle(),
  ]);

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
    manualOverride: override ?? null,
  });

  const template = context.templatesInOrder.find((t) => t.id === resolution.templateId);
  const dayActivities = context.activities.filter((a) =>
    a.date ? a.date === date : a.weekday === weekday
  );

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/calendario" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Calendário
      </Link>

      <div>
        <p className="text-sm text-muted-foreground">{WEEKDAY_LABELS[weekday as Weekday]}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{formatDateLong(date)}</h1>
      </div>

      <Card className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Treino recomendado</p>
        <p className="text-lg font-medium">
          {template ? `${template.code} — ${template.name}` : resolution.templateId === null ? "Descanso" : "—"}
        </p>
        {resolution.reason && <p className="text-xs text-muted-foreground">{resolution.reason}</p>}
      </Card>

      {dayActivities.length > 0 && (
        <Card className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Atividades</p>
          <ul className="flex flex-col gap-1">
            {dayActivities.map((a) => (
              <li key={a.id} className="text-sm">
                {a.name}
                {a.time_of_day ? ` · ${a.time_of_day.slice(0, 5)}` : ""}
                {a.duration_minutes ? ` · ${a.duration_minutes} min` : ""}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Forçar um treino específico nesta data</p>
        <ManualOverrideForm
          date={date}
          templates={context.templatesInOrder}
          currentOverride={override ?? null}
        />
      </Card>
    </div>
  );
}
