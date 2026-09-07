import { z } from "zod";
import { DIET_TYPES, FOOD_UNITS } from "@/lib/nutrition/vocabulary";

export const dietTemplateMetaSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da dieta").max(120),
  code: z
    .string()
    .trim()
    .min(1, "Informe o código (ex.: TREINO_A)")
    .max(20, "Máx. 20 caracteres")
    .regex(/^[A-Za-z0-9_-]+$/, "Use apenas letras, números, - ou _"),
  diet_type: z.enum(DIET_TYPES, { message: "Selecione um tipo de dieta" }),
});

export type DietTemplateMetaValues = z.infer<typeof dietTemplateMetaSchema>;

/**
 * Um item já vem com quantity/unit/grams_equivalent/macros calculados
 * (alimento × quantidade) pelo editor — mesmo espírito de recipeItemSchema:
 * o servidor só valida e congela o que chegou, nunca recalcula a partir do
 * food_id (Fase 0, seção 8). O formato aqui espelha as colunas do CSV
 * oficial de dieta (seção 21.1), de propósito.
 */
export const dietMealItemSchema = z.object({
  order_index: z.number().int().min(0),
  food_id: z.string().uuid().nullable(),
  food_name: z.string().trim().min(1),
  quantity: z.number().positive("Deve ser maior que zero"),
  unit: z.enum(FOOD_UNITS, { message: "Selecione uma unidade" }),
  grams_equivalent: z.number().positive("Deve ser maior que zero"),
  calories: z.number().min(0),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_g: z.number().min(0),
  notes: z.string().trim().nullable(),
});

export type DietMealItemValues = z.infer<typeof dietMealItemSchema>;

export const dietMealSchema = z.object({
  order_index: z.number().int().min(0),
  name: z.string().trim().min(1, "Informe o nome da refeição").max(80),
  meal_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:MM")
    .nullable(),
  items: z.array(dietMealItemSchema).min(1, "Adicione ao menos um alimento na refeição"),
});

export type DietMealValues = z.infer<typeof dietMealSchema>;

export const dietMealsPayloadSchema = z
  .array(dietMealSchema)
  .min(1, "Adicione ao menos uma refeição");
