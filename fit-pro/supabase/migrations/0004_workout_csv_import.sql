-- Fit-Pro — Fase 2 (parte 3): importação de CSV de treino
-- Execute no SQL Editor do Supabase, depois de 0001/0002/0003.

-- Coluna prevista desde a Fase 0 (seção 20.1: "unit ... coluna existe para
-- permitir lb no futuro sem migration"), mas que a migration 0003 ainda não
-- tinha criado. Hoje só "kg" é suportado (telas e CSV usam kg fixo no MVP);
-- quando "lb" for suportado, basta soltar o check abaixo e adicionar a
-- conversão — nenhuma migration nova de estrutura será necessária.
alter table public.workout_template_items
  add column if not exists unit text not null default 'kg';

alter table public.workout_template_items
  drop constraint if exists workout_template_items_unit_check;

alter table public.workout_template_items
  add constraint workout_template_items_unit_check check (unit = 'kg');

-- Auditoria de importações de CSV (Fase 0, seção 7 — "csv_import_batches").
-- Registra só importações bem-sucedidas: se algo falhar no meio, a função
-- abaixo faz a transação inteira dar rollback (inclusive um eventual
-- registro de auditoria), então o erro chega para o usuário via a própria
-- mensagem de exceção — não há uma entrada "com erro" para consultar depois.
create table if not exists public.csv_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text,
  workouts_count int not null default 0,
  items_count int not null default 0,
  exercises_created_count int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.csv_import_batches is
  'Auditoria de importações de CSV de treino bem-sucedidas (Fase 0, seção 7).';

alter table public.csv_import_batches enable row level security;

create policy "csv_import_batches: select own"
  on public.csv_import_batches for select
  using (auth.uid() = user_id);

create policy "csv_import_batches: insert own"
  on public.csv_import_batches for insert
  with check (auth.uid() = user_id);

-- Importa um CSV de treino já parseado e validado no formato oficial
-- (Fase 0, seção 20). Faz tudo numa única transação (Fase 0, seção 22.7):
--   1. Para cada treino (workout_code), cria o template ou reaproveita um
--      existente com o mesmo código (reimportar um CSV revisado atualiza o
--      treino, em vez de duplicar — mesma ideia de "current state" dos
--      templates editáveis, Fase 0 seção 8).
--   2. Para cada exercício, procura na biblioteca do usuário por nome
--      (case-insensitive); se não existir, cria. Nunca sobrescreve um
--      exercício já cadastrado (evita que uma reimportação apague edições
--      manuais feitas na Biblioteca).
--   3. Substitui os itens do template pelos itens do CSV (mesma lógica de
--      replace_template_items da migration 0003).
-- SECURITY INVOKER (padrão do projeto): roda com a identidade e a RLS de
-- quem chamou, nunca com privilégio elevado.
create or replace function public.import_workout_csv(p_file_name text, p_workouts jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_workout jsonb;
  v_item jsonb;
  v_template_id uuid;
  v_exercise_id uuid;
  v_order_index int;
  v_templates_result jsonb := '[]'::jsonb;
  v_workouts_count int := 0;
  v_items_count int := 0;
  v_exercises_created int := 0;
begin
  if p_workouts is null or jsonb_array_length(p_workouts) = 0 then
    raise exception 'Nenhum treino para importar';
  end if;

  for v_workout in select * from jsonb_array_elements(p_workouts)
  loop
    v_workouts_count := v_workouts_count + 1;

    select id into v_template_id
    from public.workout_templates
    where user_id = auth.uid()
      and code = (v_workout ->> 'code')
      and deleted_at is null;

    if v_template_id is null then
      insert into public.workout_templates (user_id, name, code)
      values (auth.uid(), v_workout ->> 'name', v_workout ->> 'code')
      returning id into v_template_id;
    else
      update public.workout_templates
      set name = v_workout ->> 'name'
      where id = v_template_id;

      delete from public.workout_template_items where template_id = v_template_id;
    end if;

    for v_item in select * from jsonb_array_elements(v_workout -> 'items')
    loop
      select id into v_exercise_id
      from public.exercises
      where user_id = auth.uid()
        and deleted_at is null
        and lower(name) = lower(v_item ->> 'exercise_name')
      limit 1;

      if v_exercise_id is null then
        insert into public.exercises (
          user_id, name, muscle_group, category, metric_type, image_url, gif_url, video_url
        )
        values (
          auth.uid(),
          v_item ->> 'exercise_name',
          v_item ->> 'muscle_group',
          nullif(v_item ->> 'category', ''),
          v_item ->> 'exercise_type',
          nullif(v_item ->> 'image_url', ''),
          nullif(v_item ->> 'gif_url', ''),
          nullif(v_item ->> 'video_url', '')
        )
        returning id into v_exercise_id;
        v_exercises_created := v_exercises_created + 1;
      end if;

      v_order_index := (v_item ->> 'order_index')::int;

      insert into public.workout_template_items (
        template_id, user_id, order_index, group_type, group_id, group_order, exercise_id,
        sets, reps_min, reps_max, duration_target_seconds, distance_target_meters,
        initial_load_kg, rest_seconds, technique, notes
      )
      values (
        v_template_id, auth.uid(), v_order_index,
        v_item ->> 'group_type',
        nullif(v_item ->> 'group_id', ''),
        nullif(v_item ->> 'group_order', '')::int,
        v_exercise_id,
        (v_item ->> 'sets')::int,
        nullif(v_item ->> 'reps_min', '')::int,
        nullif(v_item ->> 'reps_max', '')::int,
        nullif(v_item ->> 'duration_target_seconds', '')::int,
        nullif(v_item ->> 'distance_target_meters', '')::numeric,
        nullif(v_item ->> 'initial_load_kg', '')::numeric,
        (v_item ->> 'rest_seconds')::int,
        nullif(v_item ->> 'technique', ''),
        nullif(v_item ->> 'notes', '')
      );

      v_items_count := v_items_count + 1;
    end loop;

    v_templates_result := v_templates_result || jsonb_build_object(
      'id', v_template_id,
      'code', v_workout ->> 'code',
      'name', v_workout ->> 'name'
    );
  end loop;

  insert into public.csv_import_batches (
    user_id, file_name, workouts_count, items_count, exercises_created_count
  )
  values (auth.uid(), p_file_name, v_workouts_count, v_items_count, v_exercises_created);

  return jsonb_build_object(
    'templates', v_templates_result,
    'workouts_count', v_workouts_count,
    'items_count', v_items_count,
    'exercises_created_count', v_exercises_created
  );
end;
$$;
