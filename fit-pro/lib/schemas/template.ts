import { z } from "zod";
import { GROUP_TYPES } from "@/lib/workout/vocabulary";

export const templateMetaSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do treino").max(120),
  code: z
    .string()
    .trim()
    .min(1, "Informe o código (ex.: A, B, PERNA1)")
    .max(10, "Máx. 10 caracteres")
    .regex(/^[A-Za-z0-9_-]+$/, "Use apenas letras, números, - ou _"),
});

export type TemplateMetaValues = z.infer<typeof templateMetaSchema>;

/**
 * Validação de cada item ao salvar o editor de template (Server Action,
 * antes de chamar a RPC `replace_template_items`). Regras de agrupamento
 * espelham o formato oficial do CSV de treino (Fase 0, seção 20) — isso não
 * é coincidência: o editor e o importador de CSV compartilham as mesmas
 * regras de negócio.
 */
export const templateItemSchema = z
  .object({
    order_index: z.number().int().min(0),
    group_type: z.enum(GROUP_TYPES),
    group_id: z.string().nullable(),
    group_order: z.number().int().min(1).nullable(),
    exercise_id: z.string().uuid("Selecione um exercício válido"),
    sets: z.number().int().min(1, "Mínimo 1 série"),
    reps_min: z.number().int().min(0).nullable(),
    reps_max: z.number().int().min(0).nullable(),
    duration_target_seconds: z.number().int().min(1).nullable(),
    distance_target_meters: z.number().min(0).nullable(),
    initial_load_kg: z.number().min(0).nullable(),
    rest_seconds: z.number().int().min(0),
    technique: z.string().nullable(),
    notes: z.string().nullable(),
  })
  .refine(
    (item) => item.reps_max === null || item.reps_min === null || item.reps_max >= item.reps_min,
    { message: "A repetição máxima precisa ser maior ou igual à mínima", path: ["reps_max"] }
  )
  .refine(
    (item) =>
      item.group_type === "single"
        ? item.group_id === null && item.group_order === null
        : item.group_id !== null && item.group_order !== null,
    { message: "Agrupamento inconsistente", path: ["group_id"] }
  );

export const templateItemsSchema = z.array(templateItemSchema).min(1, "Adicione ao menos um exercício");

export type TemplateItemValues = z.infer<typeof templateItemSchema>;
