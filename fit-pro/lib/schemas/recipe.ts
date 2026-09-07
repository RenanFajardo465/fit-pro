import { z } from "zod";

export const recipeMetaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da receita")
    .max(120, "Nome muito longo (máx. 120 caracteres)"),
});

export type RecipeMetaValues = z.infer<typeof recipeMetaSchema>;

/**
 * Um item já vem com os macros calculados (alimento × quantity_servings)
 * pelo editor, que tem o alimento inteiro carregado no cliente — o
 * servidor só valida e congela o que chegou (Fase 0, seção 8: os macros do
 * item nunca são recalculados a partir do food_id depois de salvos).
 */
export const recipeItemSchema = z.object({
  food_id: z.string().uuid().nullable(),
  food_name: z.string().trim().min(1),
  quantity_servings: z.number().positive("Deve ser maior que zero"),
  calories: z.number().min(0),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_g: z.number().min(0),
});

export type RecipeItemValues = z.infer<typeof recipeItemSchema>;

export const recipeItemsPayloadSchema = z.object({
  servings: z.number().positive("Rendimento precisa ser maior que zero"),
  items: z.array(recipeItemSchema).min(1, "Adicione ao menos um alimento"),
});

export type RecipeItemsPayload = z.infer<typeof recipeItemsPayloadSchema>;
