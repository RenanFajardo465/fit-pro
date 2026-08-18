import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: templates, error } = await supabase
    .from("workout_templates")
    .select("id, name, code")
    .eq("user_id", user!.id)
    .is("deleted_at", null)
    .order("code", { ascending: true });

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <Link href="/treino/templates/novo">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        </Link>
      </div>

      {error && (
        <Card>
          <p className="text-sm text-destructive">Erro ao carregar templates: {error.message}</p>
        </Card>
      )}

      {!error && templates?.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Nenhum template ainda. Crie o primeiro (ex.: código &quot;A&quot;, nome &quot;Treino A
            - Peito e Tríceps&quot;) e depois monte os exercícios dele.
          </p>
        </Card>
      )}

      <ul className="flex flex-col gap-2">
        {templates?.map((t) => (
          <li key={t.id}>
            <Link href={`/treino/templates/${t.id}`}>
              <Card className="flex items-center justify-between gap-3 transition-colors hover:border-primary/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                    {t.code}
                  </div>
                  <span className="font-medium">{t.name}</span>
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
