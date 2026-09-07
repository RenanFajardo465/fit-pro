import Link from "next/link";
import { Plus, ChevronRight, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DIET_TYPE_LABELS, type DietType } from "@/lib/nutrition/vocabulary";

export default async function DietasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: diets, error } = await supabase
    .from("diet_templates")
    .select("id, name, code, diet_type")
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .order("code", { ascending: true });

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/nutricao" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Nutrição
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dietas</h1>
        <Link href="/nutricao/dietas/novo">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Nova
          </Button>
        </Link>
      </div>

      {error && (
        <Card>
          <p className="text-sm text-destructive">Erro ao carregar dietas: {error.message}</p>
        </Card>
      )}

      {!error && diets?.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Nenhuma dieta ainda. Crie a primeira (ex.: código &quot;TREINO_A&quot;) e depois monte
            as refeições dela.
          </p>
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {diets?.map((diet) => (
          <li key={diet.id}>
            <Link href={`/nutricao/dietas/${diet.id}`}>
              <Card className="flex items-center justify-between gap-3 transition-colors hover:border-primary/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-center text-[10px] font-bold leading-tight text-primary-foreground">
                    {diet.code}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{diet.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {DIET_TYPE_LABELS[diet.diet_type as DietType] ?? diet.diet_type}
                    </span>
                  </div>
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
