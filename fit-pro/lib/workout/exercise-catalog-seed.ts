import type { MuscleGroup, MetricType, EquipmentType, MovementPattern, GripType, PositionVariant } from "./vocabulary";

/**
 * Catálogo Inicial (Catálogo Inteligente, seção 8) — exercícios comuns de
 * musculação usados em academias brasileiras, organizados pelos 11 grupos
 * pedidos. Não é a lista exaustiva de tudo que existe — é um ponto de
 * partida real, sem variação inventada só pra engordar a lista. O usuário
 * escolhe o que quer importar pra própria biblioteca (nunca é forçado) e
 * pode continuar cadastrando o resto manualmente ou via CSV.
 *
 * `id` aqui é só uma chave estável pro componente de seleção (não é o uuid
 * do banco — esse é gerado na hora de importar).
 */
export type CatalogSeedExercise = {
  id: string;
  name: string;
  muscle_group: MuscleGroup;
  metric_type: MetricType;
  equipment?: EquipmentType;
  movement_pattern?: MovementPattern;
  grip_type?: GripType;
  position_variant?: PositionVariant;
  is_unilateral?: boolean;
};

export const EXERCISE_CATALOG_SEED: CatalogSeedExercise[] = [
  // Peito
  { id: "supino-reto-barra", name: "Supino reto com barra", muscle_group: "peito", metric_type: "musculacao", equipment: "barra", movement_pattern: "empurrar", grip_type: "pronada", position_variant: "reto" },
  { id: "supino-reto-halteres", name: "Supino reto com halteres", muscle_group: "peito", metric_type: "musculacao", equipment: "halteres", movement_pattern: "empurrar", grip_type: "neutra", position_variant: "reto" },
  { id: "supino-inclinado-barra", name: "Supino inclinado com barra", muscle_group: "peito", metric_type: "musculacao", equipment: "barra", movement_pattern: "empurrar", grip_type: "pronada", position_variant: "inclinado" },
  { id: "supino-inclinado-halteres", name: "Supino inclinado com halteres", muscle_group: "peito", metric_type: "musculacao", equipment: "halteres", movement_pattern: "empurrar", grip_type: "neutra", position_variant: "inclinado" },
  { id: "crucifixo-halteres", name: "Crucifixo com halteres", muscle_group: "peito", metric_type: "musculacao", equipment: "halteres", movement_pattern: "isolamento", grip_type: "neutra", position_variant: "reto" },
  { id: "crossover-cabo", name: "Crossover no cabo", muscle_group: "peito", metric_type: "musculacao", equipment: "cabo_polia", movement_pattern: "isolamento", position_variant: "em_pe" },
  { id: "supino-maquina", name: "Supino reto na máquina", muscle_group: "peito", metric_type: "musculacao", equipment: "maquina", movement_pattern: "empurrar", position_variant: "reto" },
  { id: "flexao-braco", name: "Flexão de braço", muscle_group: "peito", metric_type: "peso_corporal", equipment: "peso_corporal", movement_pattern: "empurrar", grip_type: "pronada" },

  // Costas
  { id: "puxada-frente-pronada", name: "Puxada frente na polia (pegada pronada)", muscle_group: "costas", metric_type: "musculacao", equipment: "cabo_polia", movement_pattern: "puxar", grip_type: "pronada", position_variant: "sentado" },
  { id: "puxada-frente-supinada", name: "Puxada frente na polia (pegada supinada)", muscle_group: "costas", metric_type: "musculacao", equipment: "cabo_polia", movement_pattern: "puxar", grip_type: "supinada", position_variant: "sentado" },
  { id: "remada-curvada-barra", name: "Remada curvada com barra", muscle_group: "costas", metric_type: "musculacao", equipment: "barra", movement_pattern: "puxar", grip_type: "pronada", position_variant: "em_pe" },
  { id: "remada-baixa-cabo", name: "Remada baixa no cabo", muscle_group: "costas", metric_type: "musculacao", equipment: "cabo_polia", movement_pattern: "puxar", grip_type: "neutra", position_variant: "sentado" },
  { id: "remada-unilateral-halter", name: "Remada unilateral com halter", muscle_group: "costas", metric_type: "musculacao", equipment: "halteres", movement_pattern: "puxar", grip_type: "neutra", position_variant: "em_pe", is_unilateral: true },
  { id: "barra-fixa", name: "Barra fixa", muscle_group: "costas", metric_type: "peso_corporal", equipment: "peso_corporal", movement_pattern: "puxar", grip_type: "pronada" },
  { id: "pullover-cabo", name: "Pullover no cabo", muscle_group: "costas", metric_type: "musculacao", equipment: "cabo_polia", movement_pattern: "isolamento", grip_type: "pronada", position_variant: "em_pe" },

  // Ombro
  { id: "desenvolvimento-barra", name: "Desenvolvimento com barra", muscle_group: "ombro", metric_type: "musculacao", equipment: "barra", movement_pattern: "empurrar", grip_type: "pronada", position_variant: "sentado" },
  { id: "desenvolvimento-halteres", name: "Desenvolvimento com halteres", muscle_group: "ombro", metric_type: "musculacao", equipment: "halteres", movement_pattern: "empurrar", grip_type: "neutra", position_variant: "sentado" },
  { id: "elevacao-lateral-halteres", name: "Elevação lateral com halteres", muscle_group: "ombro", metric_type: "musculacao", equipment: "halteres", movement_pattern: "isolamento", grip_type: "neutra", position_variant: "em_pe" },
  { id: "elevacao-frontal-halteres", name: "Elevação frontal com halteres", muscle_group: "ombro", metric_type: "musculacao", equipment: "halteres", movement_pattern: "isolamento", grip_type: "pronada", position_variant: "em_pe" },
  { id: "remada-alta-barra", name: "Remada alta com barra", muscle_group: "ombro", metric_type: "musculacao", equipment: "barra", movement_pattern: "puxar", grip_type: "pronada", position_variant: "em_pe" },
  { id: "crucifixo-inverso-maquina", name: "Crucifixo inverso na máquina", muscle_group: "ombro", metric_type: "musculacao", equipment: "maquina", movement_pattern: "isolamento", position_variant: "sentado" },
  { id: "desenvolvimento-arnold", name: "Desenvolvimento Arnold", muscle_group: "ombro", metric_type: "musculacao", equipment: "halteres", movement_pattern: "empurrar", grip_type: "neutra", position_variant: "sentado" },

  // Bíceps
  { id: "rosca-direta-barra", name: "Rosca direta com barra", muscle_group: "biceps", metric_type: "musculacao", equipment: "barra", movement_pattern: "isolamento", grip_type: "supinada", position_variant: "em_pe" },
  { id: "rosca-alternada-halteres", name: "Rosca alternada com halteres", muscle_group: "biceps", metric_type: "musculacao", equipment: "halteres", movement_pattern: "isolamento", grip_type: "supinada", position_variant: "em_pe" },
  { id: "rosca-scott", name: "Rosca Scott", muscle_group: "biceps", metric_type: "musculacao", equipment: "barra", movement_pattern: "isolamento", grip_type: "supinada", position_variant: "sentado" },
  { id: "rosca-martelo", name: "Rosca martelo", muscle_group: "biceps", metric_type: "musculacao", equipment: "halteres", movement_pattern: "isolamento", grip_type: "neutra", position_variant: "em_pe" },
  { id: "rosca-concentrada", name: "Rosca concentrada", muscle_group: "biceps", metric_type: "musculacao", equipment: "halteres", movement_pattern: "isolamento", grip_type: "supinada", position_variant: "sentado", is_unilateral: true },
  { id: "rosca-cabo", name: "Rosca direta no cabo", muscle_group: "biceps", metric_type: "musculacao", equipment: "cabo_polia", movement_pattern: "isolamento", grip_type: "supinada", position_variant: "em_pe" },

  // Tríceps
  { id: "triceps-pulley-barra", name: "Tríceps pulley com barra", muscle_group: "triceps", metric_type: "musculacao", equipment: "cabo_polia", movement_pattern: "isolamento", grip_type: "pronada", position_variant: "em_pe" },
  { id: "triceps-corda-cabo", name: "Tríceps corda no cabo", muscle_group: "triceps", metric_type: "musculacao", equipment: "cabo_polia", movement_pattern: "isolamento", grip_type: "neutra", position_variant: "em_pe" },
  { id: "triceps-testa-barra", name: "Tríceps testa com barra", muscle_group: "triceps", metric_type: "musculacao", equipment: "barra", movement_pattern: "isolamento", grip_type: "pronada", position_variant: "deitado" },
  { id: "triceps-frances-halter", name: "Tríceps francês com halter", muscle_group: "triceps", metric_type: "musculacao", equipment: "halteres", movement_pattern: "isolamento", grip_type: "neutra", position_variant: "sentado" },
  { id: "mergulho-banco", name: "Mergulho no banco (tríceps)", muscle_group: "triceps", metric_type: "peso_corporal", equipment: "peso_corporal", movement_pattern: "empurrar" },
  { id: "supino-fechado", name: "Supino fechado", muscle_group: "triceps", metric_type: "musculacao", equipment: "barra", movement_pattern: "empurrar", grip_type: "pronada", position_variant: "reto" },

  // Antebraço
  { id: "rosca-punho-barra", name: "Rosca de punho com barra", muscle_group: "antebraco", metric_type: "musculacao", equipment: "barra", movement_pattern: "isolamento", grip_type: "pronada", position_variant: "sentado" },
  { id: "rosca-punho-inversa-barra", name: "Rosca de punho inversa com barra", muscle_group: "antebraco", metric_type: "musculacao", equipment: "barra", movement_pattern: "isolamento", grip_type: "pronada", position_variant: "sentado" },
  { id: "flexao-punho-halteres", name: "Flexão de punho com halteres", muscle_group: "antebraco", metric_type: "musculacao", equipment: "halteres", movement_pattern: "isolamento", grip_type: "neutra", position_variant: "sentado" },

  // Abdômen e core
  { id: "abdominal-supra", name: "Abdominal supra no solo", muscle_group: "abdomen", metric_type: "peso_corporal", equipment: "peso_corporal", movement_pattern: "core", position_variant: "deitado" },
  { id: "abdominal-infra", name: "Abdominal infra (elevação de pernas no solo)", muscle_group: "abdomen", metric_type: "peso_corporal", equipment: "peso_corporal", movement_pattern: "core", position_variant: "deitado" },
  { id: "prancha", name: "Prancha abdominal", muscle_group: "abdomen", metric_type: "isometrico", equipment: "peso_corporal", movement_pattern: "core" },
  { id: "abdominal-polia", name: "Abdominal na polia (crunch de joelhos)", muscle_group: "abdomen", metric_type: "musculacao", equipment: "cabo_polia", movement_pattern: "core", position_variant: "em_pe" },
  { id: "abdominal-obliquo", name: "Abdominal oblíquo", muscle_group: "abdomen", metric_type: "peso_corporal", equipment: "peso_corporal", movement_pattern: "core", position_variant: "deitado" },
  { id: "elevacao-pernas-barra-fixa", name: "Elevação de pernas na barra fixa", muscle_group: "abdomen", metric_type: "peso_corporal", equipment: "peso_corporal", movement_pattern: "core" },

  // Quadríceps
  { id: "agachamento-livre-barra", name: "Agachamento livre com barra", muscle_group: "quadriceps", metric_type: "musculacao", equipment: "barra", movement_pattern: "agachar", position_variant: "em_pe" },
  { id: "agachamento-smith", name: "Agachamento no Smith", muscle_group: "quadriceps", metric_type: "musculacao", equipment: "smith", movement_pattern: "agachar", position_variant: "em_pe" },
  { id: "leg-press-45", name: "Leg press 45°", muscle_group: "quadriceps", metric_type: "musculacao", equipment: "maquina", movement_pattern: "agachar", position_variant: "sentado" },
  { id: "cadeira-extensora", name: "Cadeira extensora", muscle_group: "quadriceps", metric_type: "musculacao", equipment: "maquina", movement_pattern: "isolamento", position_variant: "sentado" },
  { id: "agachamento-bulgaro-halteres", name: "Agachamento búlgaro com halteres", muscle_group: "quadriceps", metric_type: "musculacao", equipment: "halteres", movement_pattern: "agachar", position_variant: "em_pe", is_unilateral: true },
  { id: "hack-machine", name: "Agachamento Hack (máquina)", muscle_group: "quadriceps", metric_type: "musculacao", equipment: "maquina", movement_pattern: "agachar", position_variant: "em_pe" },
  { id: "afundo-halteres", name: "Afundo com halteres", muscle_group: "quadriceps", metric_type: "musculacao", equipment: "halteres", movement_pattern: "agachar", position_variant: "em_pe", is_unilateral: true },

  // Posterior de coxa
  { id: "mesa-flexora", name: "Mesa flexora", muscle_group: "posterior_coxa", metric_type: "musculacao", equipment: "maquina", movement_pattern: "isolamento", position_variant: "deitado" },
  { id: "cadeira-flexora", name: "Cadeira flexora", muscle_group: "posterior_coxa", metric_type: "musculacao", equipment: "maquina", movement_pattern: "isolamento", position_variant: "sentado" },
  { id: "stiff-barra", name: "Stiff com barra", muscle_group: "posterior_coxa", metric_type: "musculacao", equipment: "barra", movement_pattern: "dobradica_quadril", grip_type: "pronada", position_variant: "em_pe" },
  { id: "terra-romeno-halteres", name: "Levantamento terra romeno com halteres", muscle_group: "posterior_coxa", metric_type: "musculacao", equipment: "halteres", movement_pattern: "dobradica_quadril", grip_type: "neutra", position_variant: "em_pe" },
  { id: "flexora-em-pe-unilateral", name: "Flexora em pé (unilateral)", muscle_group: "posterior_coxa", metric_type: "musculacao", equipment: "maquina", movement_pattern: "isolamento", position_variant: "em_pe", is_unilateral: true },

  // Glúteos
  { id: "elevacao-pelvica-barra", name: "Elevação pélvica com barra (hip thrust)", muscle_group: "gluteo", metric_type: "musculacao", equipment: "barra", movement_pattern: "dobradica_quadril", position_variant: "deitado" },
  { id: "cadeira-abdutora", name: "Cadeira abdutora", muscle_group: "gluteo", metric_type: "musculacao", equipment: "maquina", movement_pattern: "isolamento", position_variant: "sentado" },
  { id: "gluteo-coice-cabo", name: "Glúteo no cabo (coice)", muscle_group: "gluteo", metric_type: "musculacao", equipment: "cabo_polia", movement_pattern: "isolamento", position_variant: "em_pe", is_unilateral: true },

  // Panturrilha
  { id: "panturrilha-em-pe-maquina", name: "Panturrilha em pé na máquina", muscle_group: "panturrilha", metric_type: "musculacao", equipment: "maquina", movement_pattern: "isolamento", position_variant: "em_pe" },
  { id: "panturrilha-sentado-maquina", name: "Panturrilha sentado na máquina", muscle_group: "panturrilha", metric_type: "musculacao", equipment: "maquina", movement_pattern: "isolamento", position_variant: "sentado" },
  { id: "panturrilha-leg-press", name: "Panturrilha no leg press", muscle_group: "panturrilha", metric_type: "musculacao", equipment: "maquina", movement_pattern: "isolamento", position_variant: "sentado" },
];
