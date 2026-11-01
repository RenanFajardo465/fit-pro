-- Fit-Pro — Catálogo Inteligente de Exercícios (parte 2/2: bloqueio real).
-- Execute no SQL Editor do Supabase, depois de 0018.
--
-- A 0018 só adicionou colunas/tabela/funções (nada quebra). Esta migration
-- é a que de fato BLOQUEIA duplicata — nome igual (ignorando
-- maiúscula/acento/espaço) pro mesmo usuário, seja criando um exercício
-- novo, seja criando um alias que colide com outro exercício/alias já
-- existente. Isso vale tanto pra UI quanto pra qualquer chamada direta à
-- API/RPC (seção 10 do pedido) — o trigger roda no banco, não dá pra
-- contornar pelo cliente.
--
-- *** ANTES DE RODAR ***: se você já tem dois exercícios na sua biblioteca
-- com o mesmo nome (ignorando acento/maiúscula/espaço) — ex.: "Supino
-- Reto" e "supino reto " cadastrados os dois — esta migration vai PARAR
-- com um erro listando exatamente quais, em vez de travar peças do seu
-- histórico. Rode esta consulta de diagnóstico primeiro pra conferir:
--
--   select user_id, public.normalize_exercise_name(name) as nome_normalizado,
--          array_agg(name) as nomes_cadastrados, array_agg(id) as ids
--   from public.exercises
--   where deleted_at is null
--   group by user_id, public.normalize_exercise_name(name)
--   having count(*) > 1;
--
-- Se vier alguma linha, decida manualmente (seção 5/7 do pedido — nunca
-- fusão automática): mantenha um dos dois como o exercício oficial, apague
-- (soft delete, pela própria tela de Biblioteca) ou renomeie o outro antes
-- de rodar esta migration de novo. Ela é segura de rodar quantas vezes
-- precisar (idempotente) assim que não houver mais colisão.

do $$
declare
  v_conflict record;
  v_count int := 0;
  v_message text := '';
begin
  for v_conflict in
    select user_id, public.normalize_exercise_name(name) as normalized,
           array_agg(name order by created_at) as names, array_agg(id order by created_at) as ids
    from public.exercises
    where deleted_at is null
    group by user_id, public.normalize_exercise_name(name)
    having count(*) > 1
  loop
    v_count := v_count + 1;
    v_message := v_message || format(
      E'\n  usuário %s: %s (ids: %s)',
      v_conflict.user_id, array_to_string(v_conflict.names, ' | '), array_to_string(v_conflict.ids, ', ')
    );
  end loop;

  if v_count > 0 then
    raise exception E'Encontrei % nome(s) de exercício colidindo (mesmo texto ignorando acento/maiúscula/espaço) — resolva manualmente antes de travar o índice único:%',
      v_count, v_message;
  end if;
end $$;

-- Mesma checagem pros aliases — colisão entre dois aliases do mesmo
-- usuário, OU alias que já é igual ao nome de algum exercício.
do $$
declare
  v_conflict record;
  v_count int := 0;
  v_message text := '';
begin
  for v_conflict in
    select user_id, public.normalize_exercise_name(alias) as normalized,
           array_agg(alias order by created_at) as aliases, array_agg(id order by created_at) as ids
    from public.exercise_aliases
    group by user_id, public.normalize_exercise_name(alias)
    having count(*) > 1
  loop
    v_count := v_count + 1;
    v_message := v_message || format(
      E'\n  usuário %s: %s (ids: %s)',
      v_conflict.user_id, array_to_string(v_conflict.aliases, ' | '), array_to_string(v_conflict.ids, ', ')
    );
  end loop;

  if v_count > 0 then
    raise exception E'Encontrei % sinônimo(s) duplicado(s) — resolva manualmente antes de travar o índice único:%',
      v_count, v_message;
  end if;
end $$;

-- Índices únicos (defesa extra, além do trigger abaixo): nome de
-- exercício normalizado é único por usuário; alias normalizado é único
-- por usuário.
create unique index if not exists exercises_user_normalized_name_idx
  on public.exercises (user_id, public.normalize_exercise_name(name))
  where deleted_at is null;

create unique index if not exists exercise_aliases_user_normalized_alias_idx
  on public.exercise_aliases (user_id, public.normalize_exercise_name(alias));

-- Trigger de verdade (seção 10: "o sistema não permita duplicidades por
-- chamadas diretas à API" — isso cobre qualquer client, não só o app).
-- Bloqueia: nome de exercício novo/editado colidindo com outro exercício
-- OU com um alias já existente do mesmo usuário.
create or replace function public.check_exercise_name_not_duplicate()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_normalized text;
  v_existing_exercise record;
  v_existing_alias record;
begin
  v_normalized := public.normalize_exercise_name(new.name);

  select id, name into v_existing_exercise
  from public.exercises
  where user_id = new.user_id
    and deleted_at is null
    and id <> new.id
    and public.normalize_exercise_name(name) = v_normalized
  limit 1;

  if found then
    raise exception 'Já existe um exercício com esse nome (ou equivalente): "%". Use o exercício existente, ou cadastre este como sinônimo dele.', v_existing_exercise.name
      using errcode = 'unique_violation';
  end if;

  select id, alias into v_existing_alias
  from public.exercise_aliases
  where user_id = new.user_id
    and public.normalize_exercise_name(alias) = v_normalized
  limit 1;

  if found then
    raise exception 'Esse nome já existe como sinônimo de outro exercício: "%". Use o exercício oficial correspondente.', v_existing_alias.alias
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists check_exercise_name_not_duplicate on public.exercises;
create trigger check_exercise_name_not_duplicate
  before insert or update of name on public.exercises
  for each row
  execute function public.check_exercise_name_not_duplicate();

create or replace function public.check_exercise_alias_not_duplicate()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_normalized text;
  v_existing_exercise record;
  v_existing_alias record;
begin
  v_normalized := public.normalize_exercise_name(new.alias);

  select id, name into v_existing_exercise
  from public.exercises
  where user_id = new.user_id
    and deleted_at is null
    and public.normalize_exercise_name(name) = v_normalized
  limit 1;

  if found then
    raise exception 'Esse sinônimo já é o nome oficial de outro exercício: "%".', v_existing_exercise.name
      using errcode = 'unique_violation';
  end if;

  select id, alias into v_existing_alias
  from public.exercise_aliases
  where user_id = new.user_id
    and id <> new.id
    and public.normalize_exercise_name(alias) = v_normalized
  limit 1;

  if found then
    raise exception 'Esse sinônimo já existe para outro exercício: "%".', v_existing_alias.alias
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists check_exercise_alias_not_duplicate on public.exercise_aliases;
create trigger check_exercise_alias_not_duplicate
  before insert or update of alias on public.exercise_aliases
  for each row
  execute function public.check_exercise_alias_not_duplicate();
