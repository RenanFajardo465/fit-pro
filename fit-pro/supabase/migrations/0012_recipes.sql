-- Fit-Pro — Fase 5, Incremento 2: receitas.
-- Execute no SQL Editor do Supabase, depois de 0011.
-- Referência: FASE0_ARQUITETURA_FITPRO.md, seções 6.6, 8 e 19.
--
-- Uma receita é montada a partir de alimentos da biblioteca + "quantidade
-- de porções daquele alimento" (ex.: 2x a porção de referência do arroz).
-- Os macros de CADA item são calculados e congelados no momento de salvar
-- (calories/protein_g/carbs_g/fat_g já vêm prontos do cliente, que tem o
-- alimento carregado) — igual ao "computed_* congelado" da seção 6.6/8:
-- editar um alimento depois nunca muda uma receita já salva. Os totais da
-- receita (computed_calories etc., por 1 PORÇÃO DA RECEITA = total dos
-- itens / servings) só são recalculados quando o usuário edita e salva de
-- novo — nunca em background.

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  servings numeric not null default 1 check (servings > 0),
  computed_calories numeric not null default 0 check (computed_calories >= 0),
  computed_protein_g numeric not null default 0 check (computed_protein_g >= 0),
  computed_carbs_g numeric not null default 0 check (computed_carbs_g >= 0),
  computed_fat_g numeric not null default 0 check (computed_fat_g >= 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.recipes is
  'Receita = soma de alimentos da biblioteca / servings. computed_* é por 1 porção da receita, congelado no momento de salvar (via replace_recipe_items) — nunca recalculado sozinho quando um alimento-fonte muda.';

create index if not exists recipes_user_id_idx on public.recipes (user_id);
create index if not exists recipes_name_idx on public.recipes using btree (user_id, lower(name));

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at
  before update on public.recipes
  for each row
  execute function public.set_updated_at();

alter table public.recipes enable row level security;

create policy "recipes: select own"
  on public.recipes for select using (auth.uid() = user_id);
create policy "recipes: insert own"
  on public.recipes for insert with check (auth.uid() = user_id);
create policy "recipes: update own"
  on public.recipes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recipes: delete own"
  on public.recipes for delete using (auth.uid() = user_id);

-- Itens da receita. food_id fica nulo se o alimento de origem for excluído
-- definitivamente da biblioteca (Fase 0, seção 8/9) — food_name e os macros
-- já congelados continuam intactos, então a receita não quebra.
create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  -- Denormalizado a partir da receita, só para a RLS não precisar de JOIN
  -- (Fase 0, seção 7).
  user_id uuid not null references auth.users (id) on delete cascade,
  order_index int not null,
  food_id uuid references public.foods (id) on delete set null,
  food_name text not null check (char_length(btrim(food_name)) > 0),
  quantity_servings numeric not null check (quantity_servings > 0),
  calories numeric not null check (calories >= 0),
  protein_g numeric not null check (protein_g >= 0),
  carbs_g numeric not null check (carbs_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.recipe_items is
  'Um alimento dentro de uma receita, com quantity_servings = quantas vezes a porção de referência do alimento (não gramas/ml — mesma simplicidade da biblioteca de alimentos). calories/protein_g/carbs_g/fat_g já vêm calculados (alimento × quantidade) e congelados no momento de salvar.';

create index if not exists recipe_items_recipe_idx on public.recipe_items (recipe_id, order_index);

drop trigger if exists set_recipe_items_updated_at on public.recipe_items;
create trigger set_recipe_items_updated_at
  before update on public.recipe_items
  for each row
  execute function public.set_updated_at();

alter table public.recipe_items enable row level security;

create policy "recipe_items: select own"
  on public.recipe_items for select using (auth.uid() = user_id);
create policy "recipe_items: insert own"
  on public.recipe_items for insert with check (auth.uid() = user_id);
create policy "recipe_items: update own"
  on public.recipe_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recipe_items: delete own"
  on public.recipe_items for delete using (auth.uid() = user_id);

-- Substitui todos os itens de uma receita numa única transação (mesma
-- estratégia de replace_template_items, Fase 0 seção 11/22) e, na mesma
-- operação, recalcula e congela os totais por porção da receita
-- (computed_*), a partir dos macros já calculados de cada item.
-- SECURITY INVOKER (padrão): roda com as permissões e a RLS de quem chama.
create or replace function public.replace_recipe_items(
  p_recipe_id uuid,
  p_servings numeric,
  p_items jsonb
)
returns void
language plpgsql
security invoker
as $$
declare
  v_calories numeric;
  v_protein numeric;
  v_carbs numeric;
  v_fat numeric;
begin
  if not exists (
    select 1 from public.recipes
    where id = p_recipe_id and user_id = auth.uid() and deleted_at is null
  ) then
    raise exception 'Receita não encontrada ou sem permissão';
  end if;

  if p_servings is null or p_servings <= 0 then
    raise exception 'Rendimento precisa ser maior que zero';
  end if;

  delete from public.recipe_items where recipe_id = p_recipe_id;

  insert into public.recipe_items (
    recipe_id, user_id, order_index, food_id, food_name, quantity_servings,
    calories, protein_g, carbs_g, fat_g
  )
  select
    p_recipe_id,
    auth.uid(),
    (ord - 1)::int,
    nullif(elem ->> 'food_id', '')::uuid,
    elem ->> 'food_name',
    (elem ->> 'quantity_servings')::numeric,
    (elem ->> 'calories')::numeric,
    (elem ->> 'protein_g')::numeric,
    (elem ->> 'carbs_g')::numeric,
    (elem ->> 'fat_g')::numeric
  from jsonb_array_elements(p_items) with ordinality as t(elem, ord);

  select
    coalesce(sum(calories), 0), coalesce(sum(protein_g), 0),
    coalesce(sum(carbs_g), 0), coalesce(sum(fat_g), 0)
  into v_calories, v_protein, v_carbs, v_fat
  from public.recipe_items
  where recipe_id = p_recipe_id;

  update public.recipes
  set servings = p_servings,
      computed_calories = round(v_calories / p_servings, 2),
      computed_protein_g = round(v_protein / p_servings, 2),
      computed_carbs_g = round(v_carbs / p_servings, 2),
      computed_fat_g = round(v_fat / p_servings, 2)
  where id = p_recipe_id;
end;
$$;
