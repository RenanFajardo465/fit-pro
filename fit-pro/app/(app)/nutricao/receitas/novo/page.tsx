import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecipeMetaForm } from "@/components/nutrition/recipe-meta-form";
import { createRecipe } from "@/lib/actions/recipes";

export default function NovaReceitaPage() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/nutricao/receitas" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Receitas
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Nova receita</h1>
      <p className="text-sm text-muted-foreground">
        Depois de criar, você monta os alimentos na tela seguinte.
      </p>
      <RecipeMetaForm onSubmit={createRecipe} submitLabel="Criar e continuar" />
    </div>
  );
}
