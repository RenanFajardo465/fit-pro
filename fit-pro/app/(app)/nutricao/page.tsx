import { Card } from "@/components/ui/card";

export default function NutricaoPage() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-2xl font-semibold tracking-tight">Nutrição</h1>
      <Card>
        <p className="text-sm text-muted-foreground">
          Alimentos, receitas, dietas e diário nutricional chegam na Fase 5.
        </p>
      </Card>
    </div>
  );
}
