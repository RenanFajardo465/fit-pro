import { Card } from "@/components/ui/card";

export type DaySummaryTotals = {
  plannedCalories: number;
  plannedProteinG: number;
  plannedCarbsG: number;
  plannedFatG: number;
  consumedCalories: number;
  consumedProteinG: number;
  consumedCarbsG: number;
  consumedFatG: number;
};

export type NutritionGoals = {
  dailyCalorieGoal: number | null;
  dailyProteinGoalG: number | null;
};

function GoalBar({ label, value, goal, unit }: { label: string; value: number; goal: number; unit: string }) {
  const pct = Math.round((value / goal) * 100);
  const barPct = Math.min(pct, 100);
  const isOver = value > goal;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={isOver ? "text-destructive" : "text-muted-foreground"}>
          {value} / {goal} {unit} ({pct}%)
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={isOver ? "h-full rounded-full bg-destructive" : "h-full rounded-full bg-primary"}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * "Consumido" já soma os itens da dieta marcados + todos os itens extra.
 * `goals` é opcional (Fase 5, Incremento 5) — quando o usuário definiu meta
 * diária em Mais → Meta nutricional, mostra uma barra de progresso
 * consumido × meta; sem meta definida, mostra só planejado × consumido.
 */
export function DaySummaryCard({
  totals,
  goals,
}: {
  totals: DaySummaryTotals;
  goals?: NutritionGoals | null;
}) {
  const hasGoal = !!(goals && (goals.dailyCalorieGoal || goals.dailyProteinGoalG));

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm font-medium">Resumo do dia</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Planejado (dieta)</span>
          <span>{totals.plannedCalories} kcal</span>
          <span className="text-xs text-muted-foreground">
            P {totals.plannedProteinG}g · C {totals.plannedCarbsG}g · G {totals.plannedFatG}g
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Consumido (dieta + extras)</span>
          <span className="font-medium">{totals.consumedCalories} kcal</span>
          <span className="text-xs text-muted-foreground">
            P {totals.consumedProteinG}g · C {totals.consumedCarbsG}g · G {totals.consumedFatG}g
          </span>
        </div>
      </div>

      {hasGoal && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Meta do dia</span>
          {goals!.dailyCalorieGoal && (
            <GoalBar
              label="Calorias"
              value={totals.consumedCalories}
              goal={goals!.dailyCalorieGoal}
              unit="kcal"
            />
          )}
          {goals!.dailyProteinGoalG && (
            <GoalBar
              label="Proteína"
              value={totals.consumedProteinG}
              goal={goals!.dailyProteinGoalG}
              unit="g"
            />
          )}
        </div>
      )}
    </Card>
  );
}
