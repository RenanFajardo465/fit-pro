/**
 * Matemática pura de grade de calendário (sem fuso horário — são só datas
 * "flutuantes" YYYY-MM-DD, cálculo feito em UTC para não depender do fuso
 * da máquina que roda o código). "Hoje", esse sim, usa fuso fixo — ver
 * lib/date/today.ts.
 */

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** month: 1-12. Retorna todas as datas da grade (semanas completas, dom-sáb) que cobre o mês. */
export function getMonthGridDates(year: number, month: number): string[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstOfMonth.getUTCDay();
  const gridStart = new Date(Date.UTC(year, month - 1, 1 - startWeekday));

  const lastOfMonth = new Date(Date.UTC(year, month, 0));
  const endWeekday = lastOfMonth.getUTCDay();
  const gridEnd = new Date(Date.UTC(year, month - 1, lastOfMonth.getUTCDate() + (6 - endWeekday)));

  const dates: string[] = [];
  const cursor = new Date(gridStart);
  while (cursor.getTime() <= gridEnd.getTime()) {
    dates.push(toDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function getWeekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + delta));
  return toDateString(next);
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = (year * 12 + (month - 1)) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export const MONTH_LABELS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;
