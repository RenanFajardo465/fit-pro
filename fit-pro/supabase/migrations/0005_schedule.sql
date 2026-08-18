-- Fit-Pro — Fase 2 (parte 4): configurações de recomendação de treino
-- Execute no SQL Editor do Supabase, depois de 0001/0002/0003/0004.
-- Referência: FASE0_ARQUITETURA_FITPRO.md, seções 6.3 e 12.

-- Modo ativo do usuário (uma linha por usuário). "rules" (Modo 3) usa a
-- sequência contínua (Modo 1) como base e aplica os filtros por cima — ver
-- comentário em lib/workout/recommendation.ts sobre essa decisão.
create table if not exists public.schedule_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  mode text not null default 'sequence' check (mode in ('sequence', 'weekday', 'rules')),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_schedule_settings_updated_at on public.schedule_settings;
create trigger set_schedule_settings_updated_at
  before update on public.schedule_settings
  for each row
  execute function public.set_updated_at();

alter table public.schedule_settings enable row level security;

create policy "schedule_settings: select own"
  on public.schedule_settings for select using (auth.uid() = user_id);
create policy "schedule_settings: insert own"
  on public.schedule_settings for insert with check (auth.uid() = user_id);
create policy "schedule_settings: update own"
  on public.schedule_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Estado do Modo 1 (sequência contínua). Só avança quando uma sessão é
-- concluída (Fase 3) — até lá, pode ser ajustado manualmente aqui para
-- testes ou para corrigir a fila.
create table if not exists public.sequence_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_completed_template_id uuid references public.workout_templates (id) on delete set null,
  last_completed_at timestamptz,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_sequence_state_updated_at on public.sequence_state;
create trigger set_sequence_state_updated_at
  before update on public.sequence_state
  for each row
  execute function public.set_updated_at();

alter table public.sequence_state enable row level security;

create policy "sequence_state: select own"
  on public.sequence_state for select using (auth.uid() = user_id);
create policy "sequence_state: insert own"
  on public.sequence_state for insert with check (auth.uid() = user_id);
create policy "sequence_state: update own"
  on public.sequence_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Modo 2 (por dia da semana). weekday: 0=domingo ... 6=sábado.
-- template_id nulo = descanso nesse dia.
create table if not exists public.weekday_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  template_id uuid references public.workout_templates (id) on delete set null,
  unique (user_id, weekday)
);

alter table public.weekday_assignments enable row level security;

create policy "weekday_assignments: select own"
  on public.weekday_assignments for select using (auth.uid() = user_id);
create policy "weekday_assignments: insert own"
  on public.weekday_assignments for insert with check (auth.uid() = user_id);
create policy "weekday_assignments: update own"
  on public.weekday_assignments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekday_assignments: delete own"
  on public.weekday_assignments for delete using (auth.uid() = user_id);

-- Modo 3 (regras). rule_type é um enum extensível — nesta entrega a UI só
-- permite criar 3 dos 4 tipos documentados na Fase 0; "avoid_muscle_group_
-- after_activity" chega junto com "Atividades externas" na próxima entrega
-- (o parâmetro dele referenciaria uma atividade que ainda não existe).
create table if not exists public.schedule_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rule_type text not null check (
    rule_type in (
      'avoid_template_on_weekday',
      'avoid_muscle_group_after_activity',
      'reserve_rest_day',
      'prioritize_template_on_weekday'
    )
  ),
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.schedule_rules enable row level security;

create policy "schedule_rules: select own"
  on public.schedule_rules for select using (auth.uid() = user_id);
create policy "schedule_rules: insert own"
  on public.schedule_rules for insert with check (auth.uid() = user_id);
create policy "schedule_rules: delete own"
  on public.schedule_rules for delete using (auth.uid() = user_id);

-- Força um treino (ou descanso, se template_id nulo) numa data específica,
-- com prioridade máxima sobre qualquer modo/regra (Fase 0, seção 12).
-- Tabela já criada nesta entrega; a tela para usá-la (o calendário) chega
-- na próxima.
create table if not exists public.manual_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  template_id uuid references public.workout_templates (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.manual_overrides enable row level security;

create policy "manual_overrides: select own"
  on public.manual_overrides for select using (auth.uid() = user_id);
create policy "manual_overrides: insert own"
  on public.manual_overrides for insert with check (auth.uid() = user_id);
create policy "manual_overrides: update own"
  on public.manual_overrides for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "manual_overrides: delete own"
  on public.manual_overrides for delete using (auth.uid() = user_id);
