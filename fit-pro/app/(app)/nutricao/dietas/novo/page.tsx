import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DietTemplateMetaForm } from "@/components/nutrition/diet-template-meta-form";
import { createDietTemplate } from "@/lib/actions/diet-templates";

export default function NovaDietaPage() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/nutricao/dietas" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Dietas
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Nova dieta</h1>
      <p className="text-sm text-muted-foreground">
        Depois de criar, você monta as refeições na tela seguinte.
      </p>
      <DietTemplateMetaForm onSubmit={createDietTemplate} submitLabel="Criar e continuar" />
    </div>
  );
}
