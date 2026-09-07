import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const selectDietForDaySchema = z.object({
  date: isoDate,
  diet_template_id: z.string().uuid("Selecione uma dieta"),
});

export type SelectDietForDayValues = z.infer<typeof selectDietForDaySchema>;

/**
 * consumed_quantity null = "desmarcar" (voltar a não-consumido). Um número
 * (mesmo que menor que o planejado — consumo parcial) marca como
 * consumido; o servidor recalcula os macros proporcionalmente (Fase 0,
 * seção 337), nunca confia num valor de macro vindo do cliente aqui.
 */
export const itemConsumptionSchema = z.object({
  item_id: z.string().uuid(),
  consumed_quantity: z.number().min(0).nullable(),
});

export type ItemConsumptionValues = z.infer<typeof itemConsumptionSchema>;

export const mealConsumptionSchema = z.object({
  meal_id: z.string().uuid(),
  consumed: z.boolean(),
});

export type MealConsumptionValues = z.infer<typeof mealConsumptionSchema>;

/**
 * Itens extra (fora da dieta do dia) sempre chegam com os macros já
 * calculados pelo cliente (alimento/receita × quantidade, ou digitados à
 * mão no caso "custom") — mesmo espírito de recipeItemSchema/
 * dietMealItemSchema: o servidor só valida e congela.
 */
export const extraFoodLogSchema = z
  .object({
    source: z.enum(["food", "recipe", "custom"]),
    food_id: z.string().uuid().nullable(),
    recipe_id: z.string().uuid().nullable(),
    name: z.string().trim().min(1, "Informe o nome do item").max(120),
    quantity: z.number().positive("Deve ser maior que zero"),
    calories: z.number().min(0),
    protein_g: z.number().min(0),
    carbs_g: z.number().min(0),
    fat_g: z.number().min(0),
    notes: z.string().trim().nullable(),
  })
  .refine((v) => (v.source === "food" ? v.recipe_id === null : true), {
    message: "Item de alimento não pode ter recipe_id",
    path: ["recipe_id"],
  })
  .refine((v) => (v.source === "recipe" ? v.food_id === null : true), {
    message: "Item de receita não pode ter food_id",
    path: ["food_id"],
  })
  .refine((v) => (v.source === "custom" ? v.food_id === null && v.recipe_id === null : true), {
    message: "Item personalizado não pode referenciar alimento ou receita",
    path: ["source"],
  });

export type ExtraFoodLogValues = z.infer<typeof extraFoodLogSchema>;
