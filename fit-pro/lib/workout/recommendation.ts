/**
 * Motor de recomendação de treino — fluxo contínuo/sequencial (ajuste
 * pós-Incremento 3, item 1 da lista do usuário).
 *
 * Substitui o antigo `resolveWorkoutForDate`, que amarrava a recomendação
 * ao calendário (modos "por dia da semana"/"regras", override manual por
 * data, atividades externas). Isso foi removido: os treinos seguem uma
 * fila única e contínua — terminou o Treino A, o próximo treino sugerido
 * é sempre o B, não importa em que dia isso acontece. Continua uma função
 * pura (sem tocar em rede/banco) para ficar trivial de testar isolada.
 */

export type NextWorkoutResult = {
  /** null só quando não há nenhum template cadastrado ainda. */
  templateId: string | null;
  reason?: string;
};

export function resolveNextWorkout(
  templatesInOrder: { id: string }[],
  sequenceState: { last_completed_template_id: string | null } | null
): NextWorkoutResult {
  if (templatesInOrder.length === 0) {
    return { templateId: null, reason: "Nenhum template cadastrado ainda" };
  }

  const lastId = sequenceState?.last_completed_template_id ?? null;
  if (!lastId) {
    return { templateId: templatesInOrder[0].id };
  }

  const idx = templatesInOrder.findIndex((t) => t.id === lastId);
  if (idx === -1) {
    // Último concluído não existe mais na lista ativa (foi para a lixeira) —
    // reinicia a fila do começo em vez de travar a recomendação.
    return { templateId: templatesInOrder[0].id };
  }

  const next = templatesInOrder[(idx + 1) % templatesInOrder.length];
  return { templateId: next.id };
}
