import Papa from "papaparse";
import {
  MUSCLE_GROUPS,
  METRIC_TYPES,
  GROUP_TYPES,
  TECHNIQUES,
  type MuscleGroup,
  type MetricType,
  type GroupType,
  type Technique,
} from "@/lib/workout/vocabulary";

/**
 * Parsing e validação do CSV de treino (Fase 0, seção 20). Este módulo é
 * "isomórfico" — não tem "use client" nem "use server" — e é chamado tanto
 * pelo preview no navegador quanto pela Server Action, com o MESMO texto de
 * CSV bruto. Isso garante que o servidor nunca confia no agrupamento
 * calculado pelo cliente: ele reparseia o texto original do zero.
 */

/** Ordem e nomes exatos das colunas do CSV oficial de treino (Fase 0, 20.1). */
export const WORKOUT_CSV_COLUMNS = [
  "workout_code",
  "workout_name",
  "exercise_order",
  "group_type",
  "group_id",
  "group_order",
  "exercise_name",
  "muscle_group",
  "category",
  "exercise_type",
  "sets",
  "reps_min",
  "reps_max",
  "initial_load_kg",
  "duration_target_seconds",
  "distance_target_meters",
  "unit",
  "rest_seconds",
  "technique",
  "notes",
  "image_url",
  "gif_url",
  "video_url",
] as const;

export type WorkoutCsvRawRow = Record<string, string | undefined>;

export type WorkoutCsvImportItem = {
  order_index: number;
  group_type: GroupType;
  group_id: string | null;
  group_order: number | null;
  exercise_name: string;
  muscle_group: MuscleGroup;
  category: string | null;
  exercise_type: MetricType;
  sets: number;
  reps_min: number | null;
  reps_max: number | null;
  initial_load_kg: number | null;
  duration_target_seconds: number | null;
  distance_target_meters: number | null;
  unit: string;
  rest_seconds: number;
  technique: Technique;
  notes: string | null;
  image_url: string | null;
  gif_url: string | null;
  video_url: string | null;
};

export type WorkoutCsvInput = {
  code: string;
  name: string;
  items: WorkoutCsvImportItem[];
};

export type CsvRowIssue = { row: number; message: string };

export type WorkoutCsvParseResult = {
  workouts: WorkoutCsvInput[];
  errors: CsvRowIssue[];
  warnings: CsvRowIssue[];
};

function s(raw: WorkoutCsvRawRow, key: string): string {
  return (raw[key] ?? "").trim();
}

const INVALID = Symbol("invalid");
type Invalid = typeof INVALID;

function parseIntOrNull(value: string): number | null | Invalid {
  if (value === "") return null;
  if (!/^-?\d+$/.test(value)) return INVALID;
  return Number.parseInt(value, 10);
}

function parseDecimalOrNull(value: string): number | null | Invalid {
  if (value === "") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : INVALID;
}

type ParsedRow = {
  rowNumber: number;
  workout_code: string;
  workout_name: string;
  exercise_order: number;
  item: WorkoutCsvImportItem;
};

