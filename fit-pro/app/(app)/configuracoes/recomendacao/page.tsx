import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ScheduleSettingsForm } from "@/components/schedule/schedule-settings-form";

export default async function ConfiguracoesRecomendacaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: templates }, { data: sequenceState }] = await Promise.all([
    supabase
      .from("workout_templates")
      .select("id, code, name")
      .eq("user_id", user!.id)
      .is("deleted_at", null)
      .order("code", { ascending: true }),
    supabase
      .from("sequence_state")
      .select("last_completed_template_id, last_completed_at")
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/mais" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Mais
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Sequência de treinos</h1>

      <ScheduleSettingsForm templates={templates ?? []} sequenceState={sequenceState ?? null} />
    </div>
  );
}
