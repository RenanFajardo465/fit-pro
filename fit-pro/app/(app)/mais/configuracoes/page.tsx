import { redirect } from "next/navigation";

// Rota antiga (Fase 2, Incremento 4) — a árvore de páginas aprovada na
// Fase 0 (seção 4) tem `configuracoes/` como rota própria de nível
// superior, não aninhada em `mais/`. Mantido como redirect em vez de
// apagado para não quebrar quem tiver este link salvo.
export default function MaisConfiguracoesRedirect() {
  redirect("/configuracoes/recomendacao");
}
