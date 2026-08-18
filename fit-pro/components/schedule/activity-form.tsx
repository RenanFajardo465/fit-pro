"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { activitySchema, type ActivityValues } from "@/lib/schemas/activity";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/lib/workout/vocabulary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createActivity, type ActivityActionResult } from "@/lib/actions/activities";

export function ActivityForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  // Estado local espelhando o campo "recurrence", em vez de watch() do
  // react-hook-form — watch() não é memoizável e o React Compiler avisa
  // sobre isso; um useState simples evita o aviso sem perder nada.
  const [recurrence, setRecurrence] = useState<"weekday" | "date">("weekday");
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ActivityValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: "",
      recurrence: "weekday",
      weekday: 1,
      date: null,
      time_of_day: null,
      duration_minutes: null,
      notes: null,
    },
  });

  function submit(values: ActivityValues) {
    setServerError(null);
    startTransition(async () => {
      const result: ActivityActionResult = await createActivity(values);
      if (result && "error" in result) {
        setServerError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" placeholder="Ex.: Futebol, Muay Thai" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Repetição</Label>
        <Controller
          control={control}
          name="recurrence"
          render={({ field }) => (
            <Select
              value={field.value}
              onChange={(e) => {
                const next = e.target.value as "weekday" | "date";
                field.onChange(next);
                setRecurrence(next);
              }}
            >
              <option value="weekday">Toda semana, num dia fixo</option>
              <option value="date">Só numa data específica</option>
            </Select>
          )}
        />
      </div>

      {recurrence === "weekday" ? (
        <div className="flex flex-col gap-1.5">
          <Label>Dia da semana</Label>
          <Controller
            control={control}
            name="weekday"
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onChange={(e) => field.onChange(Number(e.target.value))}
              >
                {WEEKDAYS.map((w) => (
                  <option key={w} value={w}>
                    {WEEKDAY_LABELS[w]}
                  </option>
                ))}
              </Select>
            )}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Data</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.weekday && <p className="text-sm text-destructive">{errors.weekday.message}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="time_of_day">Horário (opcional)</Label>
          <Input id="time_of_day" type="time" {...register("time_of_day")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="duration_minutes">Duração (min, opcional)</Label>
          <Input
            id="duration_minutes"
            type="number"
            inputMode="numeric"
            min={1}
            {...register("duration_minutes", {
              setValueAs: (v) => (v === "" ? null : Number(v)),
            })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea id="notes" {...register("notes")} />
      </div>

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Salvando..." : "Adicionar atividade"}
      </Button>
    </form>
  );
}
