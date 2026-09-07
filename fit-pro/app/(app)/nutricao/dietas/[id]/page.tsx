import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DietTemplateMetaForm } from "@/components/nutrition/diet-template-meta-form";
import { DietEditor, type DietMealEditor } from "@/components/nutrition/diet-editor";
import { updateDietTemplateMeta, deleteDietTemplate } from "@/lib/actions/diet-templates";
import { Button } from "@/components/ui/button";
import type { DietType } from "@/lib/nutrition/vocabulary";

export default async function DietaEditorPage(props: PageProps<"/nutricao/dietas/[id]">) {
  const { id } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: diet } = await supabase
    .from("diet_templates")
    .select("id, name, code, diet_type")
    .eq("id", id)
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .single();

  if (!diet) notFound();

  const [{ data: rawMeals }, { data: foods }] = await Promise.all([
    supabase
      .from("diet_meals")
      .select(
        "id, order_index, name, meal_time, diet_meal_items(id, order_index, food_id, food_name, quantity, unit, grams_equivalent, calories, protein_g, carbs_g, fat_g, foods(serving_quantity, serving_unit, grams_equivalent))"
      )
      .eq("diet_template_id", id)
      .order("order_index", { ascending: true }),
    supabase
      .from("foods")
      .select(
        "id, name, brand, serving_quantity, serving_unit, grams_equivalent, calories, protein_g, carbs_g, fat_g"
      )
      .eq("user_id", user!.id)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
  ]);

  // Itens já salvos vêm no formato de colunas do CSV (quantity/unit/
  // grams_equivalent totais, não "por 1 porção" — Fase 0, seção 21). O
  // editor trabalha em "quantidade em porções do alimento", então
  // recalculamos aqui: se o alimento de origem ainda existe, usamos a
  // porção de referência DELE pra descobrir quantas vezes ela foi usada
  // (quantity ÷ serving_quantity do alimento); se o alimento sumiu,
  // tratamos o item salvo como "1 porção" congelada (não há mais uma
  // porção de referência viva pra dividir).
  const initialMeals: DietMealEditor[] = (rawMeals ?? []).map((meal) => ({
    clientId: meal.id,
    name: meal.name,
    meal_time: meal.meal_time ? meal.meal_time.slice(0, 5) : "",
    items: (meal.diet_meal_items ?? [])
      .sort((a, b) => a.order_index - b.order_index)
      .map((item) => {
        const refServingQuantity = item.foods?.serving_quantity ?? item.quantity;
        const quantityServings = refServingQuantity > 0 ? item.quantity / refServingQuantity : 1;
        return {
          clientId: item.id,
          food_id: item.food_id ?? "",
          food_name: item.food_name,
          serving_quantity: refServingQuantity,
          serving_unit: item.foods?.serving_unit ?? item.unit,
          serving_grams_equivalent: item.foods?.grams_equivalent ?? item.grams_equivalent,
          per_serving_calories: quantityServings > 0 ? item.calories / quantityServings : item.calories,
          per_serving_protein_g: quantityServings > 0 ? item.protein_g / quantityServings : item.protein_g,
          per_serving_carbs_g: quantityServings > 0 ? item.carbs_g / quantityServings : item.carbs_g,
          per_serving_fat_g: quantityServings > 0 ? item.fat_g / quantityServings : item.fat_g,
          quantity_servings: quantityServings || 1,
        };
      }),
  }));

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/nutricao/dietas" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Dietas
      </Link>

      <DietTemplateMetaForm
        defaultValues={{ name: diet.name, code: diet.code, diet_type: diet.diet_type as DietType }}
        onSubmit={updateDietTemplateMeta.bind(null, diet.id)}
        submitLabel="Salvar dados da dieta"
        compact
      />

      {/* Fica acima do editor (que tem uma barra fixa de "Salvar dieta" no
          rodapé) para nunca ficar coberto por ela. */}
      <form action={deleteDietTemplate.bind(null, diet.id)}>
        <Button type="submit" variant="outline" size="sm" className="w-full">
          Excluir dieta
        </Button>
      </form>

      <div className="border-t border-border pt-4">
        <DietEditor dietTemplateId={diet.id} initialMeals={initialMeals} availableFoods={foods ?? []} />
      </div>
    </div>
  );
}
