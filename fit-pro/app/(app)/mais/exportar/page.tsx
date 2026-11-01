import Link from "next/link";
import { ArrowLeft, Download, FileJson, FileArchive } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Fase 6 — Exportação (Fase 0, seção 23). Links simples pro Route Handler
 * (GET autenticado via cookie de sessão, sujeito a RLS) — o navegador já
 * trata o `content-disposition: attachment` como download, sem precisar
 * de client component nem de buscar o arquivo via fetch.
 */
export default function ExportarPage() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/mais" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Mais
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Exportar dados</h1>

      <Card className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Baixa todos os seus dados de treino e nutrição — nada de outro usuário, graças às permissões do
          banco. Os dois formatos têm o mesmo conteúdo.
        </p>
      </Card>

      <a href="/api/export/json" download>
        <Card className="flex items-center justify-between gap-3 transition-colors hover:border-primary/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <FileJson className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">Exportar como JSON</span>
              <span className="text-xs text-muted-foreground">
                Um único arquivo, pensado para uso com ferramentas de IA
              </span>
            </div>
          </div>
          <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Card>
      </a>

      <a href="/api/export/csv" download>
        <Card className="flex items-center justify-between gap-3 transition-colors hover:border-primary/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <FileArchive className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">Exportar como CSV (.zip)</span>
              <span className="text-xs text-muted-foreground">
                Um arquivo por tabela — sessões, séries, volume, recordes e diário nutricional
              </span>
            </div>
          </div>
          <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Card>
      </a>
    </div>
  );
}
