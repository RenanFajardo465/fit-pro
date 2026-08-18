"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExercisePicker, type PickableExercise } from "@/components/workout/exercise-picker";
import { TemplateItemCard } from "@/components/workout/template-item-card";
import { groupTypeForSize, GROUP_TYPE_LABELS } from "@/lib/workout/vocabulary";
import { saveTemplateItems } from "@/lib/actions/templates";
import type { TemplateItemValues } from "@/lib/schemas/template";

export type EditorItem = {
  clientId: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  metric_type: string;
  group_key: string | null;
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  duration_target_seconds: number | null;
  distance_target_meters: number | null;
  initial_load_kg: number | null;
  rest_seconds: number;
  technique: string | null;
  notes: string | null;
  isOpen: boolean;
};

function newClientId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`;
}

/** Blocos = sequências contíguas de itens com o mesmo group_key não-nulo. */
function computeClusters(items: EditorItem[]): EditorItem[][] {
  const clusters: EditorItem[][] = [];
  for (const item of items) {
    const last = clusters[clusters.length - 1];
    if (last && item.group_key !== null && last[0].group_key === item.group_key) {
      last.push(item);
    } else {
      clusters.push([item]);
    }
  }
  return clusters;
}

/**
 * Limpa group_key de qualquer bloco que, após uma edição, sobrou com 1 item
 * só, e separa em uma chave nova qualquer par de blocos não-contíguos que
 * arraste-e-solte tenha deixado com a mesma group_key por coincidência (ex.:
 * um superset de 4 dividido em dois blocos de 2 em posições diferentes da
 * lista) — cada bloco visual precisa de uma chave única.
 */
function normalizeGroups(items: EditorItem[]): EditorItem[] {
  const clusters = computeClusters(items);
  const seenKeys = new Set<string>();
  const result: EditorItem[] = [];

  for (const cluster of clusters) {
    if (cluster.length === 1) {
      result.push({ ...cluster[0], group_key: null });
      continue;
    }

    const key = cluster[0].group_key!;
    if (seenKeys.has(key)) {
      const freshKey = `group-${newClientId()}`;
      result.push(...cluster.map((item) => ({ ...item, group_key: freshKey })));
      seenKeys.add(freshKey);
    } else {
      seenKeys.add(key);
      result.push(...cluster);
    }
  }

  return result;
}

export function TemplateEditor({
  templateId,
  initialItems,
  availableExercises,
}: {
  templateId: string;
  initialItems: EditorItem[];
  availableExercises: PickableExercise[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<EditorItem[]>(initialItems);
  const [isDirty, setIsDirty] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function mutate(fn: (prev: EditorItem[]) => EditorItem[]) {
    setItems((prev) => normalizeGroups(fn(prev)));
    setIsDirty(true);
  }

  function addExercise(exercise: PickableExercise) {
    mutate((prev) => [
      ...prev,
      {
        clientId: newClientId(),
        exercise_id: exercise.id,
        exercise_name: exercise.name,
        muscle_group: exercise.muscle_group,
        metric_type: exercise.metric_type,
        group_key: null,
        sets: 3,
        reps_min: null,
        reps_max: null,
        duration_target_seconds: null,
        distance_target_meters: null,
        initial_load_kg: null,
        rest_seconds: 60,
        technique: "normal",
        notes: null,
        isOpen: true,
      },
    ]);
    setShowPicker(false);
  }

  function removeItem(clientId: string) {
    mutate((prev) => prev.filter((i) => i.clientId !== clientId));
  }

  function updateItem(clientId: string, patch: Partial<EditorItem>) {
    mutate((prev) => prev.map((i) => (i.clientId === clientId ? { ...i, ...patch } : i)));
  }

  function toggleOpen(clientId: string) {
    setItems((prev) =>
      prev.map((i) => (i.clientId === clientId ? { ...i, isOpen: !i.isOpen } : i))
    );
  }

  function groupWithNext(clientId: string) {
    mutate((prev) => {
      const index = prev.findIndex((i) => i.clientId === clientId);
      if (index === -1 || index === prev.length - 1) return prev;
      const next = prev[index + 1];
      if (next.group_key !== null) return prev; // já pertence a outro bloco
      const key = prev[index].group_key ?? `group-${newClientId()}`;
      return prev.map((i, idx) =>
        idx === index || idx === index + 1 ? { ...i, group_key: key } : i
      );
    });
  }

  function removeFromGroup(clientId: string) {
    mutate((prev) =>
      prev.map((i) => (i.clientId === clientId ? { ...i, group_key: null } : i))
    );
  }

  function dissolveCluster(cluster: EditorItem[]) {
    const ids = new Set(cluster.map((i) => i.clientId));
    mutate((prev) => prev.map((i) => (ids.has(i.clientId) ? { ...i, group_key: null } : i)));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    mutate((prev) => {
      const oldIndex = prev.findIndex((i) => i.clientId === active.id);
      const newIndex = prev.findIndex((i) => i.clientId === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleSave() {
    setError(null);
    const clusters = computeClusters(items);
    const payload: TemplateItemValues[] = [];
    let orderIndex = 0;

    for (const cluster of clusters) {
      const groupType = groupTypeForSize(cluster.length);
      const groupId = cluster.length > 1 ? cluster[0].group_key : null;
      cluster.forEach((item, i) => {
        payload.push({
          order_index: orderIndex,
          group_type: groupType,
          group_id: groupId,
          group_order: cluster.length > 1 ? i + 1 : null,
          exercise_id: item.exercise_id,
          sets: item.sets,
          reps_min: item.reps_min,
          reps_max: item.reps_max,
          duration_target_seconds: item.duration_target_seconds,
          distance_target_meters: item.distance_target_meters,
          initial_load_kg: item.initial_load_kg,
          rest_seconds: item.rest_seconds,
          technique: item.technique,
          notes: item.notes,
        });
      });
      orderIndex += 1;
    }

    startTransition(async () => {
      const result = await saveTemplateItems(templateId, payload);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      setIsDirty(false);
      router.refresh();
    });
  }

  const clusters = computeClusters(items);

  return (
    <div className="flex flex-col gap-4 pb-28">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} exercício{items.length === 1 ? "" : "s"}
        </p>
        <Button type="button" size="sm" onClick={() => setShowPicker(true)}>
          <Plus className="h-4 w-4" />
          Adicionar exercício
        </Button>
      </div>

      {items.length === 0 && (
        <Card>
          <p className="text-sm text-muted-foreground">
            Nenhum exercício ainda. Toque em &quot;Adicionar exercício&quot; para montar o treino.
          </p>
        </Card>
      )}

      {/* id fixo: evita hydration mismatch — sem isso o dnd-kit gera o id de
          aria-describedby com um contador interno que pode divergir entre o
          render do servidor e o do cliente (mais visível em dev com Strict
          Mode, que renderiza componentes duas vezes no cliente). */}
      <DndContext
        id="template-editor-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={items.map((i) => i.clientId)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {clusters.map((cluster) => {
              const isGroup = cluster.length > 1;
              const lastId = cluster[cluster.length - 1].clientId;
              const globalIndex = items.findIndex((i) => i.clientId === lastId);
              const nextItem = items[globalIndex + 1];

              const block = (
                <div className="flex flex-col gap-2">
                  {cluster.map((item) => (
                    <TemplateItemCard
                      key={item.clientId}
                      item={item}
                      compact={isGroup}
                      canGroupWithNext={
                        item.clientId === lastId && !!nextItem && nextItem.group_key === null
                      }
                      onUpdate={(patch) => updateItem(item.clientId, patch)}
                      onRemove={() => removeItem(item.clientId)}
                      onToggleOpen={() => toggleOpen(item.clientId)}
                      onGroupWithNext={
                        item.clientId === lastId ? () => groupWithNext(item.clientId) : undefined
                      }
                      onRemoveFromGroup={isGroup ? () => removeFromGroup(item.clientId) : undefined}
                    />
                  ))}
                </div>
              );

              if (!isGroup) return <div key={cluster[0].clientId}>{block}</div>;

              return (
                <div
                  key={cluster[0].group_key}
                  className="flex flex-col gap-2 rounded-2xl border-2 border-primary/40 bg-primary/5 p-2"
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {GROUP_TYPE_LABELS[groupTypeForSize(cluster.length)]}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline"
                      onClick={() => dissolveCluster(cluster)}
                    >
                      Desfazer agrupamento
                    </button>
                  </div>
                  {block}
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {items.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Toque em um exercício para editar a prescrição. Para criar um bi-set/tri-set, abra o
          último exercício do bloco e toque em &quot;Unir com o próximo&quot;.
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <span className="flex-1 text-xs text-muted-foreground">
            {isPending ? "Salvando..." : isDirty ? "Alterações não salvas" : "✓ Tudo salvo"}
          </span>
          <Button type="button" onClick={handleSave} disabled={isPending || !isDirty}>
            Salvar alterações
          </Button>
        </div>
      </div>

      {showPicker && (
        <ExercisePicker
          exercises={availableExercises}
          onPick={addExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
