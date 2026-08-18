-- Fit-Pro — Fase 3 (parte 1): fundação da execução de treino
-- Execute no SQL Editor do Supabase, depois de 0001 a 0006.
-- Referência: FASE0_ARQUITETURA_FITPRO.md, seções 6.4, 7, 8, 10, 11, 13-18.

-- Sessão de treino. template_id nullable + template_name snapshot (Fase 0,
-- seção 8): a sessão nunca mais consulta o template depois de iniciada —
-- editar/excluir o template não afeta sessões já iniciadas.
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid references public.workout_templates (id) on delete set null,
  template_name text not null,
  -- Data "de calendário" no fuso do app (lib/date/today.ts), não now()/
  -- current_date do Postgres (que é UTC) — evita a mesma virada de dia
  -- errada já resolvida na Fase 2 para a recomendação.
  date date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  active_exercise_id uuid, -- FK adicionada depois de session_exercises existir (auto-referência cruzada)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workout_sessions is
  'Execução de um treino. Snapshot: nunca consulta workout_templates para exibir prescrição depois de criada (Fase 0, seção 8).';

-- Só uma sessão em andamento por usuário (Fase 0, seção 10).
create unique index if not exists one_active_session_per_user
  on public.workout_sessions (user_id)
  where status = 'in_progress';

drop trigger if exists set_workout_sessions_updated_at on public.workout_sessions;
create trigger set_workout_sessions_updated_at
  before update on public.workout_sessions
  for each row
  execute function public.set_updated_at();

alter table public.workout_sessions enable row level security;

create policy "workout_sessions: select own"
  on public.workout_sessions for select using (auth.uid() = user_id);
create policy "workout_sessions: insert own"
  on public.workout_sessions for insert with check (auth.uid() = user_id);
create policy "workout_sessions: update own"
  on public.workout_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Snapshot de cada item do template no momento de iniciar a sessão (Fase 0,
-- seção 8). user_id denormalizado (seção 7) para a RLS de session_sets/
-- session_group_rest não precisar de join até workout_sessions.
create table if not exists public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  exercise_name text not null,
  muscle_group text not null,
  metric_type text not null,
  order_index int not null,
  group_type text not null default 'single' check (group_type in ('single', 'biset', 'triset', 'superset')),
  group_id text,
  group_order int,
  sets int not null,
  reps_min int,
  reps_max int,
  duration_target_seconds int,
  distance_target_meters numeric,
  -- Carga inicial prescrita (cópia do template) vs. carga geral desta
  -- sessão (editável, sugerida a partir da última sessão que tenha esse
  -- exercise_id — Fase 0, seção 13).
  initial_load_kg numeric,
  general_load_kg numeric,
  rest_seconds int not null default 0,
  technique text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.session_exercises is
  'Snapshot de cada exercício da sessão no momento de "Iniciar treino" (Fase 0, seção 8). exercise_id fica nulo se o exercício for excluído definitivamente depois — o snapshot (exercise_name etc.) preserva o histórico.';

create index if not exists session_exercises_session_idx
  on public.session_exercises (session_id, order_index);

drop trigger if exists set_session_exercises_updated_at on public.session_exercises;
create trigger set_session_exercises_updated_at
  before update on public.session_exercises
  for each row
  execute function public.set_updated_at();

alter table public.session_exercises enable row level security;

create policy "session_exercises: select own"
  on public.session_exercises for select using (auth.uid() = user_id);
create policy "session_exercises: insert own"
  on public.session_exercises for insert with check (auth.uid() = user_id);
create policy "session_exercises: update own"
  on public.session_exercises for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Agora que session_exercises existe, liga o "exercício atual" da sessão.
alter table public.workout_sessions
  add constraint workout_sessions_active_exercise_id_fkey
  foreign key (active_exercise_id) references public.session_exercises (id) on delete set null;

-- Uma linha por série prescrita, pré-criada no início da sessão (status
-- 'pending') — é isso que permite, ao finalizar com pendências, virar
-- 'skipped' em vez de nunca ter existido (Fase 0, seção 16).
create table if not exists public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  set_number int not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped')),
  weight_kg numeric,
  reps int,
  duration_seconds int,
  distance_meters numeric,
  completed_at timestamptz,
  -- Chave de idempotência gerada no cliente (Fase 0, seção 11) — mutações
  -- reenviadas após uma queda de conexão fazem UPDATE no mesmo registro em
  -- vez de criar duplicata.
  client_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique (client_id)
);

comment on table public.session_sets is
  'Uma linha por série prescrita. Pré-criada como pending ao iniciar a sessão; completed/skipped ao concluir/finalizar (Fase 0, seções 8, 11, 16).';

create index if not exists session_sets_exercise_idx
  on public.session_sets (session_exercise_id, set_number);

alter table public.session_sets enable row level security;

create policy "session_sets: select own"
  on public.session_sets for select using (auth.uid() = user_id);
create policy "session_sets: insert own"
  on public.session_sets for insert with check (auth.uid() = user_id);
