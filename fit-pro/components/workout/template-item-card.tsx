"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, Trash2, Link2, Link2Off } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MUSCLE_GROUP_LABELS,
  TECHNIQUES,
  TECHNIQUE_LABELS,
  metricUsesReps,
  metricUsesLoad,
  metricUsesDuration,
  metricUsesDistance,
  type MuscleGroup,
} from "@/lib/workout/vocabulary";
import type { EditorItem } from "@/components/workout/template-editor";

function numOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function TemplateItemCard({
  item,
  compact,
  canGroupWithNext,
  onUpdate,
  onRemove,
  onToggleOpen,
  onGroupWithNext,
  onRemoveFromGroup,
}: {
  item: EditorItem;
  compact: boolean;
  canGroupWithNext: boolean;
  onUpdate: (patch: Partial<EditorItem>) => void;
  onRemove: () => void;
  onToggleOpen: () => void;
  onGroupWithNext?: () => void;
  onRemoveFromGroup?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.clientId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const summary = [
    `${item.sets}× ${item.reps_min ?? "?"}–${item.reps_max ?? "?"}`,
    item.initial_load_kg ? `${item.initial_load_kg} kg` : null,
    item.duration_target_seconds ? `${item.duration_target_seconds}s` : null,
    item.distance_target_meters ? `${item.distance_target_meters}m` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl border border-border bg-card",
        compact && "border-none bg-transparent",
        isDragging && "opacity-60"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleOpen}
          className="flex flex-1 flex-col items-start gap-0.5 text-left"
        >
          <span className="font-medium">{item.exercise_name}</span>
          <span className="text-xs text-muted-foreground">
            {MUSCLE_GROUP_LABELS[item.muscle_group as MuscleGroup] ?? item.muscle_group}
            {summary ? ` · ${summary}` : ""}
          </span>
        </button>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            item.isOpen && "rotate-180"
          )}
        />
      </div>

      {item.isOpen && (
        <div className="flex flex-col gap-3 border-t border-border px-3 pb-4 pt-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Séries</label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={item.sets}
                onChange={(e) => onUpdate({ sets: numOrNull(e.target.value) ?? 1 })}
              />
            </div>

            {metricUsesReps(item.metric_type) && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Reps mín.</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={item.reps_min ?? ""}
                    onChange={(e) => onUpdate({ reps_min: numOrNull(e.target.value) })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Reps máx.</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={item.reps_max ?? ""}
                    onChange={(e) => onUpdate({ reps_max: numOrNull(e.target.value) })}
                  />
                </div>
              </>
            )}

            {metricUsesDuration(item.metric_type) && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Duração (s)</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={item.duration_target_seconds ?? ""}
                  onChange={(e) => onUpdate({ duration_target_seconds: numOrNull(e.target.value) })}
                />
              </div>
            )}

            {metricUsesDistance(item.metric_type) && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Distância (m)</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={item.distance_target_meters ?? ""}
                  onChange={(e) => onUpdate({ distance_target_meters: numOrNull(e.target.value) })}
                />
              </div>
            )}

            {metricUsesLoad(item.metric_type) && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Carga inicial (kg)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  value={item.initial_load_kg ?? ""}
                  onChange={(e) => onUpdate({ initial_load_kg: numOrNull(e.target.value) })}
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Descanso (s)</label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={item.rest_seconds}
                onChange={(e) => onUpdate({ rest_seconds: numOrNull(e.target.value) ?? 0 })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Técnica</label>
            <Select
              value={item.technique ?? "normal"}
              onChange={(e) => onUpdate({ technique: e.target.value })}
            >
              {TECHNIQUES.map((t) => (
                <option key={t} value={t}>
                  {TECHNIQUE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Observações</label>
            <Input
              value={item.notes ?? ""}
              onChange={(e) => onUpdate({ notes: e.target.value || null })}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {onGroupWithNext && canGroupWithNext && (
              <Button type="button" variant="outline" size="sm" onClick={onGroupWithNext}>
                <Link2 className="h-3.5 w-3.5" />
                Unir com o próximo
              </Button>
            )}
            {onRemoveFromGroup && (
              <Button type="button" variant="outline" size="sm" onClick={onRemoveFromGroup}>
                <Link2Off className="h-3.5 w-3.5" />
                Remover do agrupamento
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" />
              Remover exercício
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
