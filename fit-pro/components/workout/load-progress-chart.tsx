"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select } from "@/components/ui/select";
import { computeLoadProgress, type CompletedSetRecord } from "@/lib/workout/evolution";

function formatDateLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

/** Progresso de carga por exercício — Fase 4, decisão do usuário. Seletor de exercício + linha de evolução da maior carga por sessão. */
export function LoadProgressChart({
  exercises,
  records,
}: {
  exercises: { id: string; name: string }[];
  records: CompletedSetRecord[];
}) {
  const [selectedId, setSelectedId] = useState(exercises[0]?.id ?? "");

  const points = useMemo(() => computeLoadProgress(records, selectedId), [records, selectedId]);

  if (exercises.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não há séries concluídas com carga registrada.</p>;
  }

  const chartData = points.map((p) => ({ label: formatDateLabel(p.sessionDate), maxWeightKg: p.maxWeightKg }));

  return (
    <div className="flex flex-col gap-3">
      <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.name}
          </option>
        ))}
      </Select>

      {chartData.length < 2 ? (
        <p className="text-sm text-muted-foreground">
          Ainda só tem {chartData.length === 0 ? "nenhum" : "um"} treino concluído com esse exercício — faça mais
          sessões pra ver a evolução.
        </p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid vertical={false} stroke="#27272b" />
              <XAxis dataKey="label" tick={{ fill: "#9a9aa2", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#27272b" }} />
              <YAxis tick={{ fill: "#9a9aa2", fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: "#17171a", border: "1px solid #27272b", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "#f5f5f6" }}
                formatter={(value) => [`${value}kg`, "Carga máxima"]}
              />
              <Line
                type="monotone"
                dataKey="maxWeightKg"
                stroke="#f4c542"
                strokeWidth={2}
                dot={{ fill: "#f4c542", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
