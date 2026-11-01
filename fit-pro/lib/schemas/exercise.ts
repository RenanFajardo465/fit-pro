import { z } from "zod";
import {
  MUSCLE_GROUPS,
  METRIC_TYPES,
  EQUIPMENT_TYPES,
  MOVEMENT_PATTERNS,
  GRIP_TYPES,
  POSITION_VARIANTS,
} from "@/lib/workout/vocabulary";

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

/**
 * Catálogo Inteligente — atributos novos (equipamento, padrão de
 * movimento, pegada, posição/inclinação) são opcionais: o <Select> do
 * formulário manda "" quando "não informar" está selecionado. Sem
 * transform aqui de propósito (mantém o tipo igual ao que o <select>
 * produz, sem complicar o genérico do react-hook-form) — a conversão de
 * "" para `null` antes de gravar no banco acontece em lib/actions/exercises.ts.
 */
function optionalEnumField<T extends readonly [string, ...string[]]>(values: T) {
  return z.union([z.enum(values), z.literal("")]).optional();
}

export const exerciseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do exercício")
    .max(120, "Nome muito longo (máx. 120 caracteres)"),
  muscle_group: z.enum(MUSCLE_GROUPS, {
    message: "Selecione um grupo muscular",
  }),
  secondary_muscle_groups: z.array(z.enum(MUSCLE_GROUPS)).optional(),
  category: optionalText,
  metric_type: z.enum(METRIC_TYPES, {
    message: "Selecione um tipo de exercício",
  }),
  equipment: optionalEnumField(EQUIPMENT_TYPES),
  movement_pattern: optionalEnumField(MOVEMENT_PATTERNS),
  grip_type: optionalEnumField(GRIP_TYPES),
  position_variant: optionalEnumField(POSITION_VARIANTS),
  is_unilateral: z.boolean().optional(),
  description: optionalText,
  image_url: optionalUrl,
  gif_url: optionalUrl,
  video_url: optionalUrl,
  external_url: optionalUrl,
  notes: optionalText,
  /** Sinônimos digitados no formulário (um por linha/chip) — viram linhas em exercise_aliases. */
  aliases: z.array(z.string().trim().min(1)).optional(),
});

export type ExerciseFormValues = z.infer<typeof exerciseSchema>;
