import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RecipeMetaForm } from "@/components/nutrition/recipe-meta-form";
import { RecipeEditor, type RecipeEditorItem } from "@/components/nutrition/recipe-editor";
import { updateRecipeMeta, deleteRecipe } from "@/lib/actions/recipes";
import { Button } from "@/components/ui/button";

export default async function ReceitaEditorPage(props: PageProps<"/nutricao/receitas/[id]">) {
  const { id } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("id, name, servings")
    .eq("id", id)
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .single();

  if (!recipe) notFound();

  const [{ data: rawItems }, { data: foods }] = await Promise.all([
    supabase
      .from("recipe_items")
      .select(
        "id, order_index, food_id, food_name, quantity_servings, calories, protein_g, carbs_g, fat_g, foods(serving_quantity, serving_unit)"
      )
      .eq("recipe_id", id)
      .order("order_index", { ascending: true }),
    supabase
      .from("foods")
      .select("id, name, brand, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", user!.id)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  // Itens já salvos: a "quantidade" no editor é sempre relativa a 1 porção
  // de referência do alimento (Fase 0, seção 6.6). Recalculamos aqui os
  // valores "por 1 porção" (per_serving_*) a partir dos macros congelados
  // do item ÷ quantity_servings, pra reabrir o editor exatamente como foi
  // salvo — mesmo que o alimento de origem tenha mudado ou sumido depois.
  const initialItems: RecipeEditorItem[] = (rawItems ?? []).map((item) => {
    const q = item.quantity_servings || 1;
    return {
      clientId: item.id,
      food_id: item.food_id ?? "",
      food_name: item.food_name,
      serving_quantity: item.foods?.serving_quantity ?? 1,
      serving_unit: item.foods?.serving_unit ?? "porcao",
      per_serving_calories: item.calories / q,
      per_serving_protein_g: item.protein_g / q,
      per_serving_carbs_g: item.carbs_g / q,
      per_serving_fat_g: item.fat_g / q,
      quantity_servings: item.quantity_servings,
    };
  });

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/nutricao/receitas" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Receitas
      </Link>

      <RecipeMetaForm
        defaultValues={{ name: recipe.name }}
        onSubmit={updateRecipeMeta.bind(null, recipe.id)}
        submitLabel="Salvar nome"
        compact
      />

      {/* Fica acima do editor (que tem uma barra fixa de "Salvar receita"
          no rodapé) para nunca ficar coberto por ela. */}
      <form action={deleteRecipe.bind(null, recipe.id)}>
        <Button type="submit" variant="outline" size="sm" className="w-full">
          Excluir receita
        </Button>
      </form>

      <div className="border-t border-border pt-4">
        <RecipeEditor
          recipeId={recipe.id}
          initialServings={recipe.servings}
          initialItems={initialItems}
          availableFoods={foods ?? []}
        />
      </div>
    </div>
  );
}
