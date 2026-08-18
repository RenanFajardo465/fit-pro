import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ActivityForm } from "@/components/schedule/activity-form";

export default function NovaAtividadePage() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <Link
        href="/configuracoes/atividades"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Atividades externas
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Nova atividade</h1>
      <ActivityForm />
    </div>
  );
}
