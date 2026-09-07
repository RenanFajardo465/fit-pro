-- Fit-Pro — Fase 5, Incremento 1: biblioteca de alimentos.
-- Execute no SQL Editor do Supabase, depois de 0010.
-- Referência: FASE0_ARQUITETURA_FITPRO.md, seções 6.6 e 19.
--
-- Macros são sempre por 1 PORÇÃO DE REFERÊNCIA (serving_quantity +
-- serving_unit), nunca "por 100g" — é isso que o usuário vê e cadastra
-- (ex.: "2 fatias de pão = 140 kcal"), sem precisar fazer conta de cabeça.
-- grams_equivalent existe só de apoio a receitas/conversões futuras
-- (Incremento 2), não é usado pra calcular nada nesta entrega.
--
-- Assim como exercises/workout_templates, nunca é referenciada diretamente
-- pelo histórico: receitas e o diário nutricional (diet_days/diet_day_items,
-- Incrementos 2-4) sempre congelam uma cópia dos macros no momento do uso
-- (Fase 0, seção 8) — editar ou apagar um alimento aqui nunca altera nada
-- já registrado no passado.

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  brand text,
  serving_quantity numeric not null check (serving_quantity > 0),
  serving_unit text not null check (
    serving_unit in (
      'g', 'kg', 'ml', 'l', 'unidade', 'fatia', 'colher', 'colher_cha',
      'colher_sopa', 'xicara', 'porcao', 'scoop', 'pacote'
    )
  ),
  grams_equivalent numeric not null check (grams_equivalent > 0),
  calories numeric not null check (calories >= 0),
  protein_g numeric not null check (protein_g >= 0),
  carbs_g numeric not null check (carbs_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.foods is
  'Biblioteca de alimentos do usuário. Macros sempre por 1 porção de referência (serving_quantity/serving_unit), nunca por 100g. deleted_at = soft delete (Fase 0, seção 9) — receitas e diário nutricional congelam snapshot próprio, nunca dependem do alimento atual.';

drop trigger if exists set_foods_updated_at on public.foods;
create trigger set_foods_updated_at
  before update on public.foods
  for each row
  execute function public.set_updated_at();

create index if not exists foods_user_id_idx on public.foods (user_id);
create index if not exists foods_name_idx on public.foods using btree (user_id, lower(name));

alter table public.foods enable row level security;

create policy "foods: select own"
  on public.foods for select using (auth.uid() = user_id);
create policy "foods: insert own"
  on public.foods for insert with check (auth.uid() = user_id);
create policy "foods: update own"
  on public.foods for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "foods: delete own"
  on public.foods for delete using (auth.uid() = user_id);
