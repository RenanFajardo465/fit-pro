/**
 * Catálogo Inteligente de Exercícios — normalização e similaridade de
 * nomes, usado nos DOIS lados: no cliente (sugestão imediata ao digitar,
 * antes mesmo de salvar) e espelhado em SQL na migration 0019
 * (`normalize_exercise_name`) para o bloqueio de verdade no banco. As duas
 * implementações precisam concordar: minúsculas, sem acento, espaços
 * colapsados — NUNCA removendo palavras que mudam o exercício (equipamento,
 * pegada, inclinação), só variação de escrita/grafia.
 */

export function normalizeExerciseName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (combining marks)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Bigramas de caracteres (inclui espaço) — base do coeficiente de Dice abaixo. */
function bigrams(s: string): string[] {
  const padded = ` ${s} `;
  const grams: string[] = [];
  for (let i = 0; i < padded.length - 1; i++) grams.push(padded.slice(i, i + 2));
  return grams;
}

/**
 * Similaridade 0–1 por coeficiente de Dice sobre bigramas de caracteres —
 * robusta a pequenas diferenças de grafia/abreviação sem precisar de
 * dependência externa nem de extensão específica do Postgres no cliente.
 * Usada só para SUGERIR possíveis duplicatas (nunca para fundir sozinho).
 */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeExerciseName(a);
  const nb = normalizeExerciseName(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0;

  const bigramsA = bigrams(na);
  const bigramsB = bigrams(nb);
  const counts = new Map<string, number>();
  for (const g of bigramsA) counts.set(g, (counts.get(g) ?? 0) + 1);

  let matches = 0;
  for (const g of bigramsB) {
    const count = counts.get(g) ?? 0;
    if (count > 0) {
      matches++;
      counts.set(g, count - 1);
    }
  }
  return (2 * matches) / (bigramsA.length + bigramsB.length);
}

export type DuplicateCandidate<T> = { item: T; score: number };

/**
 * Dado um nome candidato e uma lista de { name, ...T }, devolve os mais
 * parecidos acima do limiar, ordenados do mais pro menos parecido —
 * usado tanto pelo formulário de novo exercício (seção 5) quanto por uma
 * eventual tela de revisão de duplicatas (seção 5, "mecanismo para revisar
 * e corrigir duplicidades posteriormente").
 */
export function findSimilarByName<T extends { name: string }>(
  candidateName: string,
  items: T[],
  threshold = 0.5
): DuplicateCandidate<T>[] {
  return items
    .map((item) => ({ item, score: nameSimilarity(candidateName, item.name) }))
    .filter((c) => c.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
