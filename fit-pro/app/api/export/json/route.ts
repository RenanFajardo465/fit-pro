import { createClient } from "@/lib/supabase/server";
import { buildExportBundle } from "@/lib/export/build-export";

/**
 * Fase 6 — Exportação JSON (Fase 0, seção 23): bundle único, gerado sob
 * demanda, lido com o cliente do próprio usuário (RLS) — nunca
 * service_role. Sem job assíncrono: volume de dados de 2 pessoas é
 * pequeno o bastante pra montar tudo em memória na própria request.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const bundle = await buildExportBundle(supabase, user.id);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="fit-pro-export-${date}.json"`,
    },
  });
}
