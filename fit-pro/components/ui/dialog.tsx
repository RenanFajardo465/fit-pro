"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Modal simples, sem dependência externa (o projeto não usa Radix nem
 * nenhuma lib de UI — todos os componentes em `components/ui/` são
 * escritos à mão). Usado pela primeira vez na Etapa F (Fase 3) pra
 * confirmar o encerramento do treino, mas genérico o bastante pra
 * qualquer outra confirmação futura.
 */
export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  // Trava o scroll da página por trás enquanto o modal está aberto —
  // evita rolar o conteúdo escondido sem querer no mobile.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => onOpenChange(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex w-full max-w-md flex-col gap-4 rounded-t-2xl border border-border bg-background p-4 shadow-xl sm:rounded-2xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>;
}

export function DialogDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end", className)}>{children}</div>;
}
