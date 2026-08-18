"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  SCHEDULE_MODES,
  SCHEDULE_MODE_LABELS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  AVAILABLE_RULE_TYPES,
  RULE_TYPE_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type ScheduleMode,
  type RuleType,
  type MuscleGroup,
} from "@/lib/workout/vocabulary";
import {
  setScheduleMode,
  setSequenceState,
  saveWeekdayAssignments,
  addScheduleRule,
  deleteScheduleRule,
} from "@/lib/actions/schedule";

export type ScheduleTemplate = { id: string; code: string; name: string };
export type ScheduleRuleRow = { id: string; rule_type: string; params: Record<string, unknown> };
export type ScheduleActivity = { id: string; name: string };

const TEMPLATE_LABEL = (t: ScheduleTemplate) => `${t.code} — ${t.name}`;

export function ScheduleSettingsForm({
  initialMode,
  templates,
  sequenceState,
  weekdayAssignments,
  rules,
  activities,
}: {
  initialMode: ScheduleMode;
  templates: ScheduleTemplate[];
  sequenceState: { last_completed_template_id: string | null; last_completed_at: string | null } | null;
  weekdayAssignments: { weekday: number; template_id: string | null }[];
  rules: ScheduleRuleRow[];
  activities: ScheduleActivity[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ScheduleMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(fn: () => Promise<{ error: string } | void>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleModeChange(next: ScheduleMode) {
    setMode(next);
    runAction(() => setScheduleMode(next));
  }

  const templatesById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-2">
        <Label>Modo de recomendação</Label>
        <Select value={mode} onChange={(e) => handleModeChange(e.target.value as ScheduleMode)}>
          {SCHEDULE_MODES.map((m) => (
            <option key={m} value={m}>
              {SCHEDULE_MODE_LABELS[m]}
            </option>
          ))}
        </Select>
        <p className="text-xs text-muted-foreground">
          {mode === "sequence" &&
            "Segue a ordem cadastrada dos treinos (por código), avançando um item a cada treino concluído."}
          {mode === "weekday" &&
            "Cada dia da semana tem um treino fixo (ou descanso) configurado abaixo."}
          {mode === "rules" &&
            "Usa a sequência contínua como base e aplica as regras cadastradas abaixo por cima."}
        </p>
      </Card>

      {mode === "sequence" && (
        <SequenceSection
          templates={templates}
          sequenceState={sequenceState}
          onSet={(id) => runAction(() => setSequenceState(id))}
          isPending={isPending}
        />
      )}

      {mode === "weekday" && (
        <WeekdaySection
          templates={templates}
          initialAssignments={weekdayAssignments}
          onSave={(assignments) => runAction(() => saveWeekdayAssignments(assignments))}
          isPending={isPending}
        />
      )}

      {mode === "rules" && (
        <RulesSection
          templates={templates}
          templatesById={templatesById}
          activities={activities}
          rules={rules}
          onAdd={(type, params) => runAction(() => addScheduleRule(type, params))}
          onDelete={(id) => runAction(() => deleteScheduleRule(id))}
          isPending={isPending}
        />
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function SequenceSection({
  templates,
  sequenceState,
  onSet,
  isPending,
}: {
  templates: ScheduleTemplate[];
  sequenceState: { last_completed_template_id: string | null; last_completed_at: string | null } | null;
  onSet: (id: string | null) => void;
  isPending: boolean;
}) {
  const lastId = sequenceState?.last_completed_template_id ?? null;
  const lastTemplate = templates.find((t) => t.id === lastId);

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <Label>Último treino concluído</Label>
        <p className="text-xs text-muted-foreground">
          Até a execução de treino existir (próxima fase), ajuste manualmente aqui para testar a
          fila. Depois, concluir um treino atualiza isso sozinho.
        </p>
      </div>

      <p className="text-sm">
        {lastTemplate ? `${TEMPLATE_LABEL(lastTemplate)}` : "Nenhum — a fila começa do primeiro treino"}
      </p>

      {templates.length === 0 ? (
        <p className="text-xs text-muted-foreground">Cadastre templates em Treino primeiro.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={t.id === lastId ? "default" : "outline"}
              disabled={isPending}
              onClick={() => onSet(t.id)}
            >
              {TEMPLATE_LABEL(t)}
            </Button>
          ))}
          {lastId && (
            <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => onSet(null)}>
              <RotateCcw className="h-3.5 w-3.5" />
              Zerar fila
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function WeekdaySection({
  templates,
  initialAssignments,
  onSave,
  isPending,
}: {
  templates: ScheduleTemplate[];
  initialAssignments: { weekday: number; template_id: string | null }[];
  onSave: (assignments: { weekday: number; template_id: string | null }[]) => void;
  isPending: boolean;
}) {
  const initialMap = useMemo(() => {
    const map = new Map<number, string | null>();
    for (const a of initialAssignments) map.set(a.weekday, a.template_id);
    return map;
  }, [initialAssignments]);

  const [values, setValues] = useState<Map<number, string | null>>(initialMap);
  const [dirty, setDirty] = useState(false);

  function update(weekday: number, templateId: string | null) {
    setValues((prev) => new Map(prev).set(weekday, templateId));
    setDirty(true);
  }

  function handleSave() {
    const assignments = WEEKDAYS.map((weekday) => ({
      weekday,
      template_id: values.get(weekday) ?? null,
    }));
    onSave(assignments);
    setDirty(false);
  }

  return (
    <Card className="flex flex-col gap-3">
      <Label>Treino por dia da semana</Label>
      <div className="flex flex-col gap-2">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-sm text-muted-foreground">
              {WEEKDAY_LABELS[weekday]}
            </span>
            <div className="flex-1">
              <Select
                value={values.get(weekday) ?? ""}
                onChange={(e) => update(weekday, e.target.value || null)}
              >
                <option value="">Descanso</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {TEMPLATE_LABEL(t)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" onClick={handleSave} disabled={!dirty || isPending}>
        {isPending ? "Salvando..." : "Salvar dias da semana"}
      </Button>
    </Card>
  );
}

function RulesSection({
  templates,
  templatesById,
  activities,
  rules,
  onAdd,
  onDelete,
  isPending,
}: {
  templates: ScheduleTemplate[];
  templatesById: Map<string, ScheduleTemplate>;
  activities: ScheduleActivity[];
  rules: ScheduleRuleRow[];
  onAdd: (type: RuleType, params: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const activitiesById = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);

  const [ruleType, setRuleType] = useState<RuleType>(AVAILABLE_RULE_TYPES[0]);
  const [weekday, setWeekday] = useState<number>(0);
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? "");
  const [activityId, setActivityId] = useState<string>(activities[0]?.id ?? "");
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(MUSCLE_GROUPS[0]);

  function describeRule(rule: ScheduleRuleRow): string {
    const weekdayValue = ((rule.params.weekday as number) ?? 0) as keyof typeof WEEKDAY_LABELS;
    const weekdayLabel = WEEKDAY_LABELS[weekdayValue];
    const tpl = templatesById.get(rule.params.template_id as string);
    switch (rule.rule_type) {
      case "reserve_rest_day":
        return `Descanso reservado às ${weekdayLabel}`;
      case "prioritize_template_on_weekday":
        return `Priorizar ${tpl ? TEMPLATE_LABEL(tpl) : "(treino removido)"} às ${weekdayLabel}`;
      case "avoid_template_on_weekday":
        return `Evitar ${tpl ? TEMPLATE_LABEL(tpl) : "(treino removido)"} às ${weekdayLabel}`;
      case "avoid_muscle_group_after_activity": {
        const activity = activitiesById.get(rule.params.activity_id as string);
        const mg = MUSCLE_GROUP_LABELS[rule.params.muscle_group as MuscleGroup] ?? rule.params.muscle_group;
        return `Evitar ${mg} após ${activity ? activity.name : "(atividade removida)"}`;
      }
      default:
        return rule.rule_type;
    }
  }

  function handleAdd() {
    let params: Record<string, unknown> = {};
    if (ruleType === "reserve_rest_day") {
      params = { weekday };
    } else if (ruleType === "avoid_muscle_group_after_activity") {
      params = { activity_id: activityId, muscle_group: muscleGroup };
    } else {
      params = { weekday, template_id: templateId };
    }
    onAdd(ruleType, params);
  }

  const needsTemplate = ruleType === "prioritize_template_on_weekday" || ruleType === "avoid_template_on_weekday";
  const needsWeekday = ruleType !== "avoid_muscle_group_after_activity";
  const needsActivity = ruleType === "avoid_muscle_group_after_activity";
  const canAdd =
    !isPending &&
    (!needsTemplate || !!templateId) &&
    (!needsActivity || (!!activityId && activities.length > 0));

  return (
    <Card className="flex flex-col gap-3">
      <Label>Regras</Label>

      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma regra cadastrada ainda.</p>
      )}

      <ul className="flex flex-col gap-2">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className="flex items-start justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 break-words">{describeRule(rule)}</span>
            <button
              type="button"
              onClick={() => onDelete(rule.id)}
              disabled={isPending}
              aria-label="Remover regra"
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <Select value={ruleType} onChange={(e) => setRuleType(e.target.value as RuleType)}>
          {AVAILABLE_RULE_TYPES.map((t) => (
            <option key={t} value={t}>
              {RULE_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>

        {needsWeekday && (
          <Select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
            {WEEKDAYS.map((w) => (
              <option key={w} value={w}>
                {WEEKDAY_LABELS[w]}
              </option>
            ))}
          </Select>
        )}

        {needsTemplate && (
          <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {templates.length === 0 && <option value="">Nenhum template cadastrado</option>}
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {TEMPLATE_LABEL(t)}
              </option>
            ))}
          </Select>
        )}

        {needsActivity && (
          <>
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Cadastre uma atividade externa primeiro (Mais → Atividades externas).
              </p>
            ) : (
              <Select value={activityId} onChange={(e) => setActivityId(e.target.value)}>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            )}
            <Select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}>
              {MUSCLE_GROUPS.map((mg) => (
                <option key={mg} value={mg}>
                  {MUSCLE_GROUP_LABELS[mg]}
                </option>
              ))}
            </Select>
          </>
        )}

        <Button type="button" variant="outline" onClick={handleAdd} disabled={!canAdd}>
          Adicionar regra
        </Button>
      </div>
    </Card>
  );
}
