import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { completeSet, uncompleteSet, type SetActionResult } from "@/lib/actions/session-sets";

/**
 * Resiliência offline da execução de treino (Fase 0, seção 11): uma fila de
 * mutações de `session_sets` pendentes, persistida em IndexedDB
 * (idb-keyval) e orquestrada por um store Zustand — as duas dependências já
 * estavam no package.json desde a Fase 3 original, previstas pra isso, mas
 * nunca chegaram a ser usadas até este incremento.
 *
 * Mantida fora de `session-sets.ts`: o módulo de actions é "use server" e
 * roda no servidor; este aqui é puramente client-side (store + IndexedDB).
 */

const STORAGE_KEY = "fitpro-offline-set-queue-v1";

type CompleteSetInput = Parameters<typeof completeSet>[0];
type UncompleteSetInput = Parameters<typeof uncompleteSet>[0];

export type QueuedMutation =
  | { id: string; kind: "complete"; input: CompleteSetInput; queuedAt: number }
  | { id: string; kind: "uncomplete"; input: UncompleteSetInput; queuedAt: number };

type SessionSyncState = {
  queue: QueuedMutation[];
  isOnline: boolean;
  isSyncing: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  enqueue: (mutation: QueuedMutation) => Promise<void>;
  setOnline: (online: boolean) => void;
  flush: () => Promise<void>;
};

async function persist(queue: QueuedMutation[]) {
  try {
    await idbSet(STORAGE_KEY, queue);
  } catch {
    // IndexedDB indisponível (aba anônima, navegador antigo) — a fila
    // continua funcionando só em memória nesta aba; não é crítico, só
    // deixa de sobreviver a um reload de página.
  }
}

export const useSessionSyncStore = create<SessionSyncState>((set, get) => ({
  queue: [],
  isOnline: true,
  isSyncing: false,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    let stored: QueuedMutation[] = [];
    try {
      stored = (await idbGet<QueuedMutation[]>(STORAGE_KEY)) ?? [];
    } catch {
      stored = [];
    }
    const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
    set({ queue: stored, hydrated: true, isOnline });
    if (stored.length > 0 && isOnline) void get().flush();
  },

  enqueue: async (mutation) => {
    const next = [...get().queue, mutation];
    set({ queue: next });
    await persist(next);
  },

  setOnline: (online) => {
    set({ isOnline: online });
    if (online) void get().flush();
  },

  /**
   * Processa a fila EM ORDEM, uma mutação por vez — importante porque
   * `completeSet` também atualiza `general_load_kg` do exercício: processar
   * fora de ordem faria a carga geral refletir uma série antiga, não a
   * última de fato registrada. Para na primeira falha de REDE (mantém a
   * fila intacta pro próximo retry); descarta só a mutação que o servidor
   * rejeitou de propósito (erro de validação/permissão, não vale repetir
   * pra sempre), preservando as demais.
   */
  flush: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    try {
      while (get().queue.length > 0 && get().isOnline) {
        const [first, ...rest] = get().queue;
        let result: SetActionResult;
        try {
          result = first.kind === "complete" ? await completeSet(first.input) : await uncompleteSet(first.input);
        } catch {
          break;
        }
        if (result && "error" in result) {
          set({ queue: rest });
          await persist(rest);
          continue;
        }
        set({ queue: rest });
        await persist(rest);
      }
    } finally {
      set({ isSyncing: false });
    }
  },
}));
