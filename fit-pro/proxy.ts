import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// No Next.js 16, "middleware.ts" foi renomeado para "proxy.ts" (mesma função,
// exportada como `proxy`). Ver AGENTS.md gerado na raiz do projeto.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto:
     * - arquivos estáticos do Next (_next/static, _next/image)
     * - favicon e imagens públicas
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
