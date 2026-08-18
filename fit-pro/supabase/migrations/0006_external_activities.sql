-- Fit-Pro — Fase 2 (parte 5): atividades externas + calendário
-- Execute no SQL Editor do Supabase, depois de 0001 a 0005.
-- Referência: FASE0_ARQUITETURA_FITPRO.md, seção 6.3 (external_activities).

-- Uma atividade é recorrente por dia da semana (weekday preenchido) OU
-- pontual numa data específica (date preenchida) — nunca as duas, nunca
-- nenhuma das duas (regra da Fase 0: "weekday OU date específica").
create table if not exists public.external_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  weekday int check (weekday between 0 and 6),
  date date,
  time_of_day time,
  duration_minutes int check (duration_minutes is null or duration_minutes > 0),
  notes text,
  created_at timestamptz not null default now(),
  check (
    (weekday is not null and date is null) or (weekday is null and date is not null)
  )
);

comment on table public.external_activities is
  'Atividades fora do treino (futebol, muay thai...). Aparecem no calendário e podem alimentar a regra "evitar grupo muscular após atividade" do Modo 3 (Fase 0, seção 6.3).';

create index if not exists external_activities_user_weekday_idx
  on public.external_activities (user_id, weekday) where weekday is not null;
create index if not exists external_activities_user_date_idx
  on public.external_activities (user_id, date) where date is not null;

alter table public.external_activities enable row level security;

create policy "external_activities: select own"
  on public.external_activities for select using (auth.uid() = user_id);
create policy "external_activities: insert own"
  on public.external_activities for insert with check (auth.uid() = user_id);
create policy "external_activities: update own"
  on public.external_activities for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "external_activities: delete own"
  on public.external_activities for delete using (auth.uid() = user_id);
