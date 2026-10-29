import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import {
  getCompletedSetHistory,
  computePersonalRecords,
  computeWeeklyVolume,
  listDistinctExercises,
} from "@/lib/workout/evolution";
import { VolumeChart } from "@/components/workout/volume-chart";
import { LoadProgressChart } from "@/components/workout/load-progress-chart";

function formatDateShort(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

export default async function EvolucaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const history = await getCompletedSetHistory(supabase, user!.id);
  const weeklyVolume = computeWeeklyVolume(history);
  const exercises = listDistinctExercises(history);
  const prs = Array.from(computePersonalRecords(history).values()).sort(
    (a, b) => b.maxWeightKg - a.maxWeightKg
  );

  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-2xl font-semibold tracking-tight">Evolução</h1>

      {history.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Ainda não há treinos concluídos — os gráficos de progresso de carga e volume, e os recordes
            pessoais, aparecem aqui depois do primeiro treino finalizado.
          </p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-2">
            <p className="text-sm font-medium">Progresso de carga por exercício</p>
            <LoadProgressChart exercises={exercises} records={history} />
          </Card>

          <Card className="flex flex-col gap-2">
            <p className="text-sm font-medium">Volume total por semana</p>
            <p className="text-xs text-muted-foreground">Soma de carga × repetições de todas as séries concluídas.</p>
            <VolumeChart data={weeklyVolume} />
          </Card>

          <Card className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium">Recordes pessoais</p>
            </div>
            <ul className="flex flex-col gap-1.5">
              {prs.map((pr) => (
                <li key={pr.exerciseId} className="flex items-center justify-between text-sm">
                  <span>{pr.exerciseName}</span>
                  <span className="text-right text-muted-foreground">
                    {pr.maxWeightKg}kg
                    <span className="ml-1 text-xs">· {formatDateShort(pr.sessionDate)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
