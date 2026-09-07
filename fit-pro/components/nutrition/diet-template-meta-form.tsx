"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dietTemplateMetaSchema, type DietTemplateMetaValues } from "@/lib/schemas/diet-template";
import { DIET_TYPES, DIET_TYPE_LABELS } from "@/lib/nutrition/vocabulary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { DietTemplateActionResult } from "@/lib/actions/diet-templates";

export function DietTemplateMetaForm({
  defaultValues,
  onSubmit,
  submitLabel,
  compact,
}: {
  defaultValues?: Partial<DietTemplateMetaValues>;
  onSubmit: (values: DietTemplateMetaValues) => Promise<DietTemplateActionResult>;
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
  } = useForm<DietTemplateMetaValues>({
    resolver: zodResolver(dietTemplateMetaSchema),
    defaultValues: { name: "", code: "", diet_type: undefined, ...defaultValues },
  });

  function submit(values: DietTemplateMetaValues) {
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
          {!compact && <Label htmlFor="name">Nome da dieta</Label>}
          <Input id="name" placeholder="Nome da dieta" aria-label="Nome da dieta" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className={compact ? "flex w-28 flex-col gap-1.5" : "flex flex-col gap-1.5"}>
          {!compact && <Label htmlFor="code">Código</Label>}
          <Input id="code" placeholder="TREINO_A" aria-label="Código" {...register("code")} />
          {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {!compact && <Label htmlFor="diet_type">Tipo de dieta</Label>}
        <Select id="diet_type" defaultValue="" aria-label="Tipo de dieta" {...register("diet_type")}>
          <option value="" disabled>
            Selecione
          </option>
          {DIET_TYPES.map((dt) => (
            <option key={dt} value={dt}>
              {DIET_TYPE_LABELS[dt]}
            </option>
          ))}
        </Select>
        {errors.diet_type && <p className="text-sm text-destructive">{errors.diet_type.message}</p>}
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
