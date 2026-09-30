import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { loadRecommendationContext } from "@/lib/workout/load-recommendation-context";
import { resolveNextWorkout } from "@/lib/workout/recommendation";
import { getDayTotals } from "@/lib/nutrition/day-totals";
import { DaySummaryCard, type NutritionGoals } from "@/components/nutrition/day-summary-card";
import { getAppToday } from "@/lib/date/today";

export default async function HojePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { date: today } = getAppToday();

  const [{ data: profile }, context, { dietDay, totals }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, daily_calorie_goal, daily_protein_goal_g")
      .eq("id", user!.id)
      .single(),
    loadRecommendationContext(supabase, user!.id),
    getDayTotals(supabase, user!.id, today),
  ]);

  const resolution = resolveNextWorkout(context.templatesInOrder, context.sequenceState);
  const nextTemplate = context.templatesInOrder.find((t) => t.id === resolution.templateId);

  const goals: NutritionGoals = {
    dailyCalorieGoal: profile?.daily_calorie_goal ?? null,
    dailyProteinGoalG: profile?.daily_protein_goal_g ?? null,
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <div>
        <p className="text-sm text-muted-foreground">Olá,</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile?.display_name ?? user?.email}
        </h1>
      </div>

      <Card className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Próximo treino</p>
        {nextTemplate ? (
          <p className="text-lg font-medium">
            {nextTemplate.code} — {nextTemplate.name}
          </p>
        ) : (
          <p className="text-lg font-medium text-muted-foreground">
            {resolution.reason ?? "Nada configurado ainda"}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          A fila é contínua: ao concluir um treino, o próximo já fica sugerido automaticamente,
          independentemente do dia.
        </p>
      </Card>

      {dietDay ? (
        <div className="flex flex-col gap-2">
          <DaySummaryCard totals={totals} goals={goals} />
          <Link href="/nutricao/diario" className="text-xs text-muted-foreground underline">
            Ver diário completo
          </Link>
        </div>
      ) : (
        <Card className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Nenhuma dieta selecionada para hoje ainda.</p>
          <Link href="/nutricao/diario" className="text-xs text-muted-foreground underline">
            Selecionar dieta do dia
          </Link>
        </Card>
      )}
    </div>
  );
}
