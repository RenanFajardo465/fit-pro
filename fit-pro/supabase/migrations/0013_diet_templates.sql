-- Fit-Pro — Fase 5, Incremento 3: dietas (templates planejados).
-- Execute no SQL Editor do Supabase, depois de 0012.
-- Referência: FASE0_ARQUITETURA_FITPRO.md, seções 6.6, 8, 19 e 21 (CSV).
--
-- Esta entrega é só a ESTRUTURA PLANEJADA da dieta (refeições + itens),
-- igual ao workout_templates/workout_template_items do treino. Selecionar
-- uma dieta pra um dia específico (diet_days, com checklist de consumo e
-- itens extra) é o próximo incremento — aqui ainda não existe "hoje eu
-- comi X", só "essa dieta prevê X".
--
-- diet_meal_items usa o MESMO formato de colunas do CSV oficial de dieta
-- (quantity + unit + grams_equivalent + macros já calculados pra aquela
-- quantidade, não "por 100g") em vez do padrão quantity_servings usado em
-- recipe_items — decisão deliberada: assim a tabela já nasce no formato
-- que o importador de CSV (futuro incremento) vai inserir diretamente,
-- sem tradução. A tela de edição manual continua simples pro usuário
-- (escolhe o alimento e uma "quantidade em porções"), só que o resultado
-- já sai calculado no formato de colunas do CSV.

create table if not exists public.diet_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  code text not null check (char_length(btrim(code)) > 0 and char_length(code) <= 20),
  diet_type text not null check (
    diet_type in ('treino', 'descanso', 'futebol', 'muay_thai', 'treino_atividade', 'personalizado')
  ),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.diet_templates is
  'Dieta planejada (ex.: "Dieta Treino"). Editável livremente — quem preserva o histórico é o snapshot em diet_days (próximo incremento), não este template.';

-- Código único por usuário entre as dietas ativas (mesmo padrão de
-- workout_templates — permite reusar o código depois que a dieta antiga
-- foi para a lixeira).
create unique index if not exists diet_templates_user_code_idx
  on public.diet_templates (user_id, code)
  where deleted_at is null;

create index if not exists diet_templates_user_id_idx on public.diet_templates (user_id);

drop trigger if exists set_diet_templates_updated_at on public.diet_templates;
create trigger set_diet_templates_updated_at
  before update on public.diet_templates
  for each row
  execute function public.set_updated_at();

alter table public.diet_templates enable row level security;

create policy "diet_templates: select own"
  on public.diet_templates for select using (auth.uid() = user_id);
create policy "diet_templates: insert own"
  on public.diet_templates for insert with check (auth.uid() = user_id);
create policy "diet_templates: update own"
  on public.diet_templates for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diet_templates: delete own"
  on public.diet_templates for delete using (auth.uid() = user_id);

