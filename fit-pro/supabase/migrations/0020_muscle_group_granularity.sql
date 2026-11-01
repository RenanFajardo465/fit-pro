-- Fit-Pro — Catálogo Inteligente de Exercícios (parte 3/3: granularidade de perna).
-- Execute no SQL Editor do Supabase, depois de 0019.
--
-- Seção 8 do pedido lista "Quadríceps", "Posteriores de coxa" e
-- "Panturrilhas" como grupos musculares próprios (hoje tudo isso cai no
-- genérico "perna"), além de "Antebraços". Só adiciona valores novos ao
-- enum — "perna" continua válido pra tudo que já existe, nada é renomeado
-- nem migrado automaticamente (seção 7: nunca mexer em dado existente sem
-- necessidade). Só afeta `exercises.muscle_group`; `workout_template_items`
-- e `session_exercises` guardam uma cópia livre (sem check), então nada
-- quebra lá.

alter table public.exercises
  drop constraint if exists exercises_muscle_group_check,
  add constraint exercises_muscle_group_check check (
    muscle_group in (
      'peito', 'costas', 'ombro', 'biceps', 'triceps', 'antebraco',
      'quadriceps', 'posterior_coxa', 'perna', 'gluteo', 'panturrilha',
      'abdomen', 'cardio', 'corpo_inteiro', 'outro'
    )
  );
