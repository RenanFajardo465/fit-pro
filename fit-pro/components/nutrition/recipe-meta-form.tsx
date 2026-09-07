"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recipeMetaSchema, type RecipeMetaValues } from "@/lib/schemas/recipe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RecipeActionResult } from "@/lib/actions/recipes";

export function RecipeMetaForm({
  defaultValues,
  onSubmit,
  submitLabel,
  compact,
}: {
  defaultValues?: Partial<RecipeMetaValues>;
  onSubmit: (values: RecipeMetaValues) => Promise<RecipeActionResult>;
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
  } = useForm<RecipeMetaValues>({
    resolver: zodResolver(recipeMetaSchema),
    defaultValues: { name: "", ...defaultValues },
  });

  function submit(values: RecipeMetaValues) {
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
      <div className={compact ? "flex gap-2" : "flex flex-col gap-1.5"}>
        <div className="flex flex-1 flex-col gap-1.5">
          {!compact && <Label htmlFor="name">Nome da receita</Label>}
          <Input
            id="name"
            placeholder="Nome da receita"
            aria-label="Nome da receita"
            {...register("name")}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
