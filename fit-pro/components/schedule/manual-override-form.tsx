"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { setManualOverride, clearManualOverride } from "@/lib/actions/schedule";

const NO_OVERRIDE = "__none__";
const REST_OVERRIDE = "__rest__";

export function ManualOverrideForm({
  date,
  templates,
  currentOverride,
}: {
  date: string;
  templates: { id: string; code: string; name: string }[];
  currentOverride: { template_id: string | null } | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState<string>(
    currentOverride ? (currentOverride.template_id ?? REST_OVERRIDE) : NO_OVERRIDE
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result =
        value === NO_OVERRIDE
          ? await clearManualOverride(date)
          : await setManualOverride(date, value === REST_OVERRIDE ? null : value);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Select value={value} onChange={(e) => setValue(e.target.value)}>
        <option value={NO_OVERRIDE}>Sem override — usar a recomendação normal</option>
        <option value={REST_OVERRIDE}>Forçar descanso neste dia</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            Forçar {t.code} — {t.name}
          </option>
        ))}
      </Select>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="button" onClick={handleSave} disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
}