function parseWorkoutCsvRow(
  raw: WorkoutCsvRawRow,
  rowNumber: number
): { row: ParsedRow | null; errors: CsvRowIssue[]; warnings: CsvRowIssue[] } {
  const errors: CsvRowIssue[] = [];
  const warnings: CsvRowIssue[] = [];
  const fail = (message: string) => errors.push({ row: rowNumber, message });

  const workout_code = s(raw, "workout_code");
  const workout_name = s(raw, "workout_name");
  const exercise_name = s(raw, "exercise_name");
  const category = s(raw, "category");
  const unit = s(raw, "unit");
  const technique = s(raw, "technique");
  const notes = s(raw, "notes");
  const image_url = s(raw, "image_url");
  const gif_url = s(raw, "gif_url");
  const video_url = s(raw, "video_url");

  if (!workout_code) fail("workout_code é obrigatório");
  if (!workout_name) fail("workout_name é obrigatório");
  if (!exercise_name) fail("exercise_name é obrigatório");

  const muscle_group = s(raw, "muscle_group");
  if (!(MUSCLE_GROUPS as readonly string[]).includes(muscle_group)) {
    fail(`muscle_group inválido: "${muscle_group}" (use um de: ${MUSCLE_GROUPS.join(", ")})`);
  }

  const exercise_type = s(raw, "exercise_type");
  if (!(METRIC_TYPES as readonly string[]).includes(exercise_type)) {
    fail(`exercise_type inválido: "${exercise_type}" (use um de: ${METRIC_TYPES.join(", ")})`);
  }

  const group_type = s(raw, "group_type");
  if (!(GROUP_TYPES as readonly string[]).includes(group_type)) {
    fail(`group_type inválido: "${group_type}" (use um de: ${GROUP_TYPES.join(", ")})`);
  }

  if (technique && !(TECHNIQUES as readonly string[]).includes(technique)) {
    fail(`technique inválido: "${technique}" (use um de: ${TECHNIQUES.join(", ")})`);
  }

  const exercise_order = parseIntOrNull(s(raw, "exercise_order"));
  if (exercise_order === INVALID || exercise_order === null || exercise_order < 1) {
    fail("exercise_order deve ser um número inteiro ≥ 1");
  }

  const group_order = parseIntOrNull(s(raw, "group_order"));
  if (group_order === INVALID) fail("group_order deve ser um número inteiro");
  if (group_type !== "single" && (group_order === null || group_order === INVALID || group_order < 1)) {
    fail("group_order é obrigatório (≥ 1) quando group_type ≠ single");
  }

  const group_id = s(raw, "group_id") || null;
  if (group_type !== "single" && !group_id) {
    fail("group_id é obrigatório quando group_type ≠ single");
  }
  if (group_type === "single" && (group_id || (group_order !== null && group_order !== INVALID))) {
    fail("group_id/group_order devem ficar vazios quando group_type = single");
  }

  const sets = parseIntOrNull(s(raw, "sets"));
  if (sets === INVALID || sets === null || sets < 1) fail("sets deve ser um número inteiro ≥ 1");

  const reps_min = parseIntOrNull(s(raw, "reps_min"));
  if (reps_min === INVALID) fail("reps_min deve ser um número inteiro");
  const reps_max = parseIntOrNull(s(raw, "reps_max"));
  if (reps_max === INVALID) fail("reps_max deve ser um número inteiro");

  const usesReps = exercise_type === "musculacao" || exercise_type === "peso_corporal";
  if (usesReps) {
    if (reps_min === null) fail("reps_min é obrigatório para musculacao/peso_corporal");
    if (reps_max === null) fail("reps_max é obrigatório para musculacao/peso_corporal");
  }
  if (typeof reps_min === "number" && typeof reps_max === "number" && reps_max < reps_min) {
    fail("reps_max deve ser ≥ reps_min");
  }

  const initial_load_kg = parseDecimalOrNull(s(raw, "initial_load_kg"));
  if (initial_load_kg === INVALID) fail("initial_load_kg deve ser um número");

  const duration_target_seconds = parseIntOrNull(s(raw, "duration_target_seconds"));
  if (duration_target_seconds === INVALID) fail("duration_target_seconds deve ser um número inteiro");
  const usesDuration =
    exercise_type === "isometrico" || exercise_type === "corrida" || exercise_type === "esteira";
  if (
    usesDuration &&
    (duration_target_seconds === null || duration_target_seconds === INVALID || duration_target_seconds < 1)
  ) {
    fail("duration_target_seconds é obrigatório (≥ 1) para isometrico/corrida/esteira");
  }

  const distance_target_meters = parseDecimalOrNull(s(raw, "distance_target_meters"));
  if (distance_target_meters === INVALID) fail("distance_target_meters deve ser um número");
  const usesDistance = exercise_type === "corrida" || exercise_type === "esteira";
  if (usesDistance && distance_target_meters === null) {
    fail("distance_target_meters é obrigatório para corrida/esteira");
  }

  if (unit && unit !== "kg") {
    warnings.push({
      row: rowNumber,
      message: `unit "${unit}" ainda não é suportado — será tratado como "kg"`,
    });
  }

  const rest_seconds = parseIntOrNull(s(raw, "rest_seconds"));
  if (rest_seconds === INVALID || rest_seconds === null || rest_seconds < 0) {
    fail("rest_seconds é obrigatório e deve ser ≥ 0");
  }

  if (errors.length > 0) return { row: null, errors, warnings };

  return {
    row: {
      rowNumber,
      workout_code,
      workout_name,
      exercise_order: exercise_order as number,
      item: {
        order_index: 0, // preenchido em groupAndCrossValidateRows
        group_type: group_type as GroupType,
        group_id,
        group_order: typeof group_order === "number" ? group_order : null,
        exercise_name,
        muscle_group: muscle_group as MuscleGroup,
        category: category || null,
        exercise_type: exercise_type as MetricType,
        sets: sets as number,
        reps_min: typeof reps_min === "number" ? reps_min : null,
        reps_max: typeof reps_max === "number" ? reps_max : null,
        initial_load_kg: typeof initial_load_kg === "number" ? initial_load_kg : null,
        duration_target_seconds:
          typeof duration_target_seconds === "number" ? duration_target_seconds : null,
        distance_target_meters:
          typeof distance_target_meters === "number" ? distance_target_meters : null,
        unit: "kg",
        rest_seconds: rest_seconds as number,
        technique: (technique || "normal") as Technique,
        notes: notes || null,
        image_url: image_url || null,
        gif_url: gif_url || null,
        video_url: video_url || null,
      },
    },
    errors,
    warnings,
  };
}

