/**
 * Recorte curado da Tabela Brasileira de Composição de Alimentos (TACO,
 * NEPA/UNICAMP, 4ª edição) — pensado pra alimentos "in natura"/básicos,
 * que o Open Food Facts cobre mal (ele é forte em produto industrializado
 * com embalagem/código de barras, não em "arroz cozido" ou "banana crua").
 *
 * Importante: isso NÃO é a tabela TACO inteira (ela tem ~600 itens) — é um
 * subconjunto pequeno dos alimentos mais comuns no dia a dia, com valores
 * conferidos por fonte secundária que cita a TACO (tabelatacoonline.com.br
 * e solufition.com.br), cruzados entre si onde possível. Sempre por 100g
 * de porção comestível, como a TACO publica. Dá pra ampliar essa lista
 * depois, mas cada item novo precisa vir de uma fonte real — nunca
 * estimado de cabeça, pra não contaminar o diário nutricional de alguém
 * com um número inventado.
 */

export type TacoFood = {
  name: string;
  caloriesPer100g: number;
  proteinGPer100g: number;
  carbsGPer100g: number;
  fatGPer100g: number;
};

export const TACO_SEED: TacoFood[] = [
  { name: "Arroz branco, tipo 1, cozido", caloriesPer100g: 128, proteinGPer100g: 2.5, carbsGPer100g: 28.1, fatGPer100g: 0.2 },
  { name: "Arroz integral, cozido", caloriesPer100g: 124, proteinGPer100g: 2.6, carbsGPer100g: 25.8, fatGPer100g: 1.0 },
  { name: "Feijão carioca, cozido", caloriesPer100g: 76, proteinGPer100g: 4.8, carbsGPer100g: 13.6, fatGPer100g: 0.5 },
  { name: "Feijão preto, cozido", caloriesPer100g: 77, proteinGPer100g: 4.5, carbsGPer100g: 14.0, fatGPer100g: 0.5 },
  { name: "Frango, peito, sem pele, grelhado", caloriesPer100g: 159, proteinGPer100g: 32.0, carbsGPer100g: 0, fatGPer100g: 2.5 },
  { name: "Carne bovina, patinho, sem gordura, grelhado", caloriesPer100g: 219, proteinGPer100g: 35.9, carbsGPer100g: 0, fatGPer100g: 7.3 },
  { name: "Ovo de galinha, inteiro, cozido", caloriesPer100g: 146, proteinGPer100g: 13.3, carbsGPer100g: 0.6, fatGPer100g: 9.5 },
  { name: "Pão francês", caloriesPer100g: 300, proteinGPer100g: 8.0, carbsGPer100g: 58.6, fatGPer100g: 3.1 },
  { name: "Pão de forma, integral", caloriesPer100g: 253, proteinGPer100g: 9.4, carbsGPer100g: 49.9, fatGPer100g: 3.7 },
  { name: "Banana prata, crua", caloriesPer100g: 98, proteinGPer100g: 1.3, carbsGPer100g: 26.0, fatGPer100g: 0.1 },
  { name: "Maçã, com casca, crua", caloriesPer100g: 63, proteinGPer100g: 0.2, carbsGPer100g: 16.6, fatGPer100g: 0.2 },
  { name: "Batata-doce, crua", caloriesPer100g: 118, proteinGPer100g: 1.3, carbsGPer100g: 28.2, fatGPer100g: 0.1 },
  { name: "Aveia em flocos, crua", caloriesPer100g: 394, proteinGPer100g: 13.9, carbsGPer100g: 66.6, fatGPer100g: 8.5 },
  { name: "Queijo minas, frescal", caloriesPer100g: 264, proteinGPer100g: 17.4, carbsGPer100g: 3.2, fatGPer100g: 20.2 },
  { name: "Iogurte natural", caloriesPer100g: 51, proteinGPer100g: 4.1, carbsGPer100g: 1.9, fatGPer100g: 3.0 },
  { name: "Azeite de oliva extra virgem", caloriesPer100g: 884, proteinGPer100g: 0, carbsGPer100g: 0, fatGPer100g: 100 },
  { name: "Tomate, com semente, cru", caloriesPer100g: 15, proteinGPer100g: 1.1, carbsGPer100g: 3.1, fatGPer100g: 0.2 },
  { name: "Alface americana, crua", caloriesPer100g: 9, proteinGPer100g: 0.6, carbsGPer100g: 1.7, fatGPer100g: 0.1 },
  { name: "Brócolis, cozido", caloriesPer100g: 25, proteinGPer100g: 2.1, carbsGPer100g: 4.4, fatGPer100g: 0.5 },
  { name: "Cenoura, crua", caloriesPer100g: 34, proteinGPer100g: 1.3, carbsGPer100g: 7.7, fatGPer100g: 0.2 },
  { name: "Abacate, cru", caloriesPer100g: 96, proteinGPer100g: 1.2, carbsGPer100g: 6.0, fatGPer100g: 8.4 },
  { name: "Leite de vaca integral, em pó", caloriesPer100g: 497, proteinGPer100g: 25.4, carbsGPer100g: 39.2, fatGPer100g: 26.9 },
];

export function searchTacoSeed(query: string): TacoFood[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return TACO_SEED.filter((f) => f.name.toLowerCase().includes(q));
}
