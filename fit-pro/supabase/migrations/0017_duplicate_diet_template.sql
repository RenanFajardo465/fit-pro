-- Fit-Pro — Fase 5, Incremento 7: duplicar dieta.
-- Execute no SQL Editor do Supabase, depois de 0013.
-- Referência: FASE0_ARQUITETURA_FITPRO.md, seção 26 (roadmap da Fase 5
-- citava "duplicação de dieta" como item próprio, que tinha ficado de fora
-- dos incrementos 3/6 por engano).
--
-- Copia a dieta inteira (refeições + itens) pra uma nova, com código único
-- gerado automaticamente (sufixo "_COPIA", "_COPIA2"... até achar um livre)
-- e nome com " (cópia)" — útil pra criar uma variação de uma dieta existente
-- sem perder a original. SECURITY INVOKER (padrão do projeto): roda com a
-- identidade e a RLS de quem chamou.
create or replace function public.duplicate_diet_template(p_diet_template_id uuid)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_name text;
  v_code text;
  v_diet_type text;
  v_new_id uuid;
  v_candidate text;
  v_suffix text;
  v_n int := 1;
begin
  select name, code, diet_type into v_name, v_code, v_diet_type
  from public.diet_templates
  where id = p_diet_template_id and user_id = auth.uid() and deleted_at is null;

  if v_name is null then
    raise exception 'Dieta não encontrada ou sem permissão';
  end if;

  loop
    v_suffix := case when v_n = 1 then '_COPIA' else '_COPIA' || v_n end;
    v_candidate := substring(v_code from 1 for greatest(1, 20 - length(v_suffix))) || v_suffix;

    exit when not exists (
      select 1 from public.diet_templates
      where user_id = auth.uid() and code = v_candidate and deleted_at is null
    );

    v_n := v_n + 1;
    if v_n > 50 then
      raise exception 'Não foi possível gerar um código único para a cópia';
    end if;
  end loop;

  insert into public.diet_templates (user_id, name, code, diet_type)
  values (auth.uid(), v_name || ' (cópia)', v_candidate, v_diet_type)
  returning id into v_new_id;

  insert into public.diet_meals (diet_template_id, user_id, order_index, name, meal_time)
  select v_new_id, auth.uid(), order_index, name, meal_time
  from public.diet_meals
  where diet_template_id = p_diet_template_id;

  insert into public.diet_meal_items (
    diet_meal_id, user_id, order_index, food_id, food_name, quantity, unit,
    grams_equivalent, calories, protein_g, carbs_g, fat_g, notes
  )
  select new_meal.id, auth.uid(), old_item.order_index, old_item.food_id, old_item.food_name,
         old_item.quantity, old_item.unit, old_item.grams_equivalent, old_item.calories,
         old_item.protein_g, old_item.carbs_g, old_item.fat_g, old_item.notes
  from public.diet_meal_items old_item
  join public.diet_meals old_meal on old_meal.id = old_item.diet_meal_id
  join public.diet_meals new_meal
    on new_meal.diet_template_id = v_new_id and new_meal.order_index = old_meal.order_index
  where old_meal.diet_template_id = p_diet_template_id;

  return v_new_id;
end;
$$;
