import { BottomNav } from "@/components/shared/bottom-nav";

// Layout compartilhado por todas as rotas autenticadas (Hoje, Treino,
// Nutrição, Evolução, Mais). O controle de acesso em si acontece no
// proxy.ts — este layout só cuida do chrome visual (nav inferior + safe
// areas), para não duplicar a checagem de sessão em toda página.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main
        className="flex-1 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
      >
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
