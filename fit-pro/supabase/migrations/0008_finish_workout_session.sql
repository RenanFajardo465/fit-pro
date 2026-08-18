-- Fit-Pro — Fase 3, Incremento 2: finalizar a sessão em execução.
-- Execute no SQL Editor do Supabase, depois de 0007.
-- Referência: FASE0_ARQUITETURA_FITPRO.md, seção 16.
--
-- Adianta só a mecânica de "pendências viram puladas ao finalizar" da Fase 0
-- seção 16 — sem ela, o usuário não teria como encerrar um treino de forma
-- limpa (só "Abandonar", que marca como abandonado, não concluído). Os
-- cálculos de progresso/volume/PR e a tela de resumo pós-treino continuam
-- para o Incremento 4 (Finalização + cálculos), que é quando essa função
-- pode ganhar mais lógica se precisar.

create or replace function public.finish_workout_session(p_session_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  update public.session_sets ss
  set status = 'skipped'
  from public.session_exercises se
  where ss.session_exercise_id = se.id
    and se.session_id = p_session_id
    and ss.user_id = auth.uid()
    and ss.status = 'pending';

  update public.workout_sessions
  set status = 'completed', finished_at = now()
  where id = p_session_id and user_id = auth.uid() and status = 'in_progress';
end;
$$;
