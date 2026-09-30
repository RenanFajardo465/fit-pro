import Papa from "papaparse";
import { FOOD_UNITS, DIET_TYPES, type FoodUnit, type DietType } from "@/lib/nutrition/vocabulary";

/**
 * Parsing e validação do CSV de dieta (Fase 0, seção 21). Espelha
 * `lib/csv/workout-import.ts` linha a linha: isomórfico (sem "use client"/
 * "use server"), usado tanto pelo preview no navegador quanto pela Server
 * Action, que reparseia o texto bruto do zero — nunca confia no
 * agrupamento já calculado no cliente (Fase 0, seção 22).
 */

/** Ordem e nomes exatos das colunas do CSV oficial de dieta (Fase 0, 21.1). */
export const DIET_CSV_COLUMNS = [
  "diet_name",
  "diet_code",
  "diet_type",
  "meal_name",
  "meal_order",
  "meal_time",
  "item_order",
  "food_name",
  "quantity",
  "unit",
  "grams_equivalent",
  "calories",
  "protein_g",
  "carbs_g",
  "fat_g",
  "notes",
] as const;

export type DietCsvRawRow = Record<string, string | undefined>;

export type DietCsvImportItem = {
  order_index: number;
  food_id: null;
  food_name: string;
  quantity: number;
  unit: FoodUnit;
  grams_equivalent: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
};

export type DietCsvImportMeal = {
  order_index: number;
  name: string;
  meal_time: string | null;
  items: DietCsvImportItem[];
};

export type DietCsvInput = {
  code: string;
  name: string;
  diet_type: DietType;
  meals: DietCsvImportMeal[];
};

export type CsvRowIssue = { row: number; message: string };

export type DietCsvParseResult = {
  diets: DietCsvInput[];
  errors: CsvRowIssue[];
  warnings: CsvRowIssue[];
};

function s(raw: DietCsvRawRow, key: string): string {
  return (raw[key] ?? "").trim();
}

const INVALID = Symbol("invalid");
type Invalid = typeof INVALID;

function parseIntOrInvalid(value: string): number | Invalid {
  if (!/^-?\d+$/.test(value)) return INVALID;
  return Number.parseInt(value, 10);
}

function parseDecimalOrInvalid(value: string): number | Invalid {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : INVALID;
}

/** O CSV oficial documenta "L" maiúsculo pra litro; internamente usamos "l" minúsculo (Fase 0, nota em vocabulary.ts). */
function normalizeUnit(value: string): string {
  return value === "L" ? "l" : value;
}

type ParsedRow = {
  rowNumber: number;
  diet_code: string;
  diet_name: string;
  diet_type: string;
  meal_name: string;
  meal_order: number;
  meal_time: string | null;
  item_order: number;
  item: DietCsvImportItem;
};

