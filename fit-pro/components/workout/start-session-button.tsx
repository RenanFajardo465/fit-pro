"use client";

import { useState, useTransition } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startWorkoutSession } from "@/lib/actions/session";

export function StartSessionButton({ templateId }: { templateId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startWorkoutSession(templateId);
      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" size="lg" className="w-full" onClick={handleClick} disabled={isPending}>
        <Play className="h-4 w-4" />
        {isPending ? "Iniciando..." : "Iniciar treino"}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
