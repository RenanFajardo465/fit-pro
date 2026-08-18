import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TemplateMetaForm } from "@/components/workout/template-meta-form";
import { createTemplate } from "@/lib/actions/templates";

export default function NovoTemplatePage() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <Link
        href="/treino/templates"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Templates
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Novo template</h1>
      <p className="text-sm text-muted-foreground">
        Depois de criar, você monta os exercícios na tela seguinte.
      </p>
      <TemplateMetaForm onSubmit={createTemplate} submitLabel="Criar e continuar" />
    </div>
  );
}
