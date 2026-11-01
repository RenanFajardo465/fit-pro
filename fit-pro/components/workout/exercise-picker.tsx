"use client";

import { useMemo, useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_TYPE_LABELS,
  type MuscleGroup,
  type EquipmentType,
} from "@/lib/workout/vocabulary";
import { normalizeExerciseName } from "@/lib/workout/exercise-normalize";

export type PickableExercise = {
  id: string;
  name: string;
  muscle_group: string;
  metric_type: string;
  equipment?: string | null;
  exercise_aliases?: { alias: string }[] | null;
};

/**
 * Overlay simples de tela cheia para escolher um exercício da biblioteca já
 * carregada (sem round-trip de rede — biblioteca pessoal de 2 usuários é
 * pequena, filtra tudo no cliente). Catálogo Inteligente, seção 4: busca
 * por nome oficial OU sinônimo (acento/maiúscula/espaço não importam) +
 * filtros por grupo muscular e equipamento.
 */
export function ExercisePicker({
  exercises,
  onPick,
  onClose,
}: {
  exercises: PickableExercise[];
  onPick: (exercise: PickableExercise) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string>("");
  const [equipmentFilter, setEquipmentFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const muscleGroupsInLibrary = useMemo(
    () => Array.from(new Set(exercises.map((e) => e.muscle_group))).sort(),
    [exercises]
  );
  const equipmentInLibrary = useMemo(
    () =>
      Array.from(new Set(exercises.map((e) => e.equipment).filter((e): e is string => !!e))).sort(),
    [exercises]
  );

  const filtered = useMemo(() => {
    const q = normalizeExerciseName(query);
    return exercises.filter((e) => {
      if (muscleFilter && e.muscle_group !== muscleFilter) return false;
      if (equipmentFilter && e.equipment !== equipmentFilter) return false;
      if (!q) return true;
      const nameMatches = normalizeExerciseName(e.name).includes(q);
      const aliasMatches = (e.exercise_aliases ?? []).some((a) => normalizeExerciseName(a.alias).includes(q));
      const muscleLabelMatches = (MUSCLE_GROUP_LABELS[e.muscle_group as MuscleGroup] ?? e.muscle_group)
        .toLowerCase()
        .includes(query.toLowerCase());
      return nameMatches || aliasMatches || muscleLabelMatches;
    });
  }, [exercises, query, muscleFilter, equipmentFilter]);

  const hasActiveFilters = muscleFilter !== "" || equipmentFilter !== "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex flex-col gap-2 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome ou sinônimo..."
              className="pl-10"
            />
          </div>
          <Button
            type="button"
            variant={hasActiveFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters((v) => !v)}
            aria-label="Filtros"
          >
            <Filter className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setMuscleFilter("")}
                className={`rounded-full border px-3 py-1 text-xs ${muscleFilter === "" ? "border-primary bg-primary/10" : "border-border"}`}
              >
                Todos os grupos
              </button>
              {muscleGroupsInLibrary.map((mg) => (
                <button
                  key={mg}
                  type="button"
                  onClick={() => setMuscleFilter(mg)}
                  className={`rounded-full border px-3 py-1 text-xs ${muscleFilter === mg ? "border-primary bg-primary/10" : "border-border"}`}
                >
                  {MUSCLE_GROUP_LABELS[mg as MuscleGroup] ?? mg}
                </button>
              ))}
            </div>
            {equipmentInLibrary.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setEquipmentFilter("")}
                  className={`rounded-full border px-3 py-1 text-xs ${equipmentFilter === "" ? "border-primary bg-primary/10" : "border-border"}`}
                >
                  Todo equipamento
                </button>
                {equipmentInLibrary.map((eq) => (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => setEquipmentFilter(eq)}
                    className={`rounded-full border px-3 py-1 text-xs ${equipmentFilter === eq ? "border-primary bg-primary/10" : "border-border"}`}
                  >
                    {EQUIPMENT_TYPE_LABELS[eq as EquipmentType] ?? eq}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {exercises.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sua biblioteca está vazia. Cadastre exercícios em Treino → Biblioteca antes de montar um
            template.
          </p>
        )}

        {exercises.length > 0 && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum exercício encontrado{query ? ` para "${query}"` : ""}. Tente outro termo, limpe os
            filtros, ou cadastre esse exercício na Biblioteca.
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {filtered.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => onPick(exercise)}
                className="flex w-full flex-col items-start gap-0.5 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50"
              >
                <span className="font-medium">{exercise.name}</span>
                <span className="text-xs text-muted-foreground">
                  {MUSCLE_GROUP_LABELS[exercise.muscle_group as MuscleGroup] ?? exercise.muscle_group}
                  {exercise.equipment
                    ? ` · ${EQUIPMENT_TYPE_LABELS[exercise.equipment as EquipmentType] ?? exercise.equipment}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