function parseDietCsvRow(
  raw: DietCsvRawRow,
  rowNumber: number
): { row: ParsedRow | null; errors: CsvRowIssue[]; warnings: CsvRowIssue[] } {
  const errors: CsvRowIssue[] = [];
  const warnings: CsvRowIssue[] = [];
  const fail = (message: string) => errors.push({ row: rowNumber, message });

  const diet_name = s(raw, "diet_name");
  const diet_code = s(raw, "diet_code");
  const diet_type = s(raw, "diet_type");
  const meal_name = s(raw, "meal_name");
  const meal_time_raw = s(raw, "meal_time");
  const food_name = s(raw, "food_name");
  const unit_raw = normalizeUnit(s(raw, "unit"));
  const notes = s(raw, "notes");

  if (!diet_name) fail("diet_name é obrigatório");
  if (!diet_code) fail("diet_code é obrigatório");
  if (!(DIET_TYPES as readonly string[]).includes(diet_type)) {
    fail(`diet_type inválido: "${diet_type}" (use um de: ${DIET_TYPES.join(", ")})`);
  }
  if (!meal_name) fail("meal_name é obrigatório");
  if (!food_name) fail("food_name é obrigatório");

  const meal_order = parseIntOrInvalid(s(raw, "meal_order"));
  if (meal_order === INVALID || meal_order < 1) fail("meal_order deve ser um número inteiro ≥ 1");

  let meal_time: string | null = null;
  if (meal_time_raw) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(meal_time_raw)) {
      fail(`meal_time inválido: "${meal_time_raw}" (use o formato HH:MM)`);
    } else {
      meal_time = meal_time_raw;
    }
  }

  const item_order = parseIntOrInvalid(s(raw, "item_order"));
  if (item_order === INVALID || item_order < 1) fail("item_order deve ser um número inteiro ≥ 1");

  const quantity = parseDecimalOrInvalid(s(raw, "quantity"));
  if (quantity === INVALID || quantity <= 0) fail("quantity deve ser um número maior que zero");

  if (!(FOOD_UNITS as readonly string[]).includes(unit_raw)) {
    fail(`unit inválido: "${s(raw, "unit")}" (use um de: ${FOOD_UNITS.join(", ")}, ou "L" para litro)`);
  }

  const grams_equivalent = parseDecimalOrInvalid(s(raw, "grams_equivalent"));
  if (grams_equivalent === INVALID || grams_equivalent <= 0) {
    fail("grams_equivalent deve ser um número maior que zero");
  }

  const calories = parseDecimalOrInvalid(s(raw, "calories"));
  if (calories === INVALID || calories < 0) fail("calories deve ser um número ≥ 0");
  const protein_g = parseDecimalOrInvalid(s(raw, "protein_g"));
  if (protein_g === INVALID || protein_g < 0) fail("protein_g deve ser um número ≥ 0");
  const carbs_g = parseDecimalOrInvalid(s(raw, "carbs_g"));
  if (carbs_g === INVALID || carbs_g < 0) fail("carbs_g deve ser um número ≥ 0");
  const fat_g = parseDecimalOrInvalid(s(raw, "fat_g"));
  if (fat_g === INVALID || fat_g < 0) fail("fat_g deve ser um número ≥ 0");

  if (errors.length > 0) return { row: null, errors, warnings };

  return {
    row: {
      rowNumber,
      diet_code,
      diet_name,
      diet_type,
      meal_name,
      meal_order: meal_order as number,
      meal_time,
      item_order: item_order as number,
      item: {
        order_index: 0, // preenchido em groupAndCrossValidateRows
        food_id: null,
        food_name,
        quantity: quantity as number,
        unit: unit_raw as FoodUnit,
        grams_equivalent: grams_equivalent as number,
        calories: calories as number,
        protein_g: protein_g as number,
        carbs_g: carbs_g as number,
        fat_g: fat_g as number,
        notes: notes || null,
      },
    },
    errors,
    warnings,
  };
}

