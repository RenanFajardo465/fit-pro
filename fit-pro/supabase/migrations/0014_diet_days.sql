-- Fit-Pro — Fase 5, Incremento 4: diário do dia (dieta selecionada + checklist
-- de consumo + itens extra).
-- Execute no SQL Editor do Supabase, depois de 0013.
-- Referência: FASE0_ARQUITETURA_FITPRO.md, seções 6.6, 8 e 337-338.
--
-- Selecionar uma dieta pra uma data COPIA a dieta inteira (refeições +
-- itens) pra diet_days/diet_day_meals/diet_day_items naquele instante —
-- exatamente como start_workout_session faz com o template de treino
-- (Fase 0, seção 8). A partir daí, o diário nunca mais consulta a dieta
-- original pra exibir o planejado; editar a dieta depois não muda um dia
-- já registrado.

create table if not exists public.diet_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  -- Nullable + ON DELETE SET NULL (Fase 0, seção 8/9): apagar a dieta
  -- original depois nunca quebra um dia já registrado, que já tem sua
  -- própria cópia completa.
  diet_template_id uuid references public.diet_templates (id) on delete set null,
  diet_name text not null,
  diet_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Só uma dieta selecionada por dia. Trocar de dieta num dia exige
  -- remover a atual primeiro (remove_diet_day) — decisão deliberada pra
  -- não perder consumo já registrado silenciosamente numa troca.
  unique (user_id, date)
);

create index if not exists diet_days_user_date_idx on public.diet_days (user_id, date);

drop trigger if exists set_diet_days_updated_at on public.diet_days;
create trigger set_diet_days_updated_at
  before update on public.diet_days
  for each row
  execute function public.set_updated_at();

alter table public.diet_days enable row level security;

create policy "diet_days: select own"
  on public.diet_days for select using (auth.uid() = user_id);
create policy "diet_days: insert own"
  on public.diet_days for insert with check (auth.uid() = user_id);
create policy "diet_days: update own"
  on public.diet_days for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diet_days: delete own"
  on public.diet_days for delete using (auth.uid() = user_id);

