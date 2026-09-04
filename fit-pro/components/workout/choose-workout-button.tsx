"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { startWorkoutSession } from "@/lib/actions/session";

export type ChooseWorkoutTemplate = { id: string; code: string; name: string };

/**
 * Escolha manual de qual treino fazer hoje, além do sugerido pela fila
 * sequencial (ex.: a fila sugere C, mas o usuário sabe que hoje precisa
 * ser E). Não existe conceito de "forçar" nada no banco — é só chamar
 * `startWorkoutSession` com outro template_id. A fila continua consistente
 * sozinha: `finish_workout_session` grava o template REALMENTE concluído
 * como referência, então a próxima sugestão já parte de E, não de C.
 */
export function ChooseWorkoutButton({
  templates,
  excludeId,
}: {
  templates: ChooseWorkoutTemplate[];
  excludeId: string | null;
}) {
  const options = templates.filter((t) => t.id !== excludeId);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(options[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (options.length === 0) return null;

  function handleStart() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await startWorkoutSession(selected);
      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        Treinar outro hoje
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
        {options.map((t) => (
          <option key={t.id} value={t.id}>
            {t.code} — {t.name}
          </option>
        ))}
      </Select>
      <Button type="button" variant="outline" onClick={handleStart} disabled={isPending}>
        <Play className="h-4 w-4" />
        {isPending ? "Iniciando..." : "Iniciar este treino"}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
