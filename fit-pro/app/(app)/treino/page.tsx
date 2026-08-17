import { Card } from "@/components/ui/card";

export default function TreinoPage() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-2xl font-semibold tracking-tight">Treino</h1>
      <Card>
        <p className="text-sm text-muted-foreground">
          Biblioteca de exercícios, templates, importação de CSV e execução
          do treino chegam nas Fases 2 e 3.
        </p>
      </Card>
    </div>
  );
}