create table if not exists public.diet_day_meals (
  id uuid primary key default gen_random_uuid(),
  diet_day_id uuid not null references public.diet_days (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_index int not null,
  name text not null,
  meal_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diet_day_meals_day_idx on public.diet_day_meals (diet_day_id, order_index);

drop trigger if exists set_diet_day_meals_updated_at on public.diet_day_meals;
create trigger set_diet_day_meals_updated_at
  before update on public.diet_day_meals
  for each row
  execute function public.set_updated_at();

alter table public.diet_day_meals enable row level security;

create policy "diet_day_meals: select own"
  on public.diet_day_meals for select using (auth.uid() = user_id);
create policy "diet_day_meals: insert own"
  on public.diet_day_meals for insert with check (auth.uid() = user_id);
create policy "diet_day_meals: update own"
  on public.diet_day_meals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diet_day_meals: delete own"
  on public.diet_day_meals for delete using (auth.uid() = user_id);

-- Itens planejados do dia (cópia de diet_meal_items) + campos de consumo.
-- consumed_quantity NULL = ainda não marcado como consumido.
-- consumed_calories/protein_g/carbs_g/fat_g são os macros planejados ×
-- (consumed_quantity / quantity) — proporcional (Fase 0, seção 337),
-- recalculados e congelados a cada mudança via set_item_consumption.
create table if not exists public.diet_day_items (
  id uuid primary key default gen_random_uuid(),
  diet_day_meal_id uuid not null references public.diet_day_meals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_index int not null,
  food_id uuid references public.foods (id) on delete set null,
  food_name text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  grams_equivalent numeric not null check (grams_equivalent > 0),
  calories numeric not null check (calories >= 0),
  protein_g numeric not null check (protein_g >= 0),
  carbs_g numeric not null check (carbs_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  notes text,
  consumed_quantity numeric check (consumed_quantity is null or consumed_quantity >= 0),
  consumed_at timestamptz,
  consumed_calories numeric check (consumed_calories is null or consumed_calories >= 0),
  consumed_protein_g numeric check (consumed_protein_g is null or consumed_protein_g >= 0),
  consumed_carbs_g numeric check (consumed_carbs_g is null or consumed_carbs_g >= 0),
  consumed_fat_g numeric check (consumed_fat_g is null or consumed_fat_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diet_day_items_meal_idx on public.diet_day_items (diet_day_meal_id, order_index);

drop trigger if exists set_diet_day_items_updated_at on public.diet_day_items;
create trigger set_diet_day_items_updated_at
  before update on public.diet_day_items
  for each row
  execute function public.set_updated_at();

alter table public.diet_day_items enable row level security;

create policy "diet_day_items: select own"
  on public.diet_day_items for select using (auth.uid() = user_id);
create policy "diet_day_items: insert own"
  on public.diet_day_items for insert with check (auth.uid() = user_id);
create policy "diet_day_items: update own"
  on public.diet_day_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diet_day_items: delete own"
  on public.diet_day_items for delete using (auth.uid() = user_id);

-- Itens consumidos FORA da dieta do dia (Fase 0, seção 338) — podem vir de
-- um alimento da biblioteca, de uma receita, ou ser digitados na mão
-- ("custom"). Sempre com macros já calculados e congelados, nunca alteram
-- a dieta original.
create table if not exists public.extra_food_logs (
  id uuid primary key default gen_random_uuid(),
  diet_day_id uuid not null references public.diet_days (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('food', 'recipe', 'custom')),
  food_id uuid references public.foods (id) on delete set null,
  recipe_id uuid references public.recipes (id) on delete set null,
  name text not null check (char_length(btrim(name)) > 0),
  quantity numeric not null default 1 check (quantity > 0),
  calories numeric not null check (calories >= 0),
  protein_g numeric not null check (protein_g >= 0),
  carbs_g numeric not null check (carbs_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source = 'food' and recipe_id is null)
    or (source = 'recipe' and food_id is null)
    or (source = 'custom' and food_id is null and recipe_id is null)
  )
);

create index if not exists extra_food_logs_day_idx on public.extra_food_logs (diet_day_id);

drop trigger if exists set_extra_food_logs_updated_at on public.extra_food_logs;
create trigger set_extra_food_logs_updated_at
  before update on public.extra_food_logs
  for each row
  execute function public.set_updated_at();

alter table public.extra_food_logs enable row level security;

create policy "extra_food_logs: select own"
  on public.extra_food_logs for select using (auth.uid() = user_id);
create policy "extra_food_logs: insert own"
  on public.extra_food_logs for insert with check (auth.uid() = user_id);
create policy "extra_food_logs: update own"
  on public.extra_food_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "extra_food_logs: delete own"
  on public.extra_food_logs for delete using (auth.uid() = user_id);

-- Seleciona uma dieta pra uma data: copia diet_meals/diet_meal_items
-- inteiros pra diet_day_meals/diet_day_items (snapshot, Fase 0 seção 8).
-- Falha se já existe um diet_day pra essa data (troca exige remoção
-- explícita primeiro — remove_diet_day/DELETE direto na linha).
create or replace function public.select_diet_for_day(p_date date, p_diet_template_id uuid)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_diet_name text;
  v_diet_type text;
  v_diet_day_id uuid;
  v_meal record;
  v_day_meal_id uuid;
begin
  if exists (select 1 from public.diet_days where user_id = auth.uid() and date = p_date) then
    raise exception 'Já existe uma dieta selecionada para esse dia';
  end if;

  select name, diet_type into v_diet_name, v_diet_type
  from public.diet_templates
  where id = p_diet_template_id and user_id = auth.uid() and deleted_at is null;

  if v_diet_name is null then
    raise exception 'Dieta não encontrada ou sem permissão';
  end if;

  insert into public.diet_days (user_id, date, diet_template_id, diet_name, diet_type)
  values (auth.uid(), p_date, p_diet_template_id, v_diet_name, v_diet_type)
  returning id into v_diet_day_id;

  for v_meal in
    select id, order_index, name, meal_time
    from public.diet_meals
    where diet_template_id = p_diet_template_id
    order by order_index asc
  loop
    insert into public.diet_day_meals (diet_day_id, user_id, order_index, name, meal_time)
    values (v_diet_day_id, auth.uid(), v_meal.order_index, v_meal.name, v_meal.meal_time)
    returning id into v_day_meal_id;

    insert into public.diet_day_items (
      diet_day_meal_id, user_id, order_index, food_id, food_name, quantity, unit,
      grams_equivalent, calories, protein_g, carbs_g, fat_g, notes
    )
    select
      v_day_meal_id, auth.uid(), dmi.order_index, dmi.food_id, dmi.food_name, dmi.quantity,
      dmi.unit, dmi.grams_equivalent, dmi.calories, dmi.protein_g, dmi.carbs_g, dmi.fat_g, dmi.notes
    from public.diet_meal_items dmi
    where dmi.diet_meal_id = v_meal.id
    order by dmi.order_index asc;
  end loop;

  return v_diet_day_id;
end;
$$;

-- Marca (ou desmarca) o consumo de UM item, com quantidade parcial —
-- recalcula e congela os macros consumidos proporcionalmente (Fase 0,
-- seção 337: macros_planejados × consumido/planejado).
create or replace function public.set_item_consumption(p_item_id uuid, p_consumed_quantity numeric)
returns void
language plpgsql
security invoker
as $$
declare
  v_ratio numeric;
begin
  if p_consumed_quantity is not null and p_consumed_quantity < 0 then
    raise exception 'Quantidade consumida não pode ser negativa';
  end if;

  update public.diet_day_items
  set
    consumed_quantity = p_consumed_quantity,
    consumed_at = case when p_consumed_quantity is null then null else now() end,
    consumed_calories = case when p_consumed_quantity is null then null
      else round(calories * (p_consumed_quantity / quantity), 2) end,
    consumed_protein_g = case when p_consumed_quantity is null then null
      else round(protein_g * (p_consumed_quantity / quantity), 2) end,
    consumed_carbs_g = case when p_consumed_quantity is null then null
      else round(carbs_g * (p_consumed_quantity / quantity), 2) end,
    consumed_fat_g = case when p_consumed_quantity is null then null
      else round(fat_g * (p_consumed_quantity / quantity), 2) end
  where id = p_item_id and user_id = auth.uid();

  if not found then
    raise exception 'Item não encontrado ou sem permissão';
  end if;
end;
$$;

-- Marca (ou desmarca) TODOS os itens de uma refeição de uma vez
-- ("checklist por refeição inteira", Fase 0 seção 337) — sempre com a
-- quantidade planejada inteira (100% consumido), nunca parcial.
create or replace function public.set_meal_consumption(p_diet_day_meal_id uuid, p_consumed boolean)
returns void
language plpgsql
security invoker
as $$
begin
  if not exists (
    select 1 from public.diet_day_meals
    where id = p_diet_day_meal_id and user_id = auth.uid()
  ) then
    raise exception 'Refeição não encontrada ou sem permissão';
  end if;

  update public.diet_day_items
  set
    consumed_quantity = case when p_consumed then quantity else null end,
    consumed_at = case when p_consumed then now() else null end,
    consumed_calories = case when p_consumed then calories else null end,
    consumed_protein_g = case when p_consumed then protein_g else null end,
    consumed_carbs_g = case when p_consumed then carbs_g else null end,
    consumed_fat_g = case when p_consumed then fat_g else null end
  where diet_day_meal_id = p_diet_day_meal_id and user_id = auth.uid();
end;
$$;
