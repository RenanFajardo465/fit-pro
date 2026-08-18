-- Fit-Pro — Fase 2 (parte 1): Biblioteca de exercícios
-- Execute no SQL Editor do Supabase, depois de 0001_profiles.sql.

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  muscle_group text not null check (
    muscle_group in (
      'peito', 'costas', 'ombro', 'biceps', 'triceps', 'perna',
      'gluteo', 'abdomen', 'cardio', 'corpo_inteiro', 'outro'
    )
  ),
  category text,
  metric_type text not null check (
    metric_type in ('musculacao', 'peso_corporal', 'isometrico', 'corrida', 'esteira', 'outro')
  ),
  description text,
  image_url text,
  gif_url text,
  video_url text,
  external_url text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.exercises is
  'Biblioteca de exercícios do usuário. deleted_at = soft delete (Fase 0, seção 9) — nunca é referenciada diretamente pelo histórico de sessões, que guarda snapshot próprio (Fase 0, seção 8).';

-- updated_at automático (reaproveita a function criada em 0001_profiles.sql).
drop trigger if exists set_exercises_updated_at on public.exercises;
create trigger set_exercises_updated_at
  before update on public.exercises
  for each row
  execute function public.set_updated_at();

-- Índices de apoio à busca (Fase 0, seção 13: busca por nome e grupo muscular).
create index if not exists exercises_user_id_idx on public.exercises (user_id);
create index if not exists exercises_muscle_group_idx on public.exercises (user_id, muscle_group);
create index if not exists exercises_name_idx on public.exercises using btree (user_id, lower(name));

-- RLS — cada usuário só vê/edita/exclui os próprios exercícios.
alter table public.exercises enable row level security;

create policy "exercises: select own"
  on public.exercises for select
  using (auth.uid() = user_id);

create policy "exercises: insert own"
  on public.exercises for insert
  with check (auth.uid() = user_id);

create policy "exercises: update own"
  on public.exercises for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "exercises: delete own"
  on public.exercises for delete
  using (auth.uid() = user_id);
