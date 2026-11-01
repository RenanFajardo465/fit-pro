/**
 * Fase 7 (refinamento): skeleton genérico pra `loading.tsx` de rotas que
 * disparam várias consultas sequenciais/paralelas ao Supabase antes de
 * renderizar — evita tela em branco entre a navegação e os dados
 * chegarem. Não tenta imitar o layout exato de cada página, só dá um
 * feedback visual imediato de "carregando".
 */
export function PageLoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="h-5 w-24 animate-pulse rounded bg-secondary" />
      <div className="h-7 w-40 animate-pulse rounded bg-secondary" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
