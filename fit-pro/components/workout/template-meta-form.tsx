"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { templateMetaSchema, type TemplateMetaValues } from "@/lib/schemas/template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TemplateActionResult } from "@/lib/actions/templates";

export function TemplateMetaForm({
  defaultValues,
  onSubmit,
  submitLabel,
  compact,
}: {
  defaultValues?: Partial<TemplateMetaValues>;
  onSubmit: (values: TemplateMetaValues) => Promise<TemplateActionResult>;
  submitLabel: string;
  compact?: boolean;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TemplateMetaValues>({
    resolver: zodResolver(templateMetaSchema),
    defaultValues: { name: "", code: "", ...defaultValues },
  });

  function submit(values: TemplateMetaValues) {
    setServerError(null);
    setSavedTick(false);
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result && "error" in result) {
        setServerError(result.error);
      } else if (compact) {
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 2000);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-3">
      <div className={compact ? "flex gap-2" : "flex flex-col gap-4"}>
        <div className="flex flex-1 flex-col gap-1.5">
          {!compact && <Label htmlFor="name">Nome do treino</Label>}
          <Input
            id="name"
            placeholder="Nome do treino"
            aria-label="Nome do treino"
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className={compact ? "flex w-24 flex-col gap-1.5" : "flex flex-col gap-1.5"}>
          {!compact && <Label htmlFor="code">Código</Label>}
          <Input id="code" placeholder="A" aria-label="Código" {...register("code")} />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>
      </div>

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" size={compact ? "sm" : "lg"} disabled={isPending}>
        {isPending ? "Salvando..." : savedTick ? "✓ Salvo" : submitLabel}
      </Button>
    </form>
  );
}
