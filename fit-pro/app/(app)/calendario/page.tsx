import { redirect } from "next/navigation";

// A recomendação deixou de ser amarrada ao calendário (fluxo 100%
// sequencial — ver lib/workout/recommendation.ts). A página de calendário
// não faz mais sentido; a fila fica visível em Treino e em Configurações
// de recomendação.
export default function CalendarioPage() {
  redirect("/treino");
}
