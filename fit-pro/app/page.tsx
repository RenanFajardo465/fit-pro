import { redirect } from "next/navigation";

// Raiz do site: nunca renderiza nada por si só. O proxy.ts decide para onde
// mandar (usuário logado → /hoje; deslogado → /login).
export default function RootPage() {
  redirect("/hoje");
}
