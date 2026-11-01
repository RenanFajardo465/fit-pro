import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExerciseForm } from "@/components/workout/exercise-form";
import { updateExercise, deleteExercise } from "@/lib/actions/exercises";
import type {
  MuscleGroup,
  MetricType,
  EquipmentType,
  MovementPattern,
  GripType,
  PositionVariant,
} from "@/lib/workout/vocabulary";

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

  const { data: aliasRows } = await supabase
    .from("exercise_aliases")
    .select("alias")
    .eq("exercise_id", id)
    .order("created_at", { ascending: true });

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
          secondary_muscle_groups: (exercise.secondary_muscle_groups ?? []) as MuscleGroup[],
          category: exercise.category ?? "",
          metric_type: exercise.metric_type as MetricType,
          equipment: (exercise.equipment ?? "") as EquipmentType | "",
          movement_pattern: (exercise.movement_pattern ?? "") as MovementPattern | "",
          grip_type: (exercise.grip_type ?? "") as GripType | "",
          position_variant: (exercise.position_variant ?? "") as PositionVariant | "",
          is_unilateral: exercise.is_unilateral ?? undefined,
          description: exercise.description ?? "",
          image_url: exercise.image_url ?? "",
          gif_url: exercise.gif_url ?? "",
          video_url: exercise.video_url ?? "",
          external_url: exercise.external_url ?? "",
          notes: exercise.notes ?? "",
          aliases: (aliasRows ?? []).map((a) => a.alias),
        }}
        onSubmit={updateExercise.bind(null, id)}
        onDelete={deleteExercise.bind(null, id)}
        submitLabel="Salvar alterações"
        excludeExerciseId={id}
      />
    </div>
  );
}
