import { Card } from "@/components/ui/card";

export default function EvolucaoPage() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-2xl font-semibold tracking-tight">Evolução</h1>
      <Card>
        <p className="text-sm text-muted-foreground">
          Histórico, volume, recordes pessoais, gráficos e peso corporal
          chegam na Fase 4.
        </p>
      </Card>
    </div>
  );
}
