import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { getNutritionHistory } from "@/lib/nutrition/day-totals";
import { formatIsoDateShort } from "@/lib/date/today";
import { DIET_TYPE_LABELS, type DietType } from "@/lib/nutrition/vocabulary";

export default async function NutricaoHistoricoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const history = await getNutritionHistory(supabase, user!.id);

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/nutricao" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Nutrição
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Histórico</h1>

      {history.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Nenhum dia com dieta selecionada ainda. Selecione uma dieta no diário do dia pra começar a
            construir o histórico.
          </p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {history.map((day) => (
            <li key={day.id}>
              <Link href={`/nutricao/diario/${day.date}`}>
                <Card className="flex items-center justify-between gap-3 transition-colors hover:border-primary/50">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium capitalize">{formatIsoDateShort(day.date)}</span>
                    <span className="text-xs text-muted-foreground">
                      {day.dietName} · {DIET_TYPE_LABELS[day.dietType as DietType] ?? day.dietType}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 text-right">
                    <span className="text-sm font-medium">{day.totals.consumedCalories} kcal</span>
                    <span className="text-xs text-muted-foreground">
                      de {day.totals.plannedCalories} kcal planejado
                    </span>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
