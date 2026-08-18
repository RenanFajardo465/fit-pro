import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ScheduleSettingsForm } from "@/components/schedule/schedule-settings-form";
import type { ScheduleMode } from "@/lib/workout/vocabulary";

export default async function ConfiguracoesRecomendacaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: settings },
    { data: templates },
    { data: sequenceState },
    { data: weekdayAssignments },
    { data: rules },
    { data: activities },
  ] = await Promise.all([
    supabase.from("schedule_settings").select("mode").eq("user_id", user!.id).maybeSingle(),
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
    supabase
      .from("weekday_assignments")
      .select("weekday, template_id")
      .eq("user_id", user!.id),
    supabase
      .from("schedule_rules")
      .select("id, rule_type, params")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("external_activities")
      .select("id, name")
      .eq("user_id", user!.id)
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/mais" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Mais
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Configurações de recomendação</h1>

      <ScheduleSettingsForm
        initialMode={(settings?.mode as ScheduleMode) ?? "sequence"}
        templates={templates ?? []}
        sequenceState={sequenceState ?? null}
        weekdayAssignments={weekdayAssignments ?? []}
        rules={(rules ?? []) as { id: string; rule_type: string; params: Record<string, unknown> }[]}
        activities={activities ?? []}
      />
    </div>
  );
}