/** Regras cruzadas entre linhas (Fase 0, seção 21.2, itens 2 a 4). */
function groupAndCrossValidateRows(rows: ParsedRow[]): {
  diets: DietCsvInput[];
  errors: CsvRowIssue[];
  warnings: CsvRowIssue[];
} {
  const errors: CsvRowIssue[] = [];
  const warnings: CsvRowIssue[] = [];

  const dietOrder: string[] = [];
  const byCode = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    if (!byCode.has(row.diet_code)) {
      byCode.set(row.diet_code, []);
      dietOrder.push(row.diet_code);
    }
    byCode.get(row.diet_code)!.push(row);
  }

  const diets: DietCsvInput[] = [];

  for (const code of dietOrder) {
    const dietRows = byCode.get(code)!;
    const name = dietRows[0].diet_name;
    const dietType = dietRows[0].diet_type;

    for (const row of dietRows) {
      if (row.diet_name !== name) {
        errors.push({
          row: row.rowNumber,
          message: `diet_name inconsistente para o código "${code}" (esperado "${name}", encontrado "${row.diet_name}")`,
        });
      }
      if (row.diet_type !== dietType) {
        errors.push({
          row: row.rowNumber,
          message: `diet_type inconsistente para o código "${code}" (esperado "${dietType}", encontrado "${row.diet_type}")`,
        });
      }
    }

    // meal_order deve ser consistente para o mesmo meal_name (regra 21.2.3).
    const orderByMealName = new Map<string, number>();
    for (const row of dietRows) {
      const existing = orderByMealName.get(row.meal_name);
      if (existing === undefined) {
        orderByMealName.set(row.meal_name, row.meal_order);
      } else if (existing !== row.meal_order) {
        errors.push({
          row: row.rowNumber,
          message: `meal_order inconsistente para a refeição "${row.meal_name}" (esperado ${existing}, encontrado ${row.meal_order})`,
        });
      }
    }

    const mealOrderKeys: number[] = [];
    const byMealOrder = new Map<number, ParsedRow[]>();
    for (const row of dietRows) {
      if (!byMealOrder.has(row.meal_order)) {
        byMealOrder.set(row.meal_order, []);
        mealOrderKeys.push(row.meal_order);
      }
      byMealOrder.get(row.meal_order)!.push(row);
    }
    mealOrderKeys.sort((a, b) => a - b);

    const meals: DietCsvImportMeal[] = [];

    mealOrderKeys.forEach((mealOrder, mealIndex) => {
      const mealRows = byMealOrder.get(mealOrder)!;
      const mealName = mealRows[0].meal_name;
      const mealTime = mealRows[0].meal_time;

      for (const row of mealRows) {
        if (row.meal_time !== mealTime) {
          warnings.push({
            row: row.rowNumber,
            message: `meal_time divergente para a refeição "${mealName}" — usando o horário da primeira linha ("${mealTime ?? "vazio"}")`,
          });
        }
      }

      // item_order sequencial dentro da refeição, começando em 1 (regra 21.2.4).
      const sortedByItemOrder = [...mealRows].sort((a, b) => a.item_order - b.item_order);
      sortedByItemOrder.forEach((row, i) => {
        if (row.item_order !== i + 1) {
          errors.push({
            row: row.rowNumber,
            message: `item_order da refeição "${mealName}" deve ser sequencial começando em 1, sem lacunas nem repetição`,
          });
        }
      });

      meals.push({
        order_index: mealIndex,
        name: mealName,
        meal_time: mealTime,
        items: sortedByItemOrder.map((row, i) => ({ ...row.item, order_index: i })),
      });
    });

    diets.push({ code, name, diet_type: dietType as DietType, meals });
  }

  return { diets, errors, warnings };
}

export function parseDietCsv(csvText: string): DietCsvParseResult {
  const errors: CsvRowIssue[] = [];
  const warnings: CsvRowIssue[] = [];

  const parsed = Papa.parse<DietCsvRawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  for (const e of parsed.errors) {
    errors.push({ row: (e.row ?? 0) + 2, message: `Erro ao ler CSV: ${e.message}` });
  }

  const fields = parsed.meta.fields ?? [];
  const missingColumns = DIET_CSV_COLUMNS.filter((c) => !fields.includes(c));
  if (missingColumns.length > 0) {
    errors.push({
      row: 1,
      message: `Cabeçalho incompleto — faltando: ${missingColumns.join(", ")}`,
    });
    return { diets: [], errors, warnings };
  }

  const extraColumns = fields.filter((f) => !(DIET_CSV_COLUMNS as readonly string[]).includes(f));
  if (extraColumns.length > 0) {
    warnings.push({
      row: 1,
      message: `Colunas não reconhecidas (ignoradas): ${extraColumns.join(", ")}`,
    });
  }

  if (parsed.data.length === 0) {
    errors.push({ row: 1, message: "O CSV não tem nenhuma linha de dados." });
    return { diets: [], errors, warnings };
  }

  const parsedRows: ParsedRow[] = [];
  parsed.data.forEach((raw, idx) => {
    const rowNumber = idx + 2; // linha 1 = cabeçalho
    const result = parseDietCsvRow(raw, rowNumber);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (result.row) parsedRows.push(result.row);
  });

  if (errors.length > 0) {
    return { diets: [], errors, warnings };
  }

  const grouped = groupAndCrossValidateRows(parsedRows);
  errors.push(...grouped.errors);
  warnings.push(...grouped.warnings);

  return { diets: errors.length > 0 ? [] : grouped.diets, errors, warnings };
}
