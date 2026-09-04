-- Fit-Pro — Fase 3, refinamentos pós-Incremento 3: fluxo 100% sequencial.
-- Execute no SQL Editor do Supabase, depois de 0008.
--
-- Item 1 da lista de ajustes do usuário: "terminou o Treino A, o app já
-- sugere o Treino B para a próxima sessão, independentemente do dia".
-- Isso só funciona de ponta a ponta se `sequence_state` avançar sozinha ao
-- finalizar uma sessão — até aqui só existia o ajuste manual em
-- Configurações (lib/actions/schedule.ts, setSequenceState). Esta migration
-- substitui finish_workout_session (criada em 0008) para, além de marcar a
-- sessão como concluída, empurrar a fila para o próximo treino.
--
-- Se a sessão não tiver template_id (o template foi excluído em definitivo
-- depois de iniciada — workout_sessions.template_id é `on delete set
-- null`), a fila não avança: não há o que registrar como "concluído".

create or replace function public.finish_workout_session(p_session_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_template_id uuid;
begin
  update public.session_sets ss
  set status = 'skipped'
  from public.session_exercises se
  where ss.session_exercise_id = se.id
    and se.session_id = p_session_id
    and ss.user_id = auth.uid()
    and ss.status = 'pending';

  select template_id into v_template_id
  from public.workout_sessions
  where id = p_session_id and user_id = auth.uid() and status = 'in_progress';

  update public.workout_sessions
  set status = 'completed', finished_at = now()
  where id = p_session_id and user_id = auth.uid() and status = 'in_progress';

  if v_template_id is not null then
    insert into public.sequence_state (user_id, last_completed_template_id, last_completed_at)
    values (auth.uid(), v_template_id, now())
    on conflict (user_id) do update
      set last_completed_template_id = excluded.last_completed_template_id,
          last_completed_at = excluded.last_completed_at;
  end if;
end;
$$;
