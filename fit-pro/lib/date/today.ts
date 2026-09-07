/**
 * "Hoje" do app é sempre calculado no fuso do Brasil, não no fuso do
 * servidor (a Vercel roda em UTC — sem isso, o dia viraria às 21h no
 * horário de Brasília em vez de à meia-noite). Decisão pequena e
 * reversível: fuso fixo, já que o app é privado para 2 usuários no Brasil;
 * se um dia for preciso, vira uma preferência de perfil sem migração de
 * dados (nada é armazenado com esse fuso, só calculado na leitura).
 */
const APP_TIMEZONE = "America/Sao_Paulo";

function formatAppDate(instant: Date): string {
  // Locale "en-CA" formata datas como YYYY-MM-DD — truque comum para tirar
  // do Intl uma data já no formato que o Postgres/HTML `date` esperam.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function getAppToday(): { date: string; weekday: number } {
  const date = formatAppDate(new Date());
  const [y, m, d] = date.split("-").map(Number);
  // Data "flutuante" (sem hora) — construir em UTC evita que o cálculo do
  // dia da semana dependa do fuso da máquina que está rodando o código.
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();

  return { date, weekday };
}

/**
 * Data "de calendário" (YYYY-MM-DD, fuso America/Sao_Paulo) de um instante
 * qualquer — usado para saber se uma sessão foi iniciada "ontem ou antes"
 * (treino esquecido, Fase 0 seção 10), não só "há mais de 4 horas".
 */
export function getAppDateOf(isoTimestamp: string): string {
  return formatAppDate(new Date(isoTimestamp));
}

/**
 * Horas decorridas desde um timestamp ISO. Função utilitária comum (não um
 * componente) de propósito — chamar `Date.now()` direto dentro do corpo de
 * um componente é sinalizado pelo React Compiler como impuro.
 */
export function getHoursSince(isoTimestamp: string): number {
  return (Date.now() - new Date(isoTimestamp).getTime()) / 3_600_000;
}

/**
 * Soma (ou subtrai) dias a uma data "flutuante" YYYY-MM-DD, sem depender de
 * fuso horário — usada pela navegação dia-a-dia do diário nutricional
 * (Fase 5, Incremento 4). Construir em UTC evita o bug clássico de "dia
 * anterior" perto da virada de mês em fusos negativos.
 */
export function addDaysToIsoDate(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + delta));
  return next.toISOString().slice(0, 10);
}

/** Formata YYYY-MM-DD como "seg, 17 de ago" (fuso fixo do app, seção acima). */
export function formatIsoDateShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
