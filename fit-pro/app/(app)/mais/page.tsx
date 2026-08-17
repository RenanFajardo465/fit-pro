import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOut } from "@/lib/actions/auth";

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

      <Card>
        <p className="text-sm text-muted-foreground">
          Calendário, configurações de recomendação, atividades externas,
          lixeira e exportação chegam nas próximas fases.
        </p>
      </Card>

      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          Sair
        </Button>
      </form>
    </div>
  );
}
