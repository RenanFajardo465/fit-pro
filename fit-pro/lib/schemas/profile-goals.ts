import { z } from "zod";

/**
 * Meta diária de calorias/proteína, ambas opcionais (`null` = sem meta
 * definida, o que faz o resumo esconder a comparação). Assim como em
 * food.ts, os campos numéricos chegam de <input type="number"> e são
 * convertidos via `setValueAs` no componente antes de chegar aqui.
 */
export const profileGoalsSchema = z.object({
  daily_calorie_goal: z.number().positive("Deve ser maior que zero").nullable(),
  daily_protein_goal_g: z.number().positive("Deve ser maior que zero").nullable(),
});

export type ProfileGoalsFormValues = z.infer<typeof profileGoalsSchema>;
