"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { setSequenceState } from "@/lib/actions/schedule";

export type ScheduleTemplate = { id: string; code: string; name: string };

const TEMPLATE_LABEL = (t: ScheduleTemplate) => `${t.code} — ${t.name}`;

export function ScheduleSettingsForm({
  templates,
  sequenceState,
}: {
  templates: ScheduleTemplate[];
  sequenceState: { last_completed_template_id: string | null; last_completed_at: string | null } | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lastId = sequenceState?.last_completed_template_id ?? null;
  const lastTemplate = templates.find((t) => t.id === lastId);

  function handleSet(id: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await setSequenceState(id);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <Label>Último treino concluído</Label>
        <p className="text-xs text-muted-foreground">
          Os treinos seguem uma fila contínua: ao finalizar um treino, o próximo da lista já fica
          sugerido automaticamente, não importa o dia. Ajuste manualmente aqui só se precisar
          corrigir a fila (ex.: pular um treino sem executá-lo).
        </p>
      </div>

      <p className="text-sm">
        {lastTemplate ? TEMPLATE_LABEL(lastTemplate) : "Nenhum — a fila começa do primeiro treino"}
      </p>

      {templates.length === 0 ? (
        <p className="text-xs text-muted-foreground">Cadastre templates em Treino primeiro.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={t.id === lastId ? "default" : "outline"}
              disabled={isPending}
              onClick={() => handleSet(t.id)}
            >
              {TEMPLATE_LABEL(t)}
            </Button>
          ))}
          {lastId && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handleSet(null)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Zerar fila
            </Button>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
