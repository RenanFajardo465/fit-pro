import { z } from "zod";
import { MUSCLE_GROUPS, METRIC_TYPES } from "@/lib/workout/vocabulary";

/**
 * Aceita string vazia (campo em branco no formulário) OU uma URL válida.
 * Convertida para `null` antes de salvar no banco.
 */
const optionalUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || z.string().url().safeParse(value).success, {
    message: "URL inválida",
  })
  .optional();

const optionalText = z.string().trim().optional();

export const exerciseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do exercício")
    .max(120, "Nome muito longo (máx. 120 caracteres)"),
  muscle_group: z.enum(MUSCLE_GROUPS, {
    message: "Selecione um grupo muscular",
  }),
  category: optionalText,
  metric_type: z.enum(METRIC_TYPES, {
    message: "Selecione um tipo de exercício",
  }),
  description: optionalText,
  image_url: optionalUrl,
  gif_url: optionalUrl,
  video_url: optionalUrl,
  external_url: optionalUrl,
  notes: optionalText,
});

export type ExerciseFormValues = z.infer<typeof exerciseSchema>;