/** Regras cruzadas entre linhas (Fase 0, seção 20.2, itens 2 a 8). */
function groupAndCrossValidateRows(rows: ParsedRow[]): {
  workouts: WorkoutCsvInput[];
  errors: CsvRowIssue[];
  warnings: CsvRowIssue[];
} {
  const errors: CsvRowIssue[] = [];
  const warnings: CsvRowIssue[] = [];

  const workoutOrder: string[] = [];
  const byCode = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    if (!byCode.has(row.workout_code)) {
      byCode.set(row.workout_code, []);
      workoutOrder.push(row.workout_code);
    }
    byCode.get(row.workout_code)!.push(row);
  }

  const workouts: WorkoutCsvInput[] = [];

  for (const code of workoutOrder) {
    const workoutRows = byCode.get(code)!;
    const name = workoutRows[0].workout_name;
    for (const row of workoutRows) {
      if (row.workout_name !== name) {
        errors.push({
          row: row.rowNumber,
          message: `workout_name inconsistente para o código "${code}" (esperado "${name}", encontrado "${row.workout_name}")`,
        });
      }
    }

    const blockOrder: number[] = [];
    const byOrder = new Map<number, ParsedRow[]>();
    for (const row of workoutRows) {
      if (!byOrder.has(row.exercise_order)) {
        byOrder.set(row.exercise_order, []);
        blockOrder.push(row.exercise_order);
      }
      byOrder.get(row.exercise_order)!.push(row);
    }
    blockOrder.sort((a, b) => a - b);

    const items: WorkoutCsvImportItem[] = [];
    let blockIndex = 0;

    for (const orderKey of blockOrder) {
      const block = byOrder.get(orderKey)!;
      const groupType = block[0].item.group_type;
      const groupId = block[0].item.group_id;

      for (const row of block) {
        if (row.item.group_type !== groupType || row.item.group_id !== groupId) {
          errors.push({
            row: row.rowNumber,
            message: `Linhas com exercise_order=${orderKey} têm group_type/group_id divergentes — devem ser iguais dentro do mesmo bloco`,
          });
        }
      }

      if (groupType === "single") {
        if (block.length > 1) {
          errors.push({
            row: block[1].rowNumber,
            message: `exercise_order=${orderKey}: group_type=single não pode ter mais de uma linha`,
          });
        }
      } else {
        if (groupType === "biset" && block.length !== 2) {
          errors.push({
            row: block[0].rowNumber,
            message: `group_id "${groupId}" (biset) precisa ter exatamente 2 linhas — encontrado ${block.length}`,
          });
        } else if (groupType !== "biset" && block.length < 3) {
          errors.push({
            row: block[0].rowNumber,
            message: `group_id "${groupId}" (${groupType}) precisa ter pelo menos 3 linhas — encontrado ${block.length}`,
          });
        }

        const sortedByGroupOrder = [...block].sort(
          (a, b) => (a.item.group_order ?? 0) - (b.item.group_order ?? 0)
        );
        sortedByGroupOrder.forEach((row, i) => {
          if (row.item.group_order !== i + 1) {
            errors.push({
              row: row.rowNumber,
              message: `group_order do bloco "${groupId}" deve ser sequencial começando em 1, sem lacunas nem repetição`,
            });
          }
        });
        block.sort((a, b) => (a.item.group_order ?? 0) - (b.item.group_order ?? 0));
      }

      for (const row of block) {
        items.push({ ...row.item, order_index: blockIndex });
      }
      blockIndex += 1;
    }

    workouts.push({ code, name, items });
  }

  return { workouts, errors, warnings };
}

export function parseWorkoutCsv(csvText: string): WorkoutCsvParseResult {
  const errors: CsvRowIssue[] = [];
  const warnings: CsvRowIssue[] = [];

  const parsed = Papa.parse<WorkoutCsvRawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  for (const e of parsed.errors) {
    errors.push({ row: (e.row ?? 0) + 2, message: `Erro ao ler CSV: ${e.message}` });
  }

  const fields = parsed.meta.fields ?? [];
  const missingColumns = WORKOUT_CSV_COLUMNS.filter((c) => !fields.includes(c));
  if (missingColumns.length > 0) {
    errors.push({
      row: 1,
      message: `Cabeçalho incompleto — faltando: ${missingColumns.join(", ")}`,
    });
    return { workouts: [], errors, warnings };
  }

  const extraColumns = fields.filter((f) => !(WORKOUT_CSV_COLUMNS as readonly string[]).includes(f));
  if (extraColumns.length > 0) {
    warnings.push({
      row: 1,
      message: `Colunas não reconhecidas (ignoradas): ${extraColumns.join(", ")}`,
    });
  }

  if (parsed.data.length === 0) {
    errors.push({ row: 1, message: "O CSV não tem nenhuma linha de dados." });
    return { workouts: [], errors, warnings };
  }

  const parsedRows: ParsedRow[] = [];
  parsed.data.forEach((raw, idx) => {
    const rowNumber = idx + 2; // linha 1 = cabeçalho
    const result = parseWorkoutCsvRow(raw, rowNumber);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (result.row) parsedRows.push(result.row);
  });

  if (errors.length > 0) {
    return { workouts: [], errors, warnings };
  }

  const grouped = groupAndCrossValidateRows(parsedRows);
  errors.push(...grouped.errors);
  warnings.push(...grouped.warnings);

  return { workouts: errors.length > 0 ? [] : grouped.workouts, errors, warnings };
}
