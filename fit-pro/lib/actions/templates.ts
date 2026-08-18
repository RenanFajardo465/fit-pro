"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  templateMetaSchema,
  templateItemsSchema,
  type TemplateMetaValues,
  type TemplateItemValues,
} from "@/lib/schemas/template";

export type TemplateActionResult = { error: string } | void;

export async function createTemplate(
  values: TemplateMetaValues
): Promise<TemplateActionResult> {
  const parsed = templateMetaSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("workout_templates")
    .insert({ user_id: user.id, name: parsed.data.name, code: parsed.data.code })
    .select("id")
    .single();

  if (error) {
    const message = error.code === "23505" ? "Já existe um treino com esse código." : error.message;
    return { error: `Erro ao criar: ${message}` };
  }

  revalidatePath("/treino/templates");
  redirect(`/treino/templates/${data.id}`);
}

export async function updateTemplateMeta(
  id: string,
  values: TemplateMetaValues
): Promise<TemplateActionResult> {
  const parsed = templateMetaSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("workout_templates")
    .update({ name: parsed.data.name, code: parsed.data.code })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    const message = error.code === "23505" ? "Já existe um treino com esse código." : error.message;
    return { error: `Erro ao salvar: ${message}` };
  }

  revalidatePath("/treino/templates");
  revalidatePath(`/treino/templates/${id}`);
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("workout_templates")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/treino/templates");
  redirect("/treino/templates");
}

/**
 * Substitui todos os itens do template de uma vez (Fase 0, seção 22 —
 * mesma estratégia transacional que a importação de CSV vai usar). O
 * editor mantém tudo em estado local até o usuário tocar em "Salvar"; só
 * então isso é chamado.
 */
export async function saveTemplateItems(
  templateId: string,
  items: TemplateItemValues[]
): Promise<TemplateActionResult> {
  const parsed = templateItemsSchema.safeParse(items);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("replace_template_items", {
    p_template_id: templateId,
    p_items: parsed.data,
  });

  if (error) {
    return { error: `Erro ao salvar: ${error.message}` };
  }

  revalidatePath(`/treino/templates/${templateId}`);
}
