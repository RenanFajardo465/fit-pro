import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TemplateMetaForm } from "@/components/workout/template-meta-form";
import { TemplateEditor, type EditorItem } from "@/components/workout/template-editor";
import { updateTemplateMeta, deleteTemplate } from "@/lib/actions/templates";
import { Button } from "@/components/ui/button";

export default async function TemplateEditorPage(
  props: PageProps<"/treino/templates/[id]">
) {
  const { id } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: template } = await supabase
    .from("workout_templates")
    .select("id, name, code")
    .eq("id", id)
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .single();

  if (!template) notFound();

  const [{ data: rawItems }, { data: exercises }] = await Promise.all([
    supabase
      .from("workout_template_items")
      .select(
        "id, order_index, group_id, sets, reps_min, reps_max, duration_target_seconds, distance_target_meters, initial_load_kg, rest_seconds, technique, notes, exercise_id, exercises(name, muscle_group, metric_type)"
      )
      .eq("template_id", id)
      .order("order_index", { ascending: true }),
    supabase
      .from("exercises")
      .select("id, name, muscle_group, metric_type")
      .eq("user_id", user!.id)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  const initialItems: EditorItem[] = (rawItems ?? []).map((item) => ({
    clientId: item.id,
    exercise_id: item.exercise_id ?? "",
    exercise_name: item.exercises?.name ?? "Exercício removido",
    muscle_group: item.exercises?.muscle_group ?? "outro",
    metric_type: item.exercises?.metric_type ?? "outro",
    group_key: item.group_id,
    sets: item.sets,
    reps_min: item.reps_min,
    reps_max: item.reps_max,
    duration_target_seconds: item.duration_target_seconds,
    distance_target_meters: item.distance_target_meters,
    initial_load_kg: item.initial_load_kg,
    rest_seconds: item.rest_seconds,
    technique: item.technique,
    notes: item.notes,
    isOpen: false,
  }));

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link
        href="/treino/templates"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Templates
      </Link>

      <TemplateMetaForm
        defaultValues={{ name: template.name, code: template.code }}
        onSubmit={updateTemplateMeta.bind(null, template.id)}
        submitLabel="Salvar nome/código"
        compact
      />

      {/* Fica acima do editor (que tem uma barra fixa de "Salvar alterações"
          no rodapé) para nunca ficar coberto por ela. */}
      <form action={deleteTemplate.bind(null, template.id)}>
        <Button type="submit" variant="outline" size="sm" className="w-full">
          Excluir template
        </Button>
      </form>

      <div className="border-t border-border pt-4">
        <TemplateEditor
          templateId={template.id}
          initialItems={initialItems}
          availableExercises={exercises ?? []}
        />
      </div>
    </div>
  );
}
