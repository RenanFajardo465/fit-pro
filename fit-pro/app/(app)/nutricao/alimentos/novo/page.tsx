import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FoodForm } from "@/components/nutrition/food-form";
import { createFood } from "@/lib/actions/foods";

export default function NovoAlimentoPage() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/nutricao/alimentos" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Alimentos
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Novo alimento</h1>
      <FoodForm onSubmit={createFood} submitLabel="Salvar alimento" />
    </div>
  );
}
