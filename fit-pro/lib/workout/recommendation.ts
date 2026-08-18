import type { ScheduleMode, RuleType } from "@/lib/workout/vocabulary";

/**
 * Motor de recomendação de treino (Fase 0, seção 12). Função pura —
 * recebe todo o estado já carregado e devolve uma decisão, sem tocar em
 * rede/banco — o que a torna trivial de testar isoladamente.
 *
 * Decisão tomada para resolver uma ambiguidade da Fase 0: a seção 12 diz
 * que o Modo 3 ("regras") "aplica os filtros sobre o resultado do passo
 * 3", mas o passo 3 só define resolução para os Modos 1/2, sem dizer qual
 * dos dois serve de base quando o modo ativo é "regras". Escolhi usar
 * sempre a sequência contínua (Modo 1) como base do Modo 3 — quem quiser
 * regras baseadas em dia da semana já tem o Modo 2 nativamente (ele já
 * cobre "reservar descanso" e "priorizar treino X no dia Y" sem precisar
 * de regra nenhuma). O Modo 3 fica reservado para regras que a sequência
 * simples não cobre sozinha (evitar um treino específico, evitar um grupo
 * muscular depois de uma atividade externa).
 *
 * Segunda decisão, desta entrega: "evitar grupo muscular após atividade"
 * é interpretado como "a atividade acontece no MESMO dia D que está sendo
 * resolvido" (ex.: joga futebol de manhã, evita treino de perna à noite do
 * mesmo dia) — não "no dia seguinte". Fase 0 não detalhava isso.
 */

export type ScheduleRule = {
  rule_type: RuleType;
  params: Record<string, unknown>;
};

export type ExternalActivityRef = {
  id: string;
  /** 0 = domingo ... 6 = sábado, ou null se for uma atividade de data específica. */
  weekday: number | null;
  /** YYYY-MM-DD, ou null se for uma atividade recorrente por dia da semana. */
  date: string | null;
};

export type ResolutionSource = "manual_override" | "rule" | "sequence" | "weekday" | "none";

export type ResolveResult = {
  templateId: string | null; // null = descanso (ou "nada definido", ver source)
  source: ResolutionSource;
  reason?: string;
};

export type ResolveInput = {
  /** YYYY-MM-DD da data sendo resolvida — necessário para casar atividades de data específica. */
  date: string;
  /** 0 = domingo ... 6 = sábado. Calculado fora da função para ela ficar pura/testável. */
  weekday: number;
  mode: ScheduleMode;
  /** Templates ativos do usuário, na ordem de rotação (por código, ver seção "decisões técnicas"). */
  templatesInOrder: { id: string }[];
  sequenceState: { last_completed_template_id: string | null } | null;
  /** weekday -> template_id (null = descanso); ausência de chave = dia não configurado. */
  weekdayAssignments: Map<number, string | null>;
  rules: ScheduleRule[];
  activities: ExternalActivityRef[];
  /** template_id -> conjunto de grupos musculares presentes nele (para a regra do 4º tipo). */
  templateMuscleGroups: Map<string, Set<string>>;
  /** Override manual da data, se existir (Fase 0, seção 12, passo 1 — prioridade máxima). */
  manualOverride: { template_id: string | null } | null;
};

function resolveSequence(
  templatesInOrder: { id: string }[],
  sequenceState: ResolveInput["sequenceState"]
): ResolveResult {
  if (templatesInOrder.length === 0) {
    return { templateId: null, source: "none", reason: "Nenhum template cadastrado ainda" };
  }
  const lastId = sequenceState?.last_completed_template_id ?? null;
  if (!lastId) {
    return { templateId: templatesInOrder[0].id, source: "sequence" };
  }
  const idx = templatesInOrder.findIndex((t) => t.id === lastId);
  if (idx === -1) {
    // Último concluído não existe mais na lista ativa (foi para a lixeira) —
    // reinicia a fila do começo em vez de travar a recomendação.
    return { templateId: templatesInOrder[0].id, source: "sequence" };
  }
  const next = templatesInOrder[(idx + 1) % templatesInOrder.length];
  return { templateId: next.id, source: "sequence" };
}

function activityOccursOn(activity: ExternalActivityRef, date: string, weekday: number): boolean {
  if (activity.date !== null) return activity.date === date;
  if (activity.weekday !== null) return activity.weekday === weekday;
  return false;
}

function applyRules(
  base: ResolveResult,
  date: string,
  weekday: number,
  rules: ScheduleRule[],
  activities: ExternalActivityRef[],
  templateMuscleGroups: Map<string, Set<string>>
): ResolveResult {
  for (const rule of rules) {
    if (rule.rule_type === "reserve_rest_day" && rule.params.weekday === weekday) {
      return { templateId: null, source: "rule", reason: "Dia de descanso reservado por regra" };
    }
  }

  for (const rule of rules) {
    if (rule.rule_type === "prioritize_template_on_weekday" && rule.params.weekday === weekday) {
      return {
        templateId: (rule.params.template_id as string) ?? null,
        source: "rule",
        reason: "Treino priorizado por regra para este dia",
      };
    }
  }

  for (const rule of rules) {
    if (
      rule.rule_type === "avoid_template_on_weekday" &&
      rule.params.weekday === weekday &&
      base.templateId !== null &&
      rule.params.template_id === base.templateId
    ) {
      return {
        templateId: null,
        source: "rule",
        reason: "Treino da sequência evitado neste dia por regra (sem substituto automático)",
      };
    }
  }

  for (const rule of rules) {
    if (rule.rule_type !== "avoid_muscle_group_after_activity") continue;
    if (base.templateId === null) continue;

    const activity = activities.find((a) => a.id === rule.params.activity_id);
    if (!activity || !activityOccursOn(activity, date, weekday)) continue;

    const muscleGroups = templateMuscleGroups.get(base.templateId);
    if (muscleGroups?.has(rule.params.muscle_group as string)) {
      return {
        templateId: null,
        source: "rule",
        reason: "Grupo muscular evitado após atividade externa (sem substituto automático)",
      };
    }
  }

  return base;
}

export function resolveWorkoutForDate(input: ResolveInput): ResolveResult {
  if (input.manualOverride) {
    return { templateId: input.manualOverride.template_id, source: "manual_override" };
  }

  if (input.mode === "weekday") {
    if (!input.weekdayAssignments.has(input.weekday)) {
      return { templateId: null, source: "none", reason: "Nenhum treino configurado para este dia da semana" };
    }
    return { templateId: input.weekdayAssignments.get(input.weekday) ?? null, source: "weekday" };
  }

  let base = resolveSequence(input.templatesInOrder, input.sequenceState);

  if (input.mode === "rules") {
    base = applyRules(
      base,
      input.date,
      input.weekday,
      input.rules,
      input.activities,
      input.templateMuscleGroups
    );
  }

  return base;
}
