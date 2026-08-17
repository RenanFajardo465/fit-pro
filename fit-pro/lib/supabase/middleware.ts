import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rotas acessíveis sem sessão autenticada.
 * Qualquer rota fora desta lista exige usuário logado.
 */
const PUBLIC_PATHS = ["/login"];

/**
 * Renova a sessão do Supabase (refresh do token quando necessário) e aplica o
 * controle de acesso: sem sessão → redireciona para /login; com sessão em
 * /login → redireciona para /hoje. Chamado a partir de proxy.ts em toda
 * navegação (App Router), garantindo que Server Components sempre recebam um
 * cookie de sessão válido.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value)
          );
        },
      },
    }
  );

  // getUser() (não getSession()) valida o token contra o servidor do Supabase
  // em vez de só ler o cookie — necessário para decisões de segurança.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/hoje";
    return NextResponse.redirect(url);
  }

  return response;
}
