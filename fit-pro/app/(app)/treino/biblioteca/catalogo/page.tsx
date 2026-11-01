import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CatalogImportForm } from "@/components/workout/catalog-import-form";
import { EXERCISE_CATALOG_SEED } from "@/lib/workout/exercise-catalog-seed";
import { normalizeExerciseName } from "@/lib/workout/exercise-normalize";

/**
 * Catálogo Inteligente, seção 8: catálogo inicial de exercícios comuns,
 * oferecido como importação opt-in pra biblioteca pessoal do usuário — nunca
 * forçado, nunca substitui nada que já exista.
 */
export default async function CatalogoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: exercises }, { data: aliases }] = await Promise.all([
    supabase
      .from("exercises")
      .select("name")
      .eq("user_id", user!.id)
      .is("deleted_at", null),
    supabase
      .from("exercise_aliases")
      .select("alias")
      .eq("user_id", user!.id),
  ]);

  const existingNormalized = new Set<string>([
    ...(exercises ?? []).map((e) => normalizeExerciseName(e.name)),
    ...(aliases ?? []).map((a) => normalizeExerciseName(a.alias)),
  ]);

  const alreadyInLibrary = new Set<string>(
    EXERCISE_CATALOG_SEED.filter((item) => existingNormalized.has(normalizeExerciseName(item.name))).map(
      (item) => item.id
    )
  );

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link
        href="/treino/biblioteca"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Biblioteca
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo inicial</h1>
        <p className="text-sm text-muted-foreground">
          Exercícios comuns de musculação, organizados por grupo muscular. Escolha os que quiser
          adicionar à sua biblioteca — nada é importado automaticamente, e exercícios que já
          existem na sua biblioteca não são duplicados.
        </p>
      </div>

      <CatalogImportForm alreadyInLibrary={alreadyInLibrary} />
    </div>
  );
}
