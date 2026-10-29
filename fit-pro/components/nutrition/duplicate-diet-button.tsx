"use client";

import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateDietTemplate } from "@/lib/actions/diet-templates";

/**
 * Botão de ícone — não usa `<form action={...}>` porque a action pode
 * devolver `{error}` sem redirecionar (código duplicado improvável, mas
 * possível), e `action` do form exige uma função que só devolve void.
 */
export function DuplicateDietButton({ dietId, dietName }: { dietId: string; dietName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await duplicateDietTemplate(dietId);
      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Duplicar ${dietName}`}
        onClick={handleClick}
        disabled={isPending}
      >
        <Copy className="h-4 w-4" />
      </Button>
      {error && <p className="max-w-[8rem] text-right text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
