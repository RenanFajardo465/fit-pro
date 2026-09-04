import { redirect } from "next/navigation";

// Removido a pedido do usuário: com o fluxo 100% sequencial, não há mais
// regras que dependam de atividades externas (a única coisa que as usava
// era "evitar grupo muscular após atividade", que também saiu).
export default function AtividadesPage() {
  redirect("/mais");
}
