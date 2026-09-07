/**
 * Vocabulário compartilhado de nutrição — usado pelo formulário da
 * biblioteca de alimentos e, futuramente, pelo importador de CSV de dieta
 * (Fase 0, seção 21). Fonte única para não haver divergência entre o que o
 * formulário aceita e o que o CSV documentado aceita.
 *
 * Nota: o CSV da Fase 0 documenta a unidade de litro como maiúscula "L".
 * Aqui usamos minúscula "l", por consistência interna com todos os outros
 * códigos de unidade (que são todos minúsculos). O importador de CSV
 * (Incremento futuro, depois da dieta funcionar manualmente) precisa
 * mapear "L" → "l" na leitura do arquivo.
 */

export const FOOD_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "unidade",
  "fatia",
  "colher",
  "colher_cha",
  "colher_sopa",
  "xicara",
  "porcao",
  "scoop",
  "pacote",
] as const;

export type FoodUnit = (typeof FOOD_UNITS)[number];

export const FOOD_UNIT_LABELS: Record<FoodUnit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "L",
  unidade: "unidade",
  fatia: "fatia",
  colher: "colher",
  colher_cha: "colher de chá",
  colher_sopa: "colher de sopa",
  xicara: "xícara",
  porcao: "porção",
  scoop: "scoop",
  pacote: "pacote",
};

/**
 * Tipos de dieta — mesmos valores do CSV oficial de dieta (Fase 0, seção
 * 21.1, coluna `diet_type`). Igual ao vocabulário de treino, esta é a
 * fonte única compartilhada entre o formulário e o futuro importador de
 * CSV, pra não haver divergência entre o que cada um aceita.
 */
export const DIET_TYPES = [
  "treino",
  "descanso",
  "futebol",
  "muay_thai",
  "treino_atividade",
  "personalizado",
] as const;

export type DietType = (typeof DIET_TYPES)[number];

export const DIET_TYPE_LABELS: Record<DietType, string> = {
  treino: "Dia de treino",
  descanso: "Dia de descanso",
  futebol: "Dia de futebol",
  muay_thai: "Dia de muay thai",
  treino_atividade: "Treino + atividade externa",
  personalizado: "Personalizado",
};
