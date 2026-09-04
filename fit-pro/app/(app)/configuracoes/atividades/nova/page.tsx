import { redirect } from "next/navigation";

// Removido junto com /configuracoes/atividades (ver ali o motivo).
export default function NovaAtividadePage() {
  redirect("/mais");
}
