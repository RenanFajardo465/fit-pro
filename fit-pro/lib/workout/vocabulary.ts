/**
 * Vocabulário compartilhado de treino — usado pelo formulário da biblioteca de
 * exercícios, pela validação de CSV (Fase 2, próxima entrega) e pela execução
 * do treino (Fase 3). Fonte única, para não haver divergência entre o que o
 * formulário aceita e o que o CSV documentado na Fase 0 aceita.
 */

export const MUSCLE_GROUPS = [
  "peito",
  "costas",
  "ombro",
  "biceps",
  "triceps",
  "perna",
  "gluteo",
  "abdomen",
  "cardio",
  "corpo_inteiro",
  "outro",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  peito: "Peito",
  costas: "Costas",
  ombro: "Ombro",
  biceps: "Bíceps",
  triceps: "Tríceps",
  perna: "Perna",
  gluteo: "Glúteo",
  abdomen: "Abdômen",
  cardio: "Cardio",
  corpo_inteiro: "Corpo inteiro",
  outro: "Outro",
};

export const METRIC_TYPES = [
  "musculacao",
  "peso_corporal",
  "isometrico",
  "corrida",
  "esteira",
  "outro",
] as const;

export type MetricType = (typeof METRIC_TYPES)[number];

export const METRIC_TYPE_LABELS: Record<MetricType, string> = {
  musculacao: "Musculação (carga + repetições)",
  peso_corporal: "Peso corporal (repetições)",
  isometrico: "Isométrico (duração)",
  corrida: "Corrida (duração + distância)",
  esteira: "Esteira (duração + distância)",
  outro: "Outro",
};

/** Quais campos de prescrição fazem sentido mostrar para cada tipo de métrica. */
export function metricUsesReps(metricType: string) {
  return metricType === "musculacao" || metricType === "peso_corporal";
}
export function metricUsesLoad(metricType: string) {
  return metricType === "musculacao" || metricType === "peso_corporal";
}
export function metricUsesDuration(metricType: string) {
  return metricType === "isometrico" || metricType === "corrida" || metricType === "esteira";
}
export function metricUsesDistance(metricType: string) {
  return metricType === "corrida" || metricType === "esteira";
}

export const GROUP_TYPES = ["single", "biset", "triset", "superset"] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  single: "Exercício avulso",
  biset: "Bi-set",
  triset: "Tri-set",
  superset: "Superset",
};

/** group_type derivado do número de exercícios de um bloco (Fase 0, seção 42). */
export function groupTypeForSize(size: number): GroupType {
  if (size <= 1) return "single";
  if (size === 2) return "biset";
  if (size === 3) return "triset";
  return "superset";
}

export const TECHNIQUES = [
  "normal",
  "dropset",
  "restpause",
  "cluster",
  "isometria_final",
  "outro",
] as const;
export type Technique = (typeof TECHNIQUES)[number];

export const TECHNIQUE_LABELS: Record<Technique, string> = {
  normal: "Normal",
  dropset: "Dropset",
  restpause: "Rest-pause",
  cluster: "Cluster",
  isometria_final: "Isometria final",
  outro: "Outro",
};

/** 0 = domingo ... 6 = sábado (Fase 0, seção 6.3). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

export const WEEKDAY_SHORT_LABELS: Record<Weekday, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

export const SCHEDULE_MODES = ["sequence", "weekday", "rules"] as const;
export type ScheduleMode = (typeof SCHEDULE_MODES)[number];

export const SCHEDULE_MODE_LABELS: Record<ScheduleMode, string> = {
  sequence: "Sequência contínua",
  weekday: "Por dia da semana",
  rules: "Regras (sobre a sequência)",
};

/**
 * Tipos de regra do Modo 3 (Fase 0, seção 6.3/26). "avoid_muscle_group_
 * after_activity" existe no enum (mesmo formato salvo no banco desde já),
 * mas só fica selecionável na UI a partir da entrega de Atividades
 * externas — sem atividades cadastradas não há o que escolher no parâmetro
 * dela.
 */
export const RULE_TYPES = [
  "avoid_template_on_weekday",
  "avoid_muscle_group_after_activity",
  "reserve_rest_day",
  "prioritize_template_on_weekday",
] as const;
export type RuleType = (typeof RULE_TYPES)[number];

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  avoid_template_on_weekday: "Não realizar um treino em um dia da semana",
  avoid_muscle_group_after_activity: "Evitar grupo muscular após uma atividade",
  reserve_rest_day: "Reservar dia de descanso",
  prioritize_template_on_weekday: "Priorizar um treino em um dia da semana",
};

/**
 * Todos os 4 tipos de regra documentados na Fase 0 já têm suporte completo
 * na UI a partir desta entrega (o 4º tipo dependia de Atividades externas
 * existir, o que só aconteceu agora).
 */
export const AVAILABLE_RULE_TYPES: RuleType[] = [
  "reserve_rest_day",
  "prioritize_template_on_weekday",
  "avoid_template_on_weekday",
  "avoid_muscle_group_after_activity",
];
