-- Fit-Pro — Fase 2 (parte 2): Templates de treino
-- Execute no SQL Editor do Supabase, depois de 0001_profiles.sql e 0002_exercises.sql.

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  code text not null check (char_length(btrim(code)) > 0 and char_length(code) <= 10),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workout_templates is
  'Template de treino (ex.: "Treino A"). Editável livremente — quem preserva o histórico é o snapshot em workout_sessions (Fase 3), não este template.';

-- Código único por usuário entre os templates ativos (permite reusar um
-- código depois que o template antigo foi para a lixeira).
create unique index if not exists workout_templates_user_code_idx
  on public.workout_templates (user_id, code)
  where deleted_at is null;

drop trigger if exists set_workout_templates_updated_at on public.workout_templates;
create trigger set_workout_templates_updated_at
  before update on public.workout_templates
  for each row
  execute function public.set_updated_at();

alter table public.workout_templates enable row level security;

create policy "workout_templates: select own"
  on public.workout_templates for select
  using (auth.uid() = user_id);

create policy "workout_templates: insert own"
  on public.workout_templates for insert
  with check (auth.uid() = user_id);

create policy "workout_templates: update own"
  on public.workout_templates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout_templates: delete own"
  on public.workout_templates for delete
  using (auth.uid() = user_id);

-- Itens do template (um por exercício; agrupamentos via group_type/group_id/
-- group_order — mesmo modelo do CSV oficial documentado na Fase 0).
create table if not exists public.workout_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  -- Denormalizado a partir do template, só para a RLS não precisar de JOIN
  -- (Fase 0, seção 7).
  user_id uuid not null references auth.users (id) on delete cascade,
  order_index int not null,
  group_type text not null default 'single'
    check (group_type in ('single', 'biset', 'triset', 'superset')),
  group_id text,
  group_order int,
  -- Exercício de origem. Fica nulo se o exercício for excluído
  -- definitivamente da biblioteca no futuro (Fase 0, seção 8/9) — a tela do
  -- editor mostra "exercício removido" e pede para escolher outro.
  exercise_id uuid references public.exercises (id) on delete set null,
  sets int not null check (sets >= 1),
  reps_min int check (reps_min is null or reps_min >= 0),
  reps_max int check (reps_max is null or reps_max >= 0),
  duration_target_seconds int check (duration_target_seconds is null or duration_target_seconds > 0),
  distance_target_meters numeric check (distance_target_meters is null or distance_target_meters > 0),
  initial_load_kg numeric check (initial_load_kg is null or initial_load_kg >= 0),
  rest_seconds int not null default 0 check (rest_seconds >= 0),
  technique text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reps_max is null or reps_min is null or reps_max >= reps_min),
  check (
    (group_type = 'single' and group_id is null and group_order is null)
    or (group_type <> 'single' and group_id is not null and group_order is not null)
  )
);

comment on table public.workout_template_items is
  'Prescrição de cada exercício dentro de um template. Agrupamentos (bi-set/tri-set/superset) usam group_type + group_id compartilhado + group_order (Fase 0, seções 14/20).';

create index if not exists workout_template_items_template_idx
  on public.workout_template_items (template_id, order_index);

drop trigger if exists set_workout_template_items_updated_at on public.workout_template_items;
create trigger set_workout_template_items_updated_at
  before update on public.workout_template_items
  for each row
  execute function public.set_updated_at();

alter table public.workout_template_items enable row level security;

create policy "workout_template_items: select own"
  on public.workout_template_items for select
  using (auth.uid() = user_id);

create policy "workout_template_items: insert own"
  on public.workout_template_items for insert
  with check (auth.uid() = user_id);

create policy "workout_template_items: update own"
  on public.workout_template_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "workout_template_items: delete own"
  on public.workout_template_items for delete
  using (auth.uid() = user_id);

-- Substitui todos os itens de um template numa única transação (evita
-- deixar o template com metade dos itens salvos se algo falhar no meio —
-- Fase 0, seção 11/22, mesma estratégia que a importação de CSV vai usar).
-- SECURITY INVOKER (padrão): roda com as permissões e a RLS de quem chama,
-- nunca com privilégio elevado.
create or replace function public.replace_template_items(p_template_id uuid, p_items jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  if not exists (
    select 1 from public.workout_templates
    where id = p_template_id and user_id = auth.uid() and deleted_at is null
  ) then
    raise exception 'Template não encontrado ou sem permissão';
  end if;

  delete from public.workout_template_items where template_id = p_template_id;

  insert into public.workout_template_items (
    template_id, user_id, order_index, group_type, group_id, group_order, exercise_id,
    sets, reps_min, reps_max, duration_target_seconds, distance_target_meters,
    initial_load_kg, rest_seconds, technique, notes
  )
  select
    p_template_id,
    auth.uid(),
    (elem ->> 'order_index')::int,
    elem ->> 'group_type',
    nullif(elem ->> 'group_id', ''),
    nullif(elem ->> 'group_order', '')::int,
    nullif(elem ->> 'exercise_id', '')::uuid,
    (elem ->> 'sets')::int,
    nullif(elem ->> 'reps_min', '')::int,
    nullif(elem ->> 'reps_max', '')::int,
    nullif(elem ->> 'duration_target_seconds', '')::int,
    nullif(elem ->> 'distance_target_meters', '')::numeric,
    nullif(elem ->> 'initial_load_kg', '')::numeric,
    (elem ->> 'rest_seconds')::int,
    nullif(elem ->> 'technique', ''),
    nullif(elem ->> 'notes', '')
  from jsonb_array_elements(p_items) as elem;
end;
$$;
