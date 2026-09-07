import { z } from "zod";
import { FOOD_UNITS } from "@/lib/nutrition/vocabulary";

const optionalText = z.string().trim().optional();

/**
 * Todos os campos numéricos de macro vêm de um <input type="number"> —
 * chegam como string no form e são convertidos via `setValueAs` no
 * componente (nunca aqui), então o schema já espera `number`.
 */
export const foodSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do alimento")
    .max(120, "Nome muito longo (máx. 120 caracteres)"),
  brand: optionalText,
  serving_quantity: z
    .number({ message: "Informe a quantidade da porção" })
    .positive("Deve ser maior que zero"),
  serving_unit: z.enum(FOOD_UNITS, {
    message: "Selecione uma unidade",
  }),
  grams_equivalent: z
    .number({ message: "Informe o equivalente em gramas" })
    .positive("Deve ser maior que zero"),
  calories: z.number({ message: "Informe as calorias" }).min(0, "Não pode ser negativo"),
  protein_g: z.number({ message: "Informe as proteínas" }).min(0, "Não pode ser negativo"),
  carbs_g: z.number({ message: "Informe os carboidratos" }).min(0, "Não pode ser negativo"),
  fat_g: z.number({ message: "Informe as gorduras" }).min(0, "Não pode ser negativo"),
});

export type FoodFormValues = z.infer<typeof foodSchema>;
