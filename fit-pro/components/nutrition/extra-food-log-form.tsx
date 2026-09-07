"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Apple, ChefHat, Pencil } from "lucide-react";
import { Dialog, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FoodPicker, type PickableFood } from "@/components/nutrition/food-picker";
import { RecipePicker, type PickableRecipe } from "@/components/nutrition/recipe-picker";
import { addExtraFoodLog } from "@/lib/actions/diet-days";
import type { ExtraFoodLogValues } from "@/lib/schemas/diet-day";

type Step = "closed" | "menu" | "food-picker" | "recipe-picker" | "quantity" | "custom";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function ExtraFoodLogForm({
  dietDayId,
  date,
  foods,
  recipes,
}: {
  dietDayId: string;
  date: string;
  foods: PickableFood[];
  recipes: PickableRecipe[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [selectedFood, setSelectedFood] = useState<PickableFood | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<PickableRecipe | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState(0);
  const [customProtein, setCustomProtein] = useState(0);
  const [customCarbs, setCustomCarbs] = useState(0);
  const [customFat, setCustomFat] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetAndClose() {
    setStep("closed");
    setSelectedFood(null);
    setSelectedRecipe(null);
    setQuantity(1);
    setCustomName("");
    setCustomCalories(0);
    setCustomProtein(0);
    setCustomCarbs(0);
    setCustomFat(0);
    setError(null);
  }

  function submit(values: ExtraFoodLogValues) {
    setError(null);
    startTransition(async () => {
      const result = await addExtraFoodLog(dietDayId, values, date);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      resetAndClose();
      router.refresh();
    });
  }

  function submitFoodOrRecipe() {
    if (selectedFood) {
      submit({
        source: "food",
        food_id: selectedFood.id,
        recipe_id: null,
        name: selectedFood.brand ? `${selectedFood.name} · ${selectedFood.brand}` : selectedFood.name,
        quantity,
        calories: round2(selectedFood.calories * quantity),
        protein_g: round2(selectedFood.protein_g * quantity),
        carbs_g: round2(selectedFood.carbs_g * quantity),
        fat_g: round2(selectedFood.fat_g * quantity),
        notes: null,
      });
    } else if (selectedRecipe) {
      submit({
        source: "recipe",
        food_id: null,
        recipe_id: selectedRecipe.id,
        name: selectedRecipe.name,
        quantity,
        calories: round2(selectedRecipe.computed_calories * quantity),
        protein_g: round2(selectedRecipe.computed_protein_g * quantity),
        carbs_g: round2(selectedRecipe.computed_carbs_g * quantity),
        fat_g: round2(selectedRecipe.computed_fat_g * quantity),
        notes: null,
      });
    }
  }

  function submitCustom() {
    submit({
      source: "custom",
      food_id: null,
      recipe_id: null,
      name: customName,
      quantity: 1,
      calories: customCalories,
      protein_g: customProtein,
      carbs_g: customCarbs,
      fat_g: customFat,
      notes: null,
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setStep("menu")}>
        <Plus className="h-3.5 w-3.5" />
        Adicionar item extra
      </Button>

      <Dialog open={step === "menu"} onOpenChange={(open) => !open && resetAndClose()}>
        <DialogTitle>Item extra</DialogTitle>
        <DialogDescription>De onde vem esse item, fora da dieta planejada?</DialogDescription>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" onClick={() => setStep("food-picker")}>
            <Apple className="h-4 w-4" />
            Alimento da biblioteca
          </Button>
          <Button type="button" variant="outline" onClick={() => setStep("recipe-picker")}>
            <ChefHat className="h-4 w-4" />
            Receita
          </Button>
          <Button type="button" variant="outline" onClick={() => setStep("custom")}>
            <Pencil className="h-4 w-4" />
            Personalizado (digitar macros)
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={resetAndClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </Dialog>

      {step === "food-picker" && (
        <FoodPicker
          foods={foods}
          onPick={(food) => {
            setSelectedFood(food);
            setSelectedRecipe(null);
            setQuantity(1);
            setStep("quantity");
          }}
          onClose={() => setStep("menu")}
        />
      )}

      {step === "recipe-picker" && (
        <RecipePicker
          recipes={recipes}
          onPick={(recipe) => {
            setSelectedRecipe(recipe);
            setSelectedFood(null);
            setQuantity(1);
            setStep("quantity");
          }}
          onClose={() => setStep("menu")}
        />
      )}

      <Dialog open={step === "quantity"} onOpenChange={(open) => !open && resetAndClose()}>
        <DialogTitle>{selectedFood?.name ?? selectedRecipe?.name}</DialogTitle>
        <DialogDescription>Quantas porções você consumiu?</DialogDescription>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="extra-quantity">Quantidade (em porções)</Label>
          <Input
            id="extra-quantity"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={resetAndClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={submitFoodOrRecipe} disabled={isPending || quantity <= 0}>
            {isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={step === "custom"} onOpenChange={(open) => !open && resetAndClose()}>
        <DialogTitle>Item personalizado</DialogTitle>
        <DialogDescription>Digite o nome e os macros totais do que você comeu.</DialogDescription>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="custom-name">Nome</Label>
            <Input id="custom-name" value={customName} onChange={(e) => setCustomName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-calories">Calorias (kcal)</Label>
              <Input
                id="custom-calories"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={customCalories}
                onChange={(e) => setCustomCalories(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-protein">Proteína (g)</Label>
              <Input
                id="custom-protein"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={customProtein}
                onChange={(e) => setCustomProtein(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-carbs">Carboidratos (g)</Label>
              <Input
                id="custom-carbs"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={customCarbs}
                onChange={(e) => setCustomCarbs(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="custom-fat">Gorduras (g)</Label>
              <Input
                id="custom-fat"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={customFat}
                onChange={(e) => setCustomFat(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={resetAndClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={submitCustom} disabled={isPending || !customName.trim()}>
            {isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
