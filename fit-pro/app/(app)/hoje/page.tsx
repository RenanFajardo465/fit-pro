import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { loadRecommendationContext } from "@/lib/workout/load-recommendation-context";
import { resolveNextWorkout } from "@/lib/workout/recommendation";

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

  const context = await loadRecommendationContext(supabase, user!.id);
  const resolution = resolveNextWorkout(context.templatesInOrder, context.sequenceState);
  const nextTemplate = context.templatesInOrder.find((t) => t.id === resolution.templateId);

  return (
    <div className="flex flex-col gap-4 py-2">
      <div>
        <p className="text-sm text-muted-foreground">Olá,</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile?.display_name ?? user?.email}
        </h1>
      </div>

      <Card className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Próximo treino</p>
        {nextTemplate ? (
          <p className="text-lg font-medium">
            {nextTemplate.code} — {nextTemplate.name}
          </p>
        ) : (
          <p className="text-lg font-medium text-muted-foreground">
            {resolution.reason ?? "Nada configurado ainda"}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          A fila é contínua: ao concluir um treino, o próximo já fica sugerido automaticamente,
          independentemente do dia.
        </p>
      </Card>

      <Card>
        <p className="text-sm text-muted-foreground">Resumo nutricional chega nas próximas entregas.</p>
      </Card>
    </div>
  );
}
