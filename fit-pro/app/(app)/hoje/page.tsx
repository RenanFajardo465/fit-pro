import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

// Dashboard ("Hoje"). Nesta fase só provamos login + RLS funcionando de
// ponta a ponta, lendo o profile do próprio usuário. O conteúdo real
// (treino recomendado, calendário, resumo nutricional — Fase 0 seção 6)
// entra nas Fases 2 e 3.
export default async function HojePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
    .single();

  return (
    <div className="flex flex-col gap-4 py-2">
      <div>
        <p className="text-sm text-muted-foreground">Olá,</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile?.display_name ?? user?.email}
        </h1>
      </div>

      <Card>
        <p className="text-sm text-muted-foreground">
          O dashboard (treino de hoje, calendário da semana, resumo
          nutricional) chega na Fase 2/3. Por enquanto, esta tela confirma
          que login, sessão e RLS estão funcionando ponta a ponta.
        </p>
      </Card>
    </div>
  );
}
