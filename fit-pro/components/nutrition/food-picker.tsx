"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FOOD_UNIT_LABELS, type FoodUnit } from "@/lib/nutrition/vocabulary";

export type PickableFood = {
  id: string;
  name: string;
  brand: string | null;
  serving_quantity: number;
  serving_unit: string;
  grams_equivalent: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

/**
 * Overlay de tela cheia pra escolher um alimento da biblioteca já carregada
 * — mesmo padrão do ExercisePicker (biblioteca pessoal pequena, filtra tudo
 * no cliente, sem round-trip de rede).
 */
export function FoodPicker({
  foods,
  onPick,
  onClose,
}: {
  foods: PickableFood[];
  onPick: (food: PickableFood) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter(
      (f) => f.name.toLowerCase().includes(q) || (f.brand ?? "").toLowerCase().includes(q)
    );
  }, [foods, query]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alimento..."
            className="pl-10"
          />
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {foods.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sua biblioteca de alimentos está vazia. Cadastre alimentos em Nutrição → Alimentos
            antes de montar uma receita.
          </p>
        )}

        {foods.length > 0 && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum alimento encontrado.</p>
        )}

        <ul className="flex flex-col gap-2">
          {filtered.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => onPick(food)}
                className="flex w-full flex-col items-start gap-0.5 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/50"
              >
                <span className="font-medium">
                  {food.name}
                  {food.brand ? ` · ${food.brand}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {food.serving_quantity} {FOOD_UNIT_LABELS[food.serving_unit as FoodUnit] ?? food.serving_unit}
                  {" · "}
                  {food.calories} kcal
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
