"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { foodSchema, type FoodFormValues } from "@/lib/schemas/food";
import { FOOD_UNITS, FOOD_UNIT_LABELS } from "@/lib/nutrition/vocabulary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { FoodActionResult } from "@/lib/actions/foods";

export function FoodForm({
  defaultValues,
  onSubmit,
  onDelete,
  submitLabel,
}: {
  defaultValues?: Partial<FoodFormValues>;
  onSubmit: (values: FoodFormValues) => Promise<FoodActionResult>;
  onDelete?: () => Promise<void>;
  submitLabel: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FoodFormValues>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      name: "",
      brand: "",
      serving_quantity: undefined,
      serving_unit: undefined,
      grams_equivalent: undefined,
      calories: undefined,
      protein_g: undefined,
      carbs_g: undefined,
      fat_g: undefined,
      ...defaultValues,
    },
  });

  function submit(values: FoodFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await onSubmit(values);
      // Se chegou aqui com um objeto de erro, a Server Action NÃO
      // redirecionou (redirect() interrompe a execução lançando, então só
      // voltamos um valor quando há algo errado para mostrar).
      if (result && "error" in result) {
        setServerError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-5 pb-8">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome do alimento</Label>
        <Input id="name" autoComplete="off" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="brand">Marca (opcional)</Label>
        <Input id="brand" autoComplete="off" {...register("brand")} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
        <p className="text-sm font-medium text-muted-foreground">Porção de referência</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="serving_quantity">Quantidade</Label>
            <Input
              id="serving_quantity"
              type="number"
              inputMode="decimal"
              step="any"
              {...register("serving_quantity", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
            />
            {errors.serving_quantity && (
              <p className="text-sm text-destructive">{errors.serving_quantity.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="serving_unit">Unidade</Label>
            <Select id="serving_unit" defaultValue="" {...register("serving_unit")}>
              <option value="" disabled>
                Selecione
              </option>
              {FOOD_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {FOOD_UNIT_LABELS[unit]}
                </option>
              ))}
            </Select>
            {errors.serving_unit && (
              <p className="text-sm text-destructive">{errors.serving_unit.message}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grams_equivalent">Equivalente em gramas</Label>
          <Input
            id="grams_equivalent"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="Ex.: 1 fatia = 35g"
            {...register("grams_equivalent", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
          />
          {errors.grams_equivalent && (
            <p className="text-sm text-destructive">{errors.grams_equivalent.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
        <p className="text-sm font-medium text-muted-foreground">
          Macros por 1 porção de referência (não por 100g)
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calories">Calorias (kcal)</Label>
            <Input
              id="calories"
              type="number"
              inputMode="decimal"
              step="any"
              {...register("calories", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
            />
            {errors.calories && <p className="text-sm text-destructive">{errors.calories.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="protein_g">Proteína (g)</Label>
            <Input
              id="protein_g"
              type="number"
              inputMode="decimal"
              step="any"
              {...register("protein_g", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
            />
            {errors.protein_g && <p className="text-sm text-destructive">{errors.protein_g.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="carbs_g">Carboidratos (g)</Label>
            <Input
              id="carbs_g"
              type="number"
              inputMode="decimal"
              step="any"
              {...register("carbs_g", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
            />
            {errors.carbs_g && <p className="text-sm text-destructive">{errors.carbs_g.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fat_g">Gorduras (g)</Label>
            <Input
              id="fat_g"
              type="number"
              inputMode="decimal"
              step="any"
              {...register("fat_g", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}
            />
            {errors.fat_g && <p className="text-sm text-destructive">{errors.fat_g.message}</p>}
          </div>
        </div>
      </div>

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Salvando..." : submitLabel}
      </Button>

      {onDelete && (
        <Button
          type="button"
          variant="outline"
          disabled={isDeletePending}
          onClick={() => {
            if (
              confirm(
                "Excluir este alimento? Ele sai da biblioteca, mas receitas e o diário que já o usaram continuam intactos."
              )
            ) {
              startDeleteTransition(onDelete);
            }
          }}
        >
          {isDeletePending ? "Excluindo..." : "Excluir"}
        </Button>
      )}
    </form>
  );
}
