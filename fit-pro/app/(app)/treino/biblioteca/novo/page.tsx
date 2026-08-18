import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExerciseForm } from "@/components/workout/exercise-form";
import { createExercise } from "@/lib/actions/exercises";

export default function NovoExercicioPage() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <Link
        href="/treino/biblioteca"
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Biblioteca
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Novo exercício</h1>
      <ExerciseForm onSubmit={createExercise} submitLabel="Salvar exercício" />
    </div>
  );
}
