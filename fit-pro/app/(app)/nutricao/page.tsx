import Link from "next/link";
import { ChevronRight, Apple, ChefHat, CalendarRange, NotebookPen, Upload, History } from "lucide-react";
import { Card } from "@/components/ui/card";

const LINKS = [
  { href: "/nutricao/diario", label: "Diário do dia", icon: NotebookPen },
  { href: "/nutricao/historico", label: "Histórico", icon: History },
  { href: "/nutricao/alimentos", label: "Alimentos", icon: Apple },
  { href: "/nutricao/receitas", label: "Receitas", icon: ChefHat },
  { href: "/nutricao/dietas", label: "Dietas", icon: CalendarRange },
  { href: "/nutricao/importar", label: "Importar CSV", icon: Upload },
];

export default function NutricaoPage() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-2xl font-semibold tracking-tight">Nutrição</h1>

      <ul className="flex flex-col gap-2">
        {LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href}>
              <Card className="flex items-center justify-between gap-3 py-3.5 transition-colors hover:border-primary/50">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{label}</span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <Card>
        <p className="text-sm text-muted-foreground">
          Meta diária de calorias/proteína fica em Mais → Meta nutricional. O resumo aparece no Hoje e no
          diário do dia.
        </p>
      </Card>
    </div>
  );
}
