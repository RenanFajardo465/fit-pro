import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CsvImportWorkout } from "@/components/workout/csv-import-client";

export default async function ImportarTreinoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: exercises }, { data: templates }] = await Promise.all([
    supabase
      .from("exercises")
      .select("name")
      .eq("user_id", user!.id)
      .is("deleted_at", null),
    supabase
      .from("workout_templates")
      .select("code")
      .eq("user_id", user!.id)
      .is("deleted_at", null),
  ]);

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link
        href="/treino"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Treino
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Importar CSV</h1>

      <CsvImportWorkout
        existingExerciseNames={(exercises ?? []).map((e) => e.name)}
        existingTemplateCodes={(templates ?? []).map((t) => t.code)}
      />
    </div>
  );
}
