"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { exerciseSchema, type ExerciseFormValues } from "@/lib/schemas/exercise";
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  METRIC_TYPES,
  METRIC_TYPE_LABELS,
} from "@/lib/workout/vocabulary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ExerciseActionResult } from "@/lib/actions/exercises";

export function ExerciseForm({
  defaultValues,
  onSubmit,
  onDelete,
  submitLabel,
}: {
  defaultValues?: Partial<ExerciseFormValues>;
  onSubmit: (values: ExerciseFormValues) => Promise<ExerciseActionResult>;
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
  } = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: "",
      muscle_group: undefined,
      category: "",
      metric_type: undefined,
      description: "",
      image_url: "",
      gif_url: "",
      video_url: "",
      external_url: "",
      notes: "",
      ...defaultValues,
    },
  });

  function submit(values: ExerciseFormValues) {
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
        <Label htmlFor="name">Nome do exercício</Label>
        <Input id="name" autoComplete="off" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="muscle_group">Grupo muscular</Label>
          <Select id="muscle_group" defaultValue="" {...register("muscle_group")}>
            <option value="" disabled>
              Selecione
            </option>
            {MUSCLE_GROUPS.map((mg) => (
              <option key={mg} value={mg}>
                {MUSCLE_GROUP_LABELS[mg]}
              </option>
            ))}
          </Select>
          {errors.muscle_group && (
            <p className="text-sm text-destructive">{errors.muscle_group.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="metric_type">Tipo</Label>
          <Select id="metric_type" defaultValue="" {...register("metric_type")}>
            <option value="" disabled>
              Selecione
            </option>
            {METRIC_TYPES.map((mt) => (
              <option key={mt} value={mt}>
                {METRIC_TYPE_LABELS[mt]}
              </option>
            ))}
          </Select>
          {errors.metric_type && (
            <p className="text-sm text-destructive">{errors.metric_type.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Categoria (opcional)</Label>
        <Input
          id="category"
          placeholder="Ex.: composto, isolado..."
          {...register("category")}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea id="description" {...register("description")} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
        <p className="text-sm font-medium text-muted-foreground">
          Mídia (opcional — URLs externas, sem upload nesta fase)
        </p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="image_url">URL da imagem</Label>
          <Input id="image_url" inputMode="url" {...register("image_url")} />
          {errors.image_url && (
            <p className="text-sm text-destructive">{errors.image_url.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gif_url">URL do GIF</Label>
          <Input id="gif_url" inputMode="url" {...register("gif_url")} />
          {errors.gif_url && (
            <p className="text-sm text-destructive">{errors.gif_url.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="video_url">URL do vídeo</Label>
          <Input id="video_url" inputMode="url" {...register("video_url")} />
          {errors.video_url && (
            <p className="text-sm text-destructive">{errors.video_url.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="external_url">Link externo</Label>
          <Input id="external_url" inputMode="url" {...register("external_url")} />
          {errors.external_url && (
            <p className="text-sm text-destructive">{errors.external_url.message}</p>
          )}
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
        {isPending ? "Salvando..." : submitLabel}
      </Button>

      {onDelete && (
        <Button
          type="button"
          variant="outline"
          disabled={isDeletePending}
          onClick={() => {
            if (confirm("Excluir este exercício? Ele sai da biblioteca, mas o histórico de treinos que já o usaram continua intacto.")) {
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
