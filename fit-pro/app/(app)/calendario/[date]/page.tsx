import { redirect } from "next/navigation";

// Override manual por data foi removido junto com o resto da amarração ao
// calendário (fluxo 100% sequencial — ver lib/workout/recommendation.ts).
export default function CalendarioDiaPage() {
  redirect("/treino");
}
