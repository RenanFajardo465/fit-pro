/**
 * Lógica pura de agrupamento e "rodada corrente" da execução de treino
 * (Fase 3, Incremento 3). Extraída do componente de execução para poder ser
 * testada sem montar React — mesmo padrão de `resolveWorkoutForDate`
 * (lib/workout/recommendation.ts).
 *
 * Modelo: dentro de um bi-set/tri-set/superset, uma "rodada" agrupa a
 * série N de cada exercício do bloco (A1+B1 = rodada 1, A2+B2 = rodada 2...).
 * Para um exercício avulso, cada série é a sua própria rodada de 1 —
 * generaliza os dois casos com o mesmo código (Fase 0, seções 14-15).
 */

export type ClusterExercise = {
  id: string;
  order_index: number;
  group_id: string | null;
};

export type ClusterSet = {
  session_exercise_id: string;
  set_number: number;
  status: string;
};

/** Agrupa exercícios em blocos: sequências contíguas com o mesmo group_id. */
export function buildClusters<T extends ClusterExercise>(exercises: T[]): T[][] {
  const sorted = [...exercises].sort((a, b) => a.order_index - b.order_index);
  const clusters: T[][] = [];
  for (const item of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && item.group_id !== null && last[0].group_id === item.group_id) {
      last.push(item);
    } else {
      clusters.push([item]);
    }
  }
  return clusters;
}

/**
 * Chave do grupo de descanso (session_group_rest.group_key): group_id do
 * bloco, ou o session_exercise_id quando for avulso — mesmo mecanismo de
 * timer para os dois casos.
 */
export function getGroupKey(cluster: ClusterExercise[]): string {
  return cluster.length > 1 ? cluster[0].group_id! : cluster[0].id;
}

function roundNumbersOf(clusterExerciseIds: string[], sets: ClusterSet[]): number[] {
  const ids = new Set(clusterExerciseIds);
  const numbers = new Set<number>();
  for (const s of sets) {
    if (ids.has(s.session_exercise_id)) numbers.add(s.set_number);
  }
  return [...numbers].sort((a, b) => a - b);
}

function setsOfRound(clusterExerciseIds: string[], roundNumber: number, sets: ClusterSet[]): ClusterSet[] {
  const ids = new Set(clusterExerciseIds);
  return sets.filter((s) => ids.has(s.session_exercise_id) && s.set_number === roundNumber);
}

/** Primeira rodada do bloco que ainda tem alguma série pendente (ou null se o bloco está completo). */
export function getCurrentRound(clusterExerciseIds: string[], sets: ClusterSet[]): number | null {
  for (const r of roundNumbersOf(clusterExerciseIds, sets)) {
    if (setsOfRound(clusterExerciseIds, r, sets).some((s) => s.status === "pending")) return r;
  }
  return null;
}

/**
 * Última rodada já totalmente resolvida (completa ou pulada) em sequência a
 * partir da 1ª — é essa que acabou de disparar o descanso, e é o que a UI
 * usa pra saber qual cronômetro mostrar depois de uma rodada terminar.
 */
export function getJustFinishedRound(clusterExerciseIds: string[], sets: ClusterSet[]): number | null {
  let last: number | null = null;
  for (const r of roundNumbersOf(clusterExerciseIds, sets)) {
    const resolved = setsOfRound(clusterExerciseIds, r, sets).every((s) => s.status !== "pending");
    if (resolved) last = r;
    else break;
  }
  return last;
}

export function isRoundComplete(clusterExerciseIds: string[], roundNumber: number, sets: ClusterSet[]): boolean {
  const roundSets = setsOfRound(clusterExerciseIds, roundNumber, sets);
  return roundSets.length > 0 && roundSets.every((s) => s.status !== "pending");
}

export function isClusterComplete(clusterExerciseIds: string[], sets: ClusterSet[]): boolean {
  const ids = new Set(clusterExerciseIds);
  const clusterSets = sets.filter((s) => ids.has(s.session_exercise_id));
  return clusterSets.length > 0 && clusterSets.every((s) => s.status !== "pending");
}

/**
 * Chave do primeiro bloco (na ordem) que ainda não está completo — usado
 * pelo FAB "ir para exercício atual". Extraído como função pura (em vez de
 * um loop direto dentro do componente) porque o React Compiler não
 * conseguia preservar a memoização manual de um `useMemo` com um `for`
 * imperativo no corpo; uma chamada de função única resolve isso, mesmo
 * padrão de `buildClusters`.
 */
export function getActiveGroupKey<T extends ClusterExercise>(clusters: T[][], sets: ClusterSet[]): string | null {
  for (const cluster of clusters) {
    const ids = cluster.map((e) => e.id);
    if (!isClusterComplete(ids, sets)) return getGroupKey(cluster);
  }
  return null;
}

/**
 * Segundos restantes de um descanso a partir do estado persistido —
 * calculado sempre a partir de rest_ends_at (nunca decrementado
 * localmente), para não perder precisão se a aba ficar em segundo
 * plano/o celular bloquear no meio do descanso (Fase 0, seções 14-15).
 */
export function computeRemainingSeconds(
  restEndsAt: string | null,
  pausedRemainingSeconds: number | null
): number {
  if (restEndsAt) {
    return Math.max(0, Math.round((new Date(restEndsAt).getTime() - Date.now()) / 1000));
  }
  return Math.max(0, pausedRemainingSeconds ?? 0);
}
