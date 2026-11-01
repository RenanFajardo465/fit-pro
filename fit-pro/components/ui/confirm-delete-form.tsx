"use client";

import type { ReactNode } from "react";

/**
 * Fase 7 (refinamento): wrapper fino em volta de `<form action={...}>` pra
 * exclusões/soft-deletes que antes disparavam direto num único tap sem
 * confirmação (dieta, receita, template de treino). `onSubmit` intercepta
 * ANTES do form chamar a Server Action — se o usuário cancelar o
 * `confirm()`, `preventDefault()` impede a submissão e a action nunca roda.
 */
export function ConfirmDeleteForm({
  action,
  confirmMessage,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className={className}
    >
      {children}
    </form>
  );
}