create policy "session_sets: update own"
  on public.session_sets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Estado do descanso por agrupamento/exercício avulso (Fase 0, seções 14,
-- 15). group_key = group_id do bloco, ou o exercise_id/session_exercise_id
-- quando for um exercício avulso — mesmo mecanismo de timer para os dois
-- casos.
create table if not exists public.session_group_rest (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  group_key text not null,
  round_number int not null,
  rest_started_at timestamptz,
  rest_ends_at timestamptz,
  paused_remaining_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, group_key, round_number)
);

drop trigger if exists set_session_group_rest_updated_at on public.session_group_rest;
create trigger set_session_group_rest_updated_at
  before update on public.session_group_rest
  for each row
  execute function public.set_updated_at();

alter table public.session_group_rest enable row level security;

create policy "session_group_rest: select own"
  on public.session_group_rest for select using (auth.uid() = user_id);
create policy "session_group_rest: insert own"
  on public.session_group_rest for insert with check (auth.uid() = user_id);
create policy "session_group_rest: update own"
  on public.session_group_rest for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Inicia uma sessão a partir do template atual: copia (snapshot) cada item
-- para session_exercises + pré-cria as session_sets pending (Fase 0, seção
-- 8). SECURITY INVOKER — roda com a RLS de quem chama.
create or replace function public.start_workout_session(p_template_id uuid, p_date date)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_session_id uuid;
  v_template_name text;
  v_item record;
  v_session_exercise_id uuid;
  v_suggested_load numeric;
  v_set_number int;
begin
  if exists (
    select 1 from public.workout_sessions where user_id = auth.uid() and status = 'in_progress'
  ) then
    raise exception 'Já existe um treino em andamento';
  end if;

  select name into v_template_name
  from public.workout_templates
  where id = p_template_id and user_id = auth.uid() and deleted_at is null;

  if v_template_name is null then
    raise exception 'Template não encontrado ou sem permissão';
  end if;

  insert into public.workout_sessions (user_id, template_id, template_name, date)
  values (auth.uid(), p_template_id, v_template_name, p_date)
  returning id into v_session_id;

  for v_item in
    select
      wti.order_index, wti.group_type, wti.group_id, wti.group_order,
      wti.sets, wti.reps_min, wti.reps_max, wti.duration_target_seconds,
      wti.distance_target_meters, wti.initial_load_kg, wti.rest_seconds,
      wti.technique, wti.notes, wti.exercise_id,
      coalesce(e.name, 'Exercício removido') as exercise_name,
      coalesce(e.muscle_group, 'outro') as muscle_group,
      coalesce(e.metric_type, 'outro') as metric_type
    from public.workout_template_items wti
    left join public.exercises e on e.id = wti.exercise_id
    where wti.template_id = p_template_id
    order by wti.order_index asc
  loop
    -- Sugestão de carga: última general_load_kg registrada para este
    -- exercise_id em outra sessão do usuário (Fase 0, seção 13); sem
    -- histórico, cai para a carga inicial prescrita no template.
    v_suggested_load := null;
    if v_item.exercise_id is not null then
      select se.general_load_kg into v_suggested_load
      from public.session_exercises se
      join public.workout_sessions ws on ws.id = se.session_id
      where se.user_id = auth.uid()
        and se.exercise_id = v_item.exercise_id
        and ws.id <> v_session_id
      order by ws.started_at desc
      limit 1;
    end if;

    insert into public.session_exercises (
      session_id, user_id, exercise_id, exercise_name, muscle_group, metric_type,
      order_index, group_type, group_id, group_order, sets, reps_min, reps_max,
      duration_target_seconds, distance_target_meters, initial_load_kg, general_load_kg,
      rest_seconds, technique, notes
    )
    values (
      v_session_id, auth.uid(), v_item.exercise_id, v_item.exercise_name, v_item.muscle_group,
      v_item.metric_type, v_item.order_index, v_item.group_type, v_item.group_id, v_item.group_order,
      v_item.sets, v_item.reps_min, v_item.reps_max, v_item.duration_target_seconds,
      v_item.distance_target_meters, v_item.initial_load_kg,
      coalesce(v_suggested_load, v_item.initial_load_kg),
      v_item.rest_seconds, v_item.technique, v_item.notes
    )
    returning id into v_session_exercise_id;

    for v_set_number in 1..v_item.sets loop
      insert into public.session_sets (session_exercise_id, user_id, set_number)
      values (v_session_exercise_id, auth.uid(), v_set_number);
    end loop;
  end loop;

  return v_session_id;
end;
$$;

-- Abandona a sessão em andamento do usuário (Fase 0, seção 10 — "Abandonar"
-- na recuperação, ou finalização forçada). Update simples, não precisava
-- de RPC, mas fica junto para manter a lógica de sessão num só lugar.
create or replace function public.abandon_workout_session(p_session_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  update public.workout_sessions
  set status = 'abandoned', finished_at = now()
  where id = p_session_id and user_id = auth.uid() and status = 'in_progress';
end;
$$;
