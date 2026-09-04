import Link from "next/link";
import { ChevronRight, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOut } from "@/lib/actions/auth";

const LINKS = [
  {
    href: "/configuracoes/recomendacao",
    icon: Settings,
    title: "Sequência de treinos",
    subtitle: "Ajustar manualmente qual foi o último treino concluído",
  },
] as const;

export default async function MaisPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-4 py-2">
      <h1 className="text-2xl font-semibold tracking-tight">Mais</h1>

      <Card className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Logado como</p>
        <p className="font-medium">{user?.email}</p>
      </Card>

      {LINKS.map(({ href, icon: Icon, title, subtitle }) => (
        <Link key={href} href={href}>
          <Card className="flex items-center justify-between gap-3 transition-colors hover:border-primary/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{title}</span>
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Card>
        </Link>
      ))}

      <Card>
        <p className="text-sm text-muted-foreground">Lixeira e exportação chegam nas próximas entregas.</p>
      </Card>

      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          Sair
        </Button>
      </form>
    </div>
  );
}
