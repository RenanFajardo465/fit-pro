import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExerciseSearch } from "@/components/workout/exercise-search";
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from "@/lib/workout/vocabulary";

export default async function BibliotecaPage(props: PageProps<"/treino/biblioteca">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const grupo = typeof searchParams.grupo === "string" ? searchParams.grupo : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("exercises")
    .select("id, name, muscle_group, category, metric_type")
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (q) query = query.ilike("name", `%${q}%`);
  if (grupo) query = query.eq("muscle_group", grupo);

  const { data: exercises, error } = await query;

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Biblioteca</h1>
        <Link href="/treino/biblioteca/novo">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </Link>
      </div>

      <ExerciseSearch defaultQuery={q} defaultMuscleGroup={grupo} />

      {error && (
        <Card>
          <p className="text-sm text-destructive">
            Erro ao carregar exercícios: {error.message}
          </p>
        </Card>
      )}

      {!error && exercises?.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            {q || grupo
              ? "Nenhum exercício encontrado com esse filtro."
              : "Sua biblioteca está vazia. Toque em \"Novo\" para cadastrar o primeiro exercício."}
          </p>
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {exercises?.map((exercise) => (
          <li key={exercise.id}>
            <Link href={`/treino/biblioteca/${exercise.id}`}>
              <Card className="flex items-center justify-between gap-3 py-3.5 transition-colors hover:border-primary/50">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{exercise.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {MUSCLE_GROUP_LABELS[exercise.muscle_group as MuscleGroup] ??
                      exercise.muscle_group}
                    {exercise.category ? ` · ${exercise.category}` : ""}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
