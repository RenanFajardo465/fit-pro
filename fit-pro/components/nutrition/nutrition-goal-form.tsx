"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileGoalsSchema, type ProfileGoalsFormValues } from "@/lib/schemas/profile-goals";
import { updateNutritionGoals } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NutritionGoalForm({
  defaultValues,
}: {
  defaultValues: ProfileGoalsFormValues;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileGoalsFormValues>({
    resolver: zodResolver(profileGoalsSchema),
    defaultValues,
  });

  function submit(values: ProfileGoalsFormValues) {
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateNutritionGoals(values);
      if (result && "error" in result) {
        setServerError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <Card>
      <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium">Meta diária</p>
          <p className="text-xs text-muted-foreground">
            Usada no resumo do Hoje e do diário do dia, comparando com o que você já consumiu.
            Deixe em branco pra não ter meta.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="daily_calorie_goal">Calorias (kcal)</Label>
            <Input
              id="daily_calorie_goal"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="Ex.: 2400"
              {...register("daily_calorie_goal", {
                setValueAs: (v) => (v === "" ? null : Number(v)),
              })}
            />
            {errors.daily_calorie_goal && (
              <p className="text-sm text-destructive">{errors.daily_calorie_goal.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="daily_protein_goal_g">Proteína (g)</Label>
            <Input
              id="daily_protein_goal_g"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="Ex.: 160"
              {...register("daily_protein_goal_g", {
                setValueAs: (v) => (v === "" ? null : Number(v)),
              })}
            />
            {errors.daily_protein_goal_g && (
              <p className="text-sm text-destructive">{errors.daily_protein_goal_g.message}</p>
            )}
          </div>
        </div>

        {serverError && (
          <p className="text-sm text-destructive" role="alert">
            {serverError}
          </p>
        )}
        {saved && !serverError && <p className="text-sm text-muted-foreground">Meta salva.</p>}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar meta"}
        </Button>
      </form>
    </Card>
  );
}

