"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WeeklyVolumePoint } from "@/lib/workout/evolution";

function formatWeekLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short" }).format(
    new Date(Date.UTC(y, m - 1, d))
  );
}

/** Volume total (carga × reps) por semana — Fase 4, decisão do usuário de priorizar isso junto com progresso de carga. */
export function VolumeChart({ data }: { data: WeeklyVolumePoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Ainda não há treinos concluídos para calcular volume.</p>;
  }

  const chartData = data.map((p) => ({ label: formatWeekLabel(p.weekStart), volumeKg: p.volumeKg }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="#27272b" />
          <XAxis dataKey="label" tick={{ fill: "#9a9aa2", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#27272b" }} />
          <YAxis tick={{ fill: "#9a9aa2", fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            contentStyle={{ background: "#17171a", border: "1px solid #27272b", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#f5f5f6" }}
            formatter={(value) => [`${value}kg`, "Volume"]}
          />
          <Bar dataKey="volumeKg" fill="#f4c542" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
