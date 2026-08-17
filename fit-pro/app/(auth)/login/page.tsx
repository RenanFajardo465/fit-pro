import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Fit-Pro</h1>
        <p className="text-sm text-muted-foreground">
          Treino, nutrição, histórico e evolução.
        </p>
      </div>

      <form action={login} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="mt-2">
          Entrar
        </Button>
      </form>
    </div>
  );
}
