import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NutritionGoalForm } from "@/components/nutrition/nutrition-goal-form";

export default async function ConfiguracoesNutricaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_calorie_goal, daily_protein_goal_g")
    .eq("id", user!.id)
    .single();

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/mais" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Mais
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Meta nutricional</h1>

      <NutritionGoalForm
        defaultValues={{
          daily_calorie_goal: profile?.daily_calorie_goal ?? null,
          daily_protein_goal_g: profile?.daily_protein_goal_g ?? null,
        }}
      />
    </div>
  );
}
