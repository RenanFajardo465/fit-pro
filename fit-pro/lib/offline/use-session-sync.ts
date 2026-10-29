"use client";

import { useEffect } from "react";
import { completeSet, uncompleteSet, type SetActionResult } from "@/lib/actions/session-sets";
import { useSessionSyncStore, type QueuedMutation } from "@/lib/offline/session-sync-store";

type CompleteSetInput = Parameters<typeof completeSet>[0];
type UncompleteSetInput = Parameters<typeof uncompleteSet>[0];

/** Fetch falhando por falta de rede lança TypeError (ou RSC/Next relança algo que menciona "fetch"/"network"). */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /fetch|network|offline/i.test(message);
}

function newMutationId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Monta a fila offline (hidrata do IndexedDB, escuta online/offline, e
 * tenta de novo periodicamente — cobre wifi instável que nunca dispara o
 * evento "offline" do navegador) e devolve versões resilientes de
 * completeSet/uncompleteSet: se a chamada falhar por falta de rede, a
 * mutação é enfileirada em vez de perdida, e a UI trata como sucesso
 * (afinal, do ponto de vista do usuário, a série FOI registrada — só a
 * sincronização com o servidor que está pendente).
 */
export function useSessionSync() {
  const hydrate = useSessionSyncStore((s) => s.hydrate);
  const setOnline = useSessionSyncStore((s) => s.setOnline);
  const flush = useSessionSyncStore((s) => s.flush);
  const enqueue = useSessionSyncStore((s) => s.enqueue);
  const queueLength = useSessionSyncStore((s) => s.queue.length);
  const isSyncing = useSessionSyncStore((s) => s.isSyncing);
  const isOnline = useSessionSyncStore((s) => s.isOnline);

  useEffect(() => {
    void hydrate();
    function onOnline() {
      setOnline(true);
    }
    function onOffline() {
      setOnline(false);
    }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const interval = setInterval(() => {
      if (navigator.onLine) void flush();
    }, 15000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, [hydrate, setOnline, flush]);

  async function safeCompleteSet(input: CompleteSetInput): Promise<SetActionResult> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueue({ id: newMutationId(), kind: "complete", input, queuedAt: Date.now() } satisfies QueuedMutation);
      return { ok: true };
    }
    try {
      return await completeSet(input);
    } catch (error) {
      if (isNetworkError(error)) {
        await enqueue({ id: newMutationId(), kind: "complete", input, queuedAt: Date.now() } satisfies QueuedMutation);
        return { ok: true };
      }
      throw error;
    }
  }

  async function safeUncompleteSet(input: UncompleteSetInput): Promise<SetActionResult> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueue({ id: newMutationId(), kind: "uncomplete", input, queuedAt: Date.now() } satisfies QueuedMutation);
      return { ok: true };
    }
    try {
      return await uncompleteSet(input);
    } catch (error) {
      if (isNetworkError(error)) {
        await enqueue({ id: newMutationId(), kind: "uncomplete", input, queuedAt: Date.now() } satisfies QueuedMutation);
        return { ok: true };
      }
      throw error;
    }
  }

  return { queueLength, isSyncing, isOnline, safeCompleteSet, safeUncompleteSet };
}
