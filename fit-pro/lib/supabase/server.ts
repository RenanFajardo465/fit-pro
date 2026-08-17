import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route Handlers.
 * Sempre crie um cliente novo por request — nunca reutilize entre requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado a partir de um Server Component: não é possível escrever
            // cookies aqui. O proxy.ts (seção "Sessão") já cuida de renovar
            // a sessão em toda navegação, então isso é seguro de ignorar.
          }
        },
      },
    }
  );
}
