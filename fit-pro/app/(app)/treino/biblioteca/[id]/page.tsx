import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExerciseForm } from "@/components/workout/exercise-form";
import { updateExercise, deleteExercise } from "@/lib/actions/exercises";
import type { MuscleGroup, MetricType } from "@/lib/workout/vocabulary";

export default async function EditarExercicioPage(
  props: PageProps<"/treino/biblioteca/[id]">
) {
  const { id } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .single();

  if (!exercise) notFound();

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link
        href="/treino/biblioteca"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Biblioteca
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{exercise.name}</h1>
      <ExerciseForm
        defaultValues={{
          name: exercise.name,
          muscle_group: exercise.muscle_group as MuscleGroup,
          category: exercise.category ?? "",
          metric_type: exercise.metric_type as MetricType,
          description: exercise.description ?? "",
          image_url: exercise.image_url ?? "",
          gif_url: exercise.gif_url ?? "",
          video_url: exercise.video_url ?? "",
          external_url: exercise.external_url ?? "",
          notes: exercise.notes ?? "",
        }}
        onSubmit={updateExercise.bind(null, id)}
        onDelete={deleteExercise.bind(null, id)}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
