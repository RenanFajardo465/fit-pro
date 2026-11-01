/**
 * Cliente isomórfico (sem "use client"/"use server") pra Open Food Facts
 * — base aberta e gratuita de produtos com código de barras, com boa
 * cobertura de marcas brasileiras (não exige chave de API, só um
 * User-Agent identificando o app, conforme a política de uso deles:
 * https://world.openfoodfacts.org/data).
 *
 * Só busca por nome/marca e por código de barras — sem leitura de câmera
 * (ficaria pra uma entrega futura, se fizer sentido). Os valores vêm
 * sempre por 100g (nem todo produto tem "por porção" preenchido na base,
 * então usar 100g como porção de referência é o único jeito confiável de
 * nunca mostrar um macro ausente/zerado por engano).
 */

const USER_AGENT = "Fit-Pro (app pessoal, 2 usuários) - contato via GitHub do projeto";

export type OpenFoodFactsMatch = {
  source: "open_food_facts";
  barcode: string | null;
  name: string;
  brand: string | null;
  /** Sempre por 100g — é o único valor presente de forma confiável na base. */
  caloriesPer100g: number | null;
  proteinGPer100g: number | null;
  carbsGPer100g: number | null;
  fatGPer100g: number | null;
};

type OffProductRaw = {
  code?: string;
  product_name?: string;
  product_name_pt?: string;
  brands?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
};

function mapProduct(p: OffProductRaw): OpenFoodFactsMatch | null {
  const name = p.product_name_pt?.trim() || p.product_name?.trim();
  if (!name) return null; // produto sem nome não serve pra preencher o formulário
  const n = p.nutriments ?? {};
  return {
    source: "open_food_facts",
    barcode: p.code ?? null,
    name,
    brand: p.brands?.split(",")[0]?.trim() || null,
    caloriesPer100g: typeof n["energy-kcal_100g"] === "number" ? n["energy-kcal_100g"] : null,
    proteinGPer100g: typeof n.proteins_100g === "number" ? n.proteins_100g : null,
    carbsGPer100g: typeof n.carbohydrates_100g === "number" ? n.carbohydrates_100g : null,
    fatGPer100g: typeof n.fat_100g === "number" ? n.fat_100g : null,
  };
}

/** Busca por nome/marca — prioriza produtos com origem/venda no Brasil. */
export async function searchOpenFoodFacts(query: string): Promise<OpenFoodFactsMatch[]> {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "15");
  url.searchParams.set("lc", "pt");
  url.searchParams.set("countries_tags_en", "brazil");
  url.searchParams.set(
    "fields",
    "code,product_name,product_name_pt,brands,nutriments"
  );

  const res = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Open Food Facts respondeu ${res.status}`);
  const data = (await res.json()) as { products?: OffProductRaw[] };
  return (data.products ?? []).map(mapProduct).filter((p): p is OpenFoodFactsMatch => p !== null);
}

/** Busca por código de barras (EAN-13 etc.) — retorna no máximo 1 resultado exato. */
export async function lookupOpenFoodFactsBarcode(barcode: string): Promise<OpenFoodFactsMatch | null> {
  const digits = barcode.trim();
  if (!digits) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(digits)}.json?fields=code,product_name,product_name_pt,brands,nutriments`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Open Food Facts respondeu ${res.status}`);
  const data = (await res.json()) as { status?: number; product?: OffProductRaw };
  if (data.status !== 1 || !data.product) return null;
  return mapProduct(data.product);
}
