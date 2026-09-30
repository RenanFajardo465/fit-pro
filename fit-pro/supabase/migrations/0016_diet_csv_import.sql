-- Fit-Pro — Fase 5, Incremento 6: importação de CSV de dieta.
-- Execute no SQL Editor do Supabase, depois de 0013, 0014 e 0015.
-- Referência: FASE0_ARQUITETURA_FITPRO.md, seção 21 (CSV de Dieta).

-- Auditoria de importações bem-sucedidas — espelha csv_import_batches do
-- treino (migration 0004), com colunas próprias porque os termos são
-- diferentes ("diets"/"meals" em vez de "workouts"/"exercises").
create table if not exists public.diet_csv_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_name text,
  diets_count int not null default 0,
  meals_count int not null default 0,
  items_count int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.diet_csv_import_batches is
  'Auditoria de importações de CSV de dieta bem-sucedidas (Fase 0, seção 7 e 21). Só registra sucesso — falha no meio faz a transação inteira dar rollback.';

alter table public.diet_csv_import_batches enable row level security;

create policy "diet_csv_import_batches: select own"
  on public.diet_csv_import_batches for select
  using (auth.uid() = user_id);

create policy "diet_csv_import_batches: insert own"
  on public.diet_csv_import_batches for insert
  with check (auth.uid() = user_id);

-- Importa um CSV de dieta já parseado e validado no formato oficial (Fase 0,
-- seção 21). Para cada diet_code: cria a dieta ou reaproveita uma existente
-- com o mesmo código (reimportar um CSV revisado atualiza a dieta, em vez de
-- duplicar — mesma ideia de import_workout_csv), e delega a substituição de
-- refeições/itens para replace_diet_meals (migration 0013, já usada pelo
-- editor manual) — diet_meal_items nasceu espelhando exatamente as colunas
-- do CSV de propósito, então não há nenhuma tradução a fazer aqui.
-- SECURITY INVOKER (padrão do projeto): roda com a identidade e a RLS de
-- quem chamou.
create or replace function public.import_diet_csv(p_file_name text, p_diets jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_diet jsonb;
  v_meal jsonb;
  v_template_id uuid;
  v_templates_result jsonb := '[]'::jsonb;
  v_diets_count int := 0;
  v_meals_count int := 0;
  v_items_count int := 0;
begin
  if p_diets is null or jsonb_array_length(p_diets) = 0 then
    raise exception 'Nenhuma dieta para importar';
  end if;

  for v_diet in select * from jsonb_array_elements(p_diets)
  loop
    v_diets_count := v_diets_count + 1;

    select id into v_template_id
    from public.diet_templates
    where user_id = auth.uid()
      and code = (v_diet ->> 'code')
      and deleted_at is null;

    if v_template_id is null then
      insert into public.diet_templates (user_id, name, code, diet_type)
      values (auth.uid(), v_diet ->> 'name', v_diet ->> 'code', v_diet ->> 'diet_type')
      returning id into v_template_id;
    else
      update public.diet_templates
      set name = v_diet ->> 'name', diet_type = v_diet ->> 'diet_type'
      where id = v_template_id;
    end if;

    -- Substitui refeições + itens numa única transação (delete-then-reinsert
    -- já dentro de replace_diet_meals; ON DELETE CASCADE cuida dos itens).
    perform public.replace_diet_meals(v_template_id, v_diet -> 'meals');

    for v_meal in select * from jsonb_array_elements(v_diet -> 'meals')
    loop
      v_meals_count := v_meals_count + 1;
      v_items_count := v_items_count + jsonb_array_length(v_meal -> 'items');
    end loop;

    v_templates_result := v_templates_result || jsonb_build_object(
      'id', v_template_id,
      'code', v_diet ->> 'code',
      'name', v_diet ->> 'name'
    );
  end loop;

  insert into public.diet_csv_import_batches (
    user_id, file_name, diets_count, meals_count, items_count
  )
  values (auth.uid(), p_file_name, v_diets_count, v_meals_count, v_items_count);

  return jsonb_build_object(
    'templates', v_templates_result,
    'diets_count', v_diets_count,
    'meals_count', v_meals_count,
    'items_count', v_items_count
  );
end;
$$;
