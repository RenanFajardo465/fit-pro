-- Fit-Pro — Fase 5, Incremento 5: meta nutricional diária no profile.
-- Execute no SQL Editor do Supabase, depois de 0001_profiles.sql.

alter table public.profiles
  add column if not exists daily_calorie_goal numeric,
  add column if not exists daily_protein_goal_g numeric;

alter table public.profiles
  add constraint profiles_daily_calorie_goal_check
    check (daily_calorie_goal is null or daily_calorie_goal > 0);

alter table public.profiles
  add constraint profiles_daily_protein_goal_g_check
    check (daily_protein_goal_g is null or daily_protein_goal_g > 0);

comment on column public.profiles.daily_calorie_goal is
  'Meta diária de calorias (kcal), opcional. Usada no resumo do Hoje e do diário do dia.';
comment on column public.profiles.daily_protein_goal_g is
  'Meta diária de proteína (g), opcional. Usada no resumo do Hoje e do diário do dia.';
