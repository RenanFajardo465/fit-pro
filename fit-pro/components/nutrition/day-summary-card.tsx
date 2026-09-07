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

/**
 * "Consumido" já soma os itens da dieta marcados + todos os itens extra —
 * o resumo completo por dia (comparando com uma meta calórica/proteica)
 * fica pro próximo incremento (resumo no Dashboard), quando a meta do
 * usuário existir no perfil. Por enquanto isso só mostra planejado ×
 * consumido do próprio dia.
 */
export function DaySummaryCard({ totals }: { totals: DaySummaryTotals }) {
  return (
    <Card className="flex flex-col gap-2">
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
    </Card>
  );
}
