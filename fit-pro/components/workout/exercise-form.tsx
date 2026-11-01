"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2 } from "lucide-react";
import { exerciseSchema, type ExerciseFormValues } from "@/lib/schemas/exercise";
import {
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  METRIC_TYPES,
  METRIC_TYPE_LABELS,
  EQUIPMENT_TYPES,
  EQUIPMENT_TYPE_LABELS,
  MOVEMENT_PATTERNS,
  MOVEMENT_PATTERN_LABELS,
  GRIP_TYPES,
  GRIP_TYPE_LABELS,
  POSITION_VARIANTS,
  POSITION_VARIANT_LABELS,
} from "@/lib/workout/vocabulary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  findSimilarExercises,
  type ExerciseActionResult,
  type ExerciseDuplicateCandidate,
} from "@/lib/actions/exercises";

export function ExerciseForm({
  defaultValues,
  onSubmit,
  onDelete,
  submitLabel,
  excludeExerciseId,
}: {
  defaultValues?: Partial<ExerciseFormValues>;
  onSubmit: (values: ExerciseFormValues) => Promise<ExerciseActionResult>;
  onDelete?: () => Promise<void>;
  submitLabel: string;
  /** Edição: não sugerir o próprio exercício como "parecido com ele mesmo". */
  excludeExerciseId?: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: "",
      muscle_group: undefined,
      secondary_muscle_groups: [],
      category: "",
      metric_type: undefined,
      equipment: "",
      movement_pattern: "",
      grip_type: "",
      position_variant: "",
      is_unilateral: undefined,
      description: "",
      image_url: "",
      gif_url: "",
      video_url: "",
      external_url: "",
      notes: "",
      aliases: [],
      ...defaultValues,
    },
  });

  // Catálogo Inteligente, seção 5: ao digitar o nome, sugere (sem nunca
  // fundir sozinho) exercícios parecidos já cadastrados — nome exato,
  // sinônimo existente ou similaridade por trigrama, tudo resolvido pela
  // mesma RPC/consulta no servidor.
  const nameValue = watch("name");
  const [duplicates, setDuplicates] = useState<ExerciseDuplicateCandidate[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = nameValue?.trim() ?? "";
    if (trimmed.length < 3) {
      setDuplicates([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsCheckingDuplicates(true);
      const results = await findSimilarExercises(trimmed);
      setDuplicates(results.filter((r) => r.id !== excludeExerciseId));
      setIsCheckingDuplicates(false);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nameValue, excludeExerciseId]);

  // Sinônimos: lista de chips em vez de um <input> ligado direto ao
  // react-hook-form (mais fácil de adicionar/remover um de cada vez).
  const [aliasInput, setAliasInput] = useState("");
  const aliases = watch("aliases") ?? [];

  function addAlias() {
    const trimmed = aliasInput.trim();
    if (!trimmed) return;
    if (aliases.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      setAliasInput("");
      return;
    }
    setValue("aliases", [...aliases, trimmed]);
    setAliasInput("");
  }

  function removeAlias(alias: string) {
    setValue(
      "aliases",
      aliases.filter((a) => a !== alias)
    );
  }

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

      {isCheckingDuplicates && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Procurando exercícios parecidos...
        </p>
      )}

      {!isCheckingDuplicates && duplicates.length > 0 && (
        <Card className="flex flex-col gap-2 border-amber-500/40 bg-amber-500/5">
          <p className="text-sm font-medium">
            Já existe{duplicates.length > 1 ? "m" : ""} exercício{duplicates.length > 1 ? "s" : ""} parecido
            {duplicates.length > 1 ? "s" : ""} na sua biblioteca
          </p>
          <p className="text-xs text-muted-foreground">
            Se for exatamente o mesmo movimento/equipamento, use o existente em vez de criar um novo (ou
            cadastre este nome como sinônimo dele, no campo abaixo). Se for uma variação real (outro
            equipamento, pegada, inclinação...), pode seguir e cadastrar normalmente.
          </p>
          <ul className="flex flex-col gap-1">
            {duplicates.map((d) => (
              <li key={d.id} className="text-xs">
                <span className="font-medium">{d.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {MUSCLE_GROUP_LABELS[d.muscle_group as keyof typeof MUSCLE_GROUP_LABELS] ?? d.muscle_group}
                  {d.equipment ? ` · ${EQUIPMENT_TYPE_LABELS[d.equipment as keyof typeof EQUIPMENT_TYPE_LABELS] ?? d.equipment}` : ""}
                  {" · "}
                  {Math.round(d.similarity * 100)}% parecido
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
        <Label>Grupos musculares secundários (opcional)</Label>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((mg) => (
            <label
              key={mg}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/10"
            >
              <input type="checkbox" value={mg} className="h-3.5 w-3.5" {...register("secondary_muscle_groups")} />
              {MUSCLE_GROUP_LABELS[mg]}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
        <p className="text-sm font-medium text-muted-foreground">
          Diferenciadores (opcional — ajudam a não confundir variações reais)
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="equipment">Equipamento</Label>
            <Select id="equipment" defaultValue="" {...register("equipment")}>
              <option value="">Não informar</option>
              {EQUIPMENT_TYPES.map((eq) => (
                <option key={eq} value={eq}>
                  {EQUIPMENT_TYPE_LABELS[eq]}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="movement_pattern">Padrão de movimento</Label>
            <Select id="movement_pattern" defaultValue="" {...register("movement_pattern")}>
              <option value="">Não informar</option>
              {MOVEMENT_PATTERNS.map((mp) => (
                <option key={mp} value={mp}>
                  {MOVEMENT_PATTERN_LABELS[mp]}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="grip_type">Pegada</Label>
            <Select id="grip_type" defaultValue="" {...register("grip_type")}>
              <option value="">Não informar</option>
              {GRIP_TYPES.map((gt) => (
                <option key={gt} value={gt}>
                  {GRIP_TYPE_LABELS[gt]}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="position_variant">Posição/inclinação</Label>
            <Select id="position_variant" defaultValue="" {...register("position_variant")}>
              <option value="">Não informar</option>
              {POSITION_VARIANTS.map((pv) => (
                <option key={pv} value={pv}>
                  {POSITION_VARIANT_LABELS[pv]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="is_unilateral">Execução</Label>
          <Select
            id="is_unilateral"
            defaultValue=""
            {...register("is_unilateral", {
              setValueAs: (v) => (v === "" ? undefined : v === "true"),
            })}
          >
            <option value="">Não informar</option>
            <option value="false">Bilateral (os dois lados juntos)</option>
            <option value="true">Unilateral (um lado de cada vez)</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="alias-input">Sinônimos (opcional)</Label>
        <p className="text-xs text-muted-foreground">
          Outros nomes pelos quais você também conhece esse exercício — a busca encontra por qualquer um
          deles.
        </p>
        <div className="flex gap-2">
          <Input
            id="alias-input"
            value={aliasInput}
            onChange={(e) => setAliasInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAlias();
              }
            }}
            placeholder="Ex.: Barbell curl"
          />
          <Button type="button" variant="outline" onClick={addAlias}>
            Adicionar
          </Button>
        </div>
        {aliases.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {aliases.map((alias) => (
              <span
                key={alias}
                className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs"
              >
                {alias}
                <button
                  type="button"
                  onClick={() => removeAlias(alias)}
                  aria-label={`Remover sinônimo ${alias}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
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
        <Label htmlFor="description">Descrição / instruções de execução (opcional)</Label>
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
