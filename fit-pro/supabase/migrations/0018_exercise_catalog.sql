-- Fit-Pro — Catálogo Inteligente de Exercícios (parte 1/2: aditiva/segura).
-- Execute no SQL Editor do Supabase, depois de 0017.
--
-- Contexto: `exercises` já era uma tabela estruturada (não texto livre) e
-- `workout_template_items`/`session_exercises` já referenciam `exercise_id`
-- por ID, não por nome — isso já existia desde a Fase 2/3. O que faltava:
-- atributos pra diferenciar variações reais do mesmo movimento, um sistema
-- de sinônimos, e detecção de duplicata. Decisão explícita do usuário:
-- o catálogo CONTINUA por usuário (RLS por user_id, como todo o resto do
-- app) — não vira um catálogo global compartilhado entre os 2 usuários.
--
-- Esta migration só ADICIONA (colunas nullable, tabela nova, funções) —
-- nada aqui pode quebrar dado existente. A parte 2 (0019), que adiciona os
-- índices únicos e o trigger que de fato BLOQUEIA duplicata, vem depois e
-- faz uma checagem de colisões pré-existentes antes de travar nada.

-- Atributos novos de exercises (Catálogo Inteligente, seção 2). Todos
-- nullable: exercício antigo continua 100% válido sem preenchê-los.
alter table public.exercises
  add column if not exists equipment text,
  add column if not exists movement_pattern text,
  add column if not exists grip_type text,
  add column if not exists position_variant text,
  add column if not exists is_unilateral boolean,
  add column if not exists secondary_muscle_groups text[];

alter table public.exercises
  drop constraint if exists exercises_equipment_check,
  add constraint exercises_equipment_check check (
    equipment is null or equipment in (
      'barra', 'halteres', 'maquina', 'cabo_polia', 'peso_corporal',
      'kettlebell', 'elastico', 'smith', 'outro'
    )
  );

alter table public.exercises
  drop constraint if exists exercises_movement_pattern_check,
  add constraint exercises_movement_pattern_check check (
    movement_pattern is null or movement_pattern in (
      'empurrar', 'puxar', 'agachar', 'dobradica_quadril', 'core', 'isolamento', 'outro'
    )
  );

alter table public.exercises
  drop constraint if exists exercises_grip_type_check,
  add constraint exercises_grip_type_check check (
    grip_type is null or grip_type in ('pronada', 'supinada', 'neutra', 'mista', 'nao_aplicavel')
  );

alter table public.exercises
  drop constraint if exists exercises_position_variant_check,
  add constraint exercises_position_variant_check check (
    position_variant is null or position_variant in (
      'reto', 'inclinado', 'declinado', 'sentado', 'em_pe', 'deitado', 'nao_aplicavel'
    )
  );

comment on column public.exercises.equipment is 'Equipamento usado — diferencia variações reais (ex.: supino com barra vs. com halteres), Catálogo Inteligente seção 2.';
comment on column public.exercises.secondary_muscle_groups is 'Grupos musculares secundários, mesmo vocabulário de muscle_group (sem check de array->enum no Postgres; validado em Zod no app).';

-- Sinônimos/aliases (Catálogo Inteligente, seção 3): cada alias aponta pra
-- UM exercício oficial do mesmo usuário. "Rosca direta com barra" é o nome
-- oficial; "Rosca bíceps com barra", "Barbell curl" viram aliases dela.
create table if not exists public.exercise_aliases (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  alias text not null check (char_length(btrim(alias)) > 0),
  created_at timestamptz not null default now()
);

comment on table public.exercise_aliases is
  'Sinônimos/nomes alternativos apontando pro exercício oficial (mesmo user_id). user_id é denormalizado do exercício pai só pra permitir RLS direta na tabela, sem join.';

create index if not exists exercise_aliases_exercise_id_idx on public.exercise_aliases (exercise_id);
create index if not exists exercise_aliases_user_id_idx on public.exercise_aliases (user_id);

alter table public.exercise_aliases enable row level security;