-- Refeições da dieta (ex.: "Café da manhã", ordem 1, horário 07:00).
create table if not exists public.diet_meals (
  id uuid primary key default gen_random_uuid(),
  diet_template_id uuid not null references public.diet_templates (id) on delete cascade,
  -- Denormalizado a partir da dieta, só para a RLS não precisar de JOIN
  -- (Fase 0, seção 7).
  user_id uuid not null references auth.users (id) on delete cascade,
  order_index int not null,
  name text not null check (char_length(btrim(name)) > 0),
  meal_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diet_meals_template_idx
  on public.diet_meals (diet_template_id, order_index);

drop trigger if exists set_diet_meals_updated_at on public.diet_meals;
create trigger set_diet_meals_updated_at
  before update on public.diet_meals
  for each row
  execute function public.set_updated_at();

alter table public.diet_meals enable row level security;

create policy "diet_meals: select own"
  on public.diet_meals for select using (auth.uid() = user_id);
create policy "diet_meals: insert own"
  on public.diet_meals for insert with check (auth.uid() = user_id);
create policy "diet_meals: update own"
  on public.diet_meals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diet_meals: delete own"
  on public.diet_meals for delete using (auth.uid() = user_id);

-- Itens de cada refeição. food_id fica nulo se o alimento de origem for
-- excluído definitivamente da biblioteca (Fase 0, seção 8/9) — food_name e
-- os macros já congelados continuam intactos.
create table if not exists public.diet_meal_items (
  id uuid primary key default gen_random_uuid(),
  diet_meal_id uuid not null references public.diet_meals (id) on delete cascade,
  -- Denormalizado a partir da refeição, só para a RLS não precisar de JOIN.
  user_id uuid not null references auth.users (id) on delete cascade,
  order_index int not null,
  food_id uuid references public.foods (id) on delete set null,
  food_name text not null check (char_length(btrim(food_name)) > 0),
  quantity numeric not null check (quantity > 0),
  unit text not null check (
    unit in (
      'g', 'kg', 'ml', 'l', 'unidade', 'fatia', 'colher', 'colher_cha',
      'colher_sopa', 'xicara', 'porcao', 'scoop', 'pacote'
    )
  ),
  grams_equivalent numeric not null check (grams_equivalent > 0),
  calories numeric not null check (calories >= 0),
  protein_g numeric not null check (protein_g >= 0),
  carbs_g numeric not null check (carbs_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diet_meal_items_meal_idx
  on public.diet_meal_items (diet_meal_id, order_index);

drop trigger if exists set_diet_meal_items_updated_at on public.diet_meal_items;
create trigger set_diet_meal_items_updated_at
  before update on public.diet_meal_items
  for each row
  execute function public.set_updated_at();

alter table public.diet_meal_items enable row level security;

create policy "diet_meal_items: select own"
  on public.diet_meal_items for select using (auth.uid() = user_id);
create policy "diet_meal_items: insert own"
  on public.diet_meal_items for insert with check (auth.uid() = user_id);
create policy "diet_meal_items: update own"
  on public.diet_meal_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diet_meal_items: delete own"
  on public.diet_meal_items for delete using (auth.uid() = user_id);

-- Substitui todas as refeições (e seus itens) de uma dieta numa única
-- transação (mesma estratégia de replace_template_items/replace_recipe_items,
-- Fase 0 seção 11/22 — e a mesma que a importação de CSV de dieta vai usar
-- no futuro, já que o formato de diet_meal_items espelha o CSV).
-- SECURITY INVOKER (padrão): roda com as permissões e a RLS de quem chama.
create or replace function public.replace_diet_meals(p_diet_template_id uuid, p_meals jsonb)
returns void
language plpgsql
security invoker
as $$
declare
  v_meal_elem jsonb;
  v_meal_id uuid;
begin
  if not exists (
    select 1 from public.diet_templates
    where id = p_diet_template_id and user_id = auth.uid() and deleted_at is null
  ) then
    raise exception 'Dieta não encontrada ou sem permissão';
  end if;

  -- ON DELETE CASCADE de diet_meal_items cuida dos itens junto.
  delete from public.diet_meals where diet_template_id = p_diet_template_id;

  for v_meal_elem in select * from jsonb_array_elements(p_meals)
  loop
    insert into public.diet_meals (diet_template_id, user_id, order_index, name, meal_time)
    values (
      p_diet_template_id,
      auth.uid(),
      (v_meal_elem ->> 'order_index')::int,
      v_meal_elem ->> 'name',
      nullif(v_meal_elem ->> 'meal_time', '')::time
    )
    returning id into v_meal_id;

    insert into public.diet_meal_items (
      diet_meal_id, user_id, order_index, food_id, food_name, quantity, unit,
      grams_equivalent, calories, protein_g, carbs_g, fat_g, notes
    )
    select
      v_meal_id,
      auth.uid(),
      (item ->> 'order_index')::int,
      nullif(item ->> 'food_id', '')::uuid,
      item ->> 'food_name',
      (item ->> 'quantity')::numeric,
      item ->> 'unit',
      (item ->> 'grams_equivalent')::numeric,
      (item ->> 'calories')::numeric,
      (item ->> 'protein_g')::numeric,
      (item ->> 'carbs_g')::numeric,
      (item ->> 'fat_g')::numeric,
      nullif(item ->> 'notes', '')
    from jsonb_array_elements(v_meal_elem -> 'items') as item;
  end loop;
end;
$$;
