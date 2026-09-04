-- Fit-Pro — Fase 3, Etapa B: correção de persistência/histórico de carga.
-- Execute no SQL Editor do Supabase, depois de 0009.
--
-- Item 2 da lista de ajustes do usuário: "Se for um exercício inédito, o
-- campo começa vazio. Para exercícios já realizados, o sistema deve puxar
-- e preencher automaticamente o peso utilizado no último treino
-- registrado."
--
-- `start_workout_session` (0007) já buscava a última `general_load_kg`
-- registrada pra sugerir carga, mas quando não havia histórico ela caía
-- (`coalesce`) pra `initial_load_kg` — a carga prescrita no template, que
-- não é "o que você usou da última vez", é só uma sugestão de quem montou
-- o treino. Isso fazia um exercício NUNCA realizado aparecer com um valor
-- preenchido, dando a entender que era histórico real.
--
-- Esta migration remove esse fallback: `general_load_kg` só é preenchido
-- quando existe mesmo um valor real de uma sessão anterior; sem
-- histórico, fica null (campo vazio na tela de execução).
-- `initial_load_kg` continua sendo copiado normalmente — ele já era, e
-- continua sendo, só a sugestão prescrita do template, exibida à parte
-- como referência (lib/workout/session-runner.tsx, Etapa B).

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
    -- Sugestão de carga: última general_load_kg REAL registrada para este
    -- exercise_id em outra sessão do usuário (Fase 0, seção 13). Sem
    -- histórico, fica null — não cai mais pra carga inicial prescrita no
    -- template (Etapa B: campo vazio pra exercício inédito).
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
      v_suggested_load,
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
