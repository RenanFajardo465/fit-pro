import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DietCsvImportClient } from "@/components/nutrition/diet-csv-import-client";

export default async function ImportarDietaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: diets } = await supabase
    .from("diet_templates")
    .select("code")
    .eq("user_id", user!.id)
    .is("deleted_at", null);

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link href="/nutricao" className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Nutrição
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Importar CSV de dieta</h1>

      <DietCsvImportClient existingDietCodes={(diets ?? []).map((d) => d.code)} />
    </div>
  );
}
