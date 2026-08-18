"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { activitySchema, type ActivityValues } from "@/lib/schemas/activity";

export type ActivityActionResult = { error: string } | void;

function revalidateActivityPaths() {
  revalidatePath("/configuracoes/atividades");
  revalidatePath("/configuracoes/recomendacao");
  revalidatePath("/calendario");
  revalidatePath("/hoje");
}

export async function createActivity(values: ActivityValues): Promise<ActivityActionResult> {
  const parsed = activitySchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("external_activities").insert({
    user_id: user.id,
    name: parsed.data.name,
    weekday: parsed.data.recurrence === "weekday" ? parsed.data.weekday : null,
    date: parsed.data.recurrence === "date" ? parsed.data.date : null,
    time_of_day: parsed.data.time_of_day || null,
    duration_minutes: parsed.data.duration_minutes,
    notes: parsed.data.notes || null,
  });

  if (error) return { error: `Erro ao criar: ${error.message}` };

  revalidateActivityPaths();
  redirect("/configuracoes/atividades");
}

export async function deleteActivity(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("external_activities").delete().eq("id", id).eq("user_id", user.id);

  revalidateActivityPaths();
  redirect("/configuracoes/atividades");
}
