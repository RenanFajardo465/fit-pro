"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from "@/lib/workout/vocabulary";

export type PickableExercise = {
  id: string;
  name: string;
  muscle_group: string;
  metric_type: string;
};

/**
 * Overlay simples de tela cheia para escolher um exercício da biblioteca já
 * carregada (sem round-trip de rede — biblioteca pessoal de 2 usuários é
 * pequena, filtra tudo no cliente).
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (MUSCLE_GROUP_LABELS[e.muscle_group as MuscleGroup] ?? e.muscle_group)
          .toLowerCase()
          .includes(q)
    );
  }, [exercises, query]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar exercício..."
            className="pl-10"
          />
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {exercises.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sua biblioteca está vazia. Cadastre exercícios em Treino → Biblioteca antes de montar um
            template.
          </p>
        )}

        {exercises.length > 0 && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum exercício encontrado.</p>
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
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
