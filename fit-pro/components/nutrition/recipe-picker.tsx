"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type PickableRecipe = {
  id: string;
  name: string;
  servings: number;
  computed_calories: number;
  computed_protein_g: number;
  computed_carbs_g: number;
  computed_fat_g: number;
};

/**
 * Overlay de tela cheia pra escolher uma receita já carregada — mesmo
 * padrão do FoodPicker/ExercisePicker (biblioteca pessoal pequena, filtra
 * tudo no cliente, sem round-trip de rede).
 */
export function RecipePicker({
  recipes,
  onPick,
  onClose,
}: {
  recipes: PickableRecipe[];
  onPick: (recipe: PickableRecipe) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => r.name.toLowerCase().includes(q));
  }, [recipes, query]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar receita..."
            className="pl-10"
          />
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {recipes.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Você ainda não tem receitas. Cadastre em Nutrição → Receitas antes de usar aqui.
          </p>
        )}

        {recipes.length > 0 && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma receita encontrada.</p>
        )}

        <ul className="flex flex-col gap-2">
          {filtered.map((recipe) => (
            <li key={recipe.id}>
              <button
                type="button"
                onClick={() => onPick(recipe)}
                className="flex w-full flex-col items-start gap-0.5 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50"
              >
                <span className="font-medium">{recipe.name}</span>
                <span className="text-xs text-muted-foreground">
                  Por porção: {recipe.computed_calories} kcal · P {recipe.computed_protein_g}g · C{" "}
                  {recipe.computed_carbs_g}g · G {recipe.computed_fat_g}g
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