-- drop-before-create (em vez de só `create policy`, que não aceita "if not
-- exists" no Postgres) pra esta migration poder ser re-executada sem erro,
-- como a seção 7 do pedido exige.
drop policy if exists "exercise_aliases: select own" on public.exercise_aliases;
create policy "exercise_aliases: select own"
  on public.exercise_aliases for select using (auth.uid() = user_id);
drop policy if exists "exercise_aliases: insert own" on public.exercise_aliases;
create policy "exercise_aliases: insert own"
  on public.exercise_aliases for insert with check (auth.uid() = user_id);
drop policy if exists "exercise_aliases: update own" on public.exercise_aliases;
create policy "exercise_aliases: update own"
  on public.exercise_aliases for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "exercise_aliases: delete own" on public.exercise_aliases;
create policy "exercise_aliases: delete own"
  on public.exercise_aliases for delete using (auth.uid() = user_id);

-- Substitui todos os sinônimos de um exercício de uma vez só (mesmo padrão
-- de replace_template_items/replace_recipe_items/replace_diet_meals já
-- usado no projeto pra "listas filhas"): apaga os aliases antigos e insere
-- os novos numa única transação — se um alias novo colidir com outro
-- exercício (trigger da 0019), a transação inteira desfaz, sem deixar o
-- exercício com metade dos sinônimos apagados e a outra metade rejeitada.
create or replace function public.replace_exercise_aliases(p_exercise_id uuid, p_aliases text[])
returns void
language plpgsql
security invoker
as $$
declare
  v_owner uuid;
  v_alias text;
begin
  select user_id into v_owner from public.exercises where id = p_exercise_id and user_id = auth.uid();
  if v_owner is null then
    raise exception 'Exercício não encontrado ou sem permissão';
  end if;

  delete from public.exercise_aliases where exercise_id = p_exercise_id and user_id = auth.uid();

  foreach v_alias in array coalesce(p_aliases, array[]::text[])
  loop
    if btrim(v_alias) <> '' then
      insert into public.exercise_aliases (exercise_id, user_id, alias)
      values (p_exercise_id, auth.uid(), btrim(v_alias));
    end if;
  end loop;
end;
$$;

comment on function public.replace_exercise_aliases(uuid, text[]) is
  'SECURITY INVOKER. O trigger check_exercise_alias_not_duplicate (0019) ainda roda por linha e pode abortar a transação se um alias novo colidir — comportamento esperado.';

-- Normalização de nome (Catálogo Inteligente, seção 3): minúsculas, sem
-- acento, espaços colapsados — usada tanto pro índice único (0019) quanto
-- pra comparação de duplicata exata. Dobra de acento via `translate()` com
-- mapa fixo de caracteres (em vez da extensão `unaccent`, que depende de
-- um objeto "dicionário" cujo schema varia entre projetos Supabase e
-- complica marcar a função como IMMUTABLE pra uso em índice) — cobre os
-- acentos do português, é 100% determinístico e não depende de extensão.
create or replace function public.normalize_exercise_name(p_name text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(
    regexp_replace(
      translate(
        lower(p_name),
        'áàâãäåéèêëíìîïóòôõöúùûüçñ',
        'aaaaaaeeeeiiiiooooouuuucn'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

comment on function public.normalize_exercise_name(text) is
  'Minúsculas + sem acento + espaços colapsados. Espelhada em TS (lib/workout/exercise-normalize.ts normalizeExerciseName) — as duas precisam concordar.';

-- Similaridade por trigrama (Catálogo Inteligente, seção 3/5): "sugere
-- possíveis duplicidades, mas não funde automaticamente". pg_trgm é a
-- extensão padrão do Postgres pra isso — mais robusta no banco do que
-- reimplementar Dice coefficient em SQL puro (o lado do cliente usa uma
-- implementação em TS própria pra feedback instantâneo sem round-trip).
create extension if not exists pg_trgm;

create or replace function public.find_similar_exercises(p_name text, p_threshold real default 0.35)
returns table (id uuid, name text, muscle_group text, equipment text, similarity real)
language sql
stable
security invoker
as $$
  select e.id, e.name, e.muscle_group, e.equipment,
         similarity(public.normalize_exercise_name(e.name), public.normalize_exercise_name(p_name)) as similarity
  from public.exercises e
  where e.user_id = auth.uid()
    and e.deleted_at is null
    and similarity(public.normalize_exercise_name(e.name), public.normalize_exercise_name(p_name)) >= p_threshold
  order by similarity desc
  limit 10;
$$;

comment on function public.find_similar_exercises(text, real) is
  'SECURITY INVOKER: roda com a RLS de quem chamou, só vê os próprios exercícios. Usada pelo formulário de novo exercício pra sugerir equivalentes antes de criar (nunca funde sozinha).';
