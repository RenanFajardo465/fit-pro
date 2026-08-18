import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WEEKDAY_LABELS, type Weekday } from "@/lib/workout/vocabulary";
import { deleteActivity } from "@/lib/actions/activities";

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default async function AtividadesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: activities, error } = await supabase
    .from("external_activities")
    .select("id, name, weekday, date, time_of_day, duration_minutes, notes")
    .eq("user_id", user!.id)
    .order("name", { ascending: true });

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/mais" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Mais
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Atividades externas</h1>
        <Link href="/configuracoes/atividades/nova">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nova
          </Button>
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        Aparecem no calendário e podem alimentar a regra &quot;evitar grupo muscular após uma
        atividade&quot; nas configurações de recomendação.
      </p>

      {error && (
        <Card>
          <p className="text-sm text-destructive">Erro ao carregar atividades: {error.message}</p>
        </Card>
      )}

      {!error && activities?.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">Nenhuma atividade cadastrada ainda.</p>
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {activities?.map((a) => (
          <li key={a.id}>
            <Card className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="break-words font-medium">{a.name}</span>
                <span className="text-xs text-muted-foreground">
                  {a.weekday !== null
                    ? `Toda ${WEEKDAY_LABELS[a.weekday as Weekday]}`
                    : formatDate(a.date!)}
                  {a.time_of_day ? ` · ${a.time_of_day.slice(0, 5)}` : ""}
                  {a.duration_minutes ? ` · ${a.duration_minutes} min` : ""}
                </span>
                {a.notes && <span className="text-xs text-muted-foreground">{a.notes}</span>}
              </div>
              <form action={deleteActivity.bind(null, a.id)}>
                <button
                  type="submit"
                  aria-label="Remover atividade"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
