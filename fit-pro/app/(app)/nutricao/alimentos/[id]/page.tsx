import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FoodForm } from "@/components/nutrition/food-form";
import { updateFood, deleteFood } from "@/lib/actions/foods";
import type { FoodUnit } from "@/lib/nutrition/vocabulary";

export default async function EditarAlimentoPage(props: PageProps<"/nutricao/alimentos/[id]">) {
  const { id } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: food } = await supabase
    .from("foods")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .single();

  if (!food) notFound();

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/nutricao/alimentos" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Alimentos
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{food.name}</h1>
      <FoodForm
        defaultValues={{
          name: food.name,
          brand: food.brand ?? "",
          serving_quantity: food.serving_quantity,
          serving_unit: food.serving_unit as FoodUnit,
          grams_equivalent: food.grams_equivalent,
          calories: food.calories,
          protein_g: food.protein_g,
          carbs_g: food.carbs_g,
          fat_g: food.fat_g,
        }}
        onSubmit={updateFood.bind(null, id)}
        onDelete={deleteFood.bind(null, id)}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
