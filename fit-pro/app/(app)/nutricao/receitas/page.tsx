import Link from "next/link";
import { Plus, ChevronRight, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ReceitasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, name, servings, computed_calories, computed_protein_g, computed_carbs_g, computed_fat_g")
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/nutricao" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Nutrição
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Receitas</h1>
        <Link href="/nutricao/receitas/novo">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nova
          </Button>
        </Link>
      </div>

      {error && (
        <Card>
          <p className="text-sm text-destructive">Erro ao carregar receitas: {error.message}</p>
        </Card>
      )}

      {!error && recipes?.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Nenhuma receita ainda. Toque em &quot;Nova&quot; para montar a primeira.
          </p>
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {recipes?.map((recipe) => (
          <li key={recipe.id}>
            <Link href={`/nutricao/receitas/${recipe.id}`}>
              <Card className="flex items-center justify-between gap-3 py-3.5 transition-colors hover:border-primary/50">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{recipe.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Rende {recipe.servings} porç{Number(recipe.servings) === 1 ? "ão" : "ões"}
                    {" · por porção: "}
                    {recipe.computed_calories} kcal · P {recipe.computed_protein_g}g · C{" "}
                    {recipe.computed_carbs_g}g · G {recipe.computed_fat_g}g
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
