import Link from "next/link";
import { Plus, ChevronRight, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FoodSearch } from "@/components/nutrition/food-search";
import { FOOD_UNIT_LABELS, type FoodUnit } from "@/lib/nutrition/vocabulary";

export default async function AlimentosPage(props: PageProps<"/nutricao/alimentos">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("foods")
    .select("id, name, brand, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g")
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: foods, error } = await query;

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/nutricao" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Nutrição
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Alimentos</h1>
        <Link href="/nutricao/alimentos/novo">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </Link>
      </div>

      <FoodSearch defaultQuery={q} />

      {error && (
        <Card>
          <p className="text-sm text-destructive">Erro ao carregar alimentos: {error.message}</p>
        </Card>
      )}

      {!error && foods?.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            {q
              ? "Nenhum alimento encontrado com esse filtro."
              : 'Sua biblioteca está vazia. Toque em "Novo" para cadastrar o primeiro alimento.'}
          </p>
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {foods?.map((food) => (
          <li key={food.id}>
            <Link href={`/nutricao/alimentos/${food.id}`}>
              <Card className="flex items-center justify-between gap-3 py-3.5 transition-colors hover:border-primary/50">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {food.name}
                    {food.brand ? ` · ${food.brand}` : ""}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {food.serving_quantity} {FOOD_UNIT_LABELS[food.serving_unit as FoodUnit] ?? food.serving_unit}
                    {" · "}
                    {food.calories} kcal · P {food.protein_g}g · C {food.carbs_g}g · G {food.fat_g}g
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
