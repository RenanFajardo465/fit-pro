"use client";

import { useState } from "react";
import { Search, Barcode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { searchOpenFoodFacts, lookupOpenFoodFactsBarcode, type OpenFoodFactsMatch } from "@/lib/nutrition/open-food-facts";
import { searchTacoSeed, type TacoFood } from "@/lib/nutrition/taco-seed";

export type ExternalFoodMatch = {
  source: "Open Food Facts" | "TACO";
  name: string;
  brand: string | null;
  caloriesPer100g: number | null;
  proteinGPer100g: number | null;
  carbsGPer100g: number | null;
  fatGPer100g: number | null;
};

function fromOff(m: OpenFoodFactsMatch): ExternalFoodMatch {
  return {
    source: "Open Food Facts",
    name: m.name,
    brand: m.brand,
    caloriesPer100g: m.caloriesPer100g,
    proteinGPer100g: m.proteinGPer100g,
    carbsGPer100g: m.carbsGPer100g,
    fatGPer100g: m.fatGPer100g,
  };
}

function fromTaco(f: TacoFood): ExternalFoodMatch {
  return {
    source: "TACO",
    name: f.name,
    brand: null,
    caloriesPer100g: f.caloriesPer100g,
    proteinGPer100g: f.proteinGPer100g,
    carbsGPer100g: f.carbsGPer100g,
    fatGPer100g: f.fatGPer100g,
  };
}

/**
 * Painel de busca pra pré-preencher o formulário de alimento — combina
 * duas fontes complementares: TACO (alimentos "in natura", busca local,
 * instantânea, sem rede) e Open Food Facts (produtos industrializados com
 * marca, busca por nome ou código de barras, via rede). Os dois sempre
 * voltam valores por 100g — quem decide o formulário entende isso e já
 * pré-preenche a porção de referência como "100 g".
 */
export function FoodExternalSearch({ onSelect }: { onSelect: (match: ExternalFoodMatch) => void }) {
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [results, setResults] = useState<ExternalFoodMatch[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function runSearch() {
    if (!query.trim()) return;
    setIsSearching(true);
    setError(null);
    const tacoMatches = searchTacoSeed(query).map(fromTaco);
    try {
      const offMatches = await searchOpenFoodFacts(query);
      setResults([...tacoMatches, ...offMatches.map(fromOff)]);
    } catch {
      // Rede fora do ar não deveria impedir de ver os resultados locais da TACO.
      setResults(tacoMatches);
      setError("Não foi possível buscar no Open Food Facts agora — mostrando só resultados da TACO.");
    } finally {
      setIsSearching(false);
    }
  }

  async function runBarcodeLookup() {
    if (!barcode.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const match = await lookupOpenFoodFactsBarcode(barcode);
      setResults(match ? [fromOff(match)] : []);
      if (!match) setError("Nenhum produto encontrado com esse código de barras.");
    } catch {
      setResults([]);
      setError("Não foi possível buscar esse código de barras agora.");
    } finally {
      setIsSearching(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Search className="h-4 w-4" />
        Buscar calorias por nome ou marca
      </Button>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Buscar alimento pronto</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground underline">
          Fechar
        </button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ex.: arroz, iogurte, biscoito..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
        />
        <Button type="button" size="icon" variant="outline" onClick={runSearch} disabled={isSearching} aria-label="Buscar">
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ou cole o código de barras (EAN)"
          inputMode="numeric"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runBarcodeLookup();
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={runBarcodeLookup}
          disabled={isSearching}
          aria-label="Buscar por código de barras"
        >
          <Barcode className="h-4 w-4" />
        </Button>
      </div>

      {error && <p className="text-xs text-muted-foreground">{error}</p>}

      {results && results.length === 0 && !error && (
        <p className="text-xs text-muted-foreground">Nenhum resultado. Pode preencher manualmente abaixo.</p>
      )}

      {results && results.length > 0 && (
        <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r);
                  setOpen(false);
                }}
                className="flex w-full flex-col gap-0.5 rounded-xl border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary/50"
              >
                <span className="font-medium">
                  {r.name}
                  {r.brand ? ` · ${r.brand}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.source} · {r.caloriesPer100g ?? "?"} kcal / 100g
                  {r.proteinGPer100g != null ? ` · P ${r.proteinGPer100g}g` : ""}
                  {r.carbsGPer100g != null ? ` · C ${r.carbsGPer100g}g` : ""}
                  {r.fatGPer100g != null ? ` · G ${r.fatGPer100g}g` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
