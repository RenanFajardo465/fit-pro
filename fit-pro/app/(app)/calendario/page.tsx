import Link from "next/link";
import { ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { getAppToday } from "@/lib/date/today";
import { getMonthGridDates, getWeekdayOf, addMonths, MONTH_LABELS } from "@/lib/date/calendar-grid";
import { loadRecommendationContext } from "@/lib/workout/load-recommendation-context";
import { resolveWorkoutForDate } from "@/lib/workout/recommendation";
import { WEEKDAY_SHORT_LABELS, type Weekday } from "@/lib/workout/vocabulary";

export default async function CalendarioPage(props: PageProps<"/calendario">) {
  const searchParams = await props.searchParams;
  const today = getAppToday();
  const [todayYear, todayMonth] = today.date.split("-").map(Number);

  const year = Number(searchParams.y) || todayYear;
  const month = Number(searchParams.m) || todayMonth;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const gridDates = getMonthGridDates(year, month);
  const gridStart = gridDates[0];
  const gridEnd = gridDates[gridDates.length - 1];

  const [context, { data: overrides }] = await Promise.all([
    loadRecommendationContext(supabase, user!.id),
    supabase
      .from("manual_overrides")
      .select("date, template_id")
      .eq("user_id", user!.id)
      .gte("date", gridStart)
      .lte("date", gridEnd),
  ]);

  const overridesByDate = new Map((overrides ?? []).map((o) => [o.date, { template_id: o.template_id }]));
  const templatesById = new Map(context.templatesInOrder.map((t) => [t.id, t]));

  const cells = gridDates.map((date) => {
    const weekday = getWeekdayOf(date);
    const manualOverride = overridesByDate.get(date) ?? null;
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
      manualOverride,
    });
    const template = resolution.templateId ? templatesById.get(resolution.templateId) : null;
    const hasActivity = context.activities.some((a) =>
      a.date ? a.date === date : a.weekday === weekday
    );
    return {
      date,
      dayOfMonth: Number(date.split("-")[2]),
      inMonth: Number(date.split("-")[1]) === month,
      isToday: date === today.date,
      code: template?.code ?? null,
      isRest: resolution.templateId === null && resolution.source !== "none",
      hasOverride: manualOverride !== null,
      hasActivity,
    };
  });

  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);
  const weeks: (typeof cells)[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>

      <div className="flex items-center justify-between">
        <Link
          href={`/calendario?y=${prev.year}&m=${prev.month}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="font-medium">
          {MONTH_LABELS[month - 1]} {year}
        </span>
        <Link
          href={`/calendario?y=${next.year}&m=${next.month}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {context.mode === "sequence" && (
        <p className="text-xs text-muted-foreground">
          No modo sequência, todo dia futuro mostra o mesmo próximo treino da fila — ela só avança
          quando uma sessão é concluída (isso chega na Fase 3).
        </p>
      )}

      <Card className="flex flex-col gap-1 px-2 py-3">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((w) => (
            <span key={w}>{WEEKDAY_SHORT_LABELS[w]}</span>
          ))}
        </div>
        {weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7 gap-1">
            {week.map((cell) => (
              <Link
                key={cell.date}
                href={`/calendario/${cell.date}`}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 text-center ${
                  cell.isToday ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-secondary/60"
                } ${cell.inMonth ? "" : "opacity-40"}`}
              >
                <span className="text-xs">{cell.dayOfMonth}</span>
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-semibold ${
                    cell.code
                      ? "bg-primary text-primary-foreground"
                      : cell.isRest
                        ? "bg-secondary text-muted-foreground"
                        : ""
                  }`}
                >
                  {cell.code ?? (cell.isRest ? "—" : "")}
                </span>
                <span className="flex h-2 items-center gap-0.5">
                  {cell.hasActivity && <Circle className="h-1.5 w-1.5 fill-current text-amber-500" />}
                  {cell.hasOverride && <Circle className="h-1.5 w-1.5 fill-current text-primary" />}
                </span>
              </Link>
            ))}
          </div>
        ))}
      </Card>

      <p className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Circle className="h-1.5 w-1.5 fill-current text-amber-500" /> atividade
        </span>
        <span className="flex items-center gap-1">
          <Circle className="h-1.5 w-1.5 fill-current text-primary" /> override manual
        </span>
      </p>
    </div>
  );
}
