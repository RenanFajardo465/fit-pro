-- Fit-Pro — Fase 1: profiles + RLS base
-- Execute no SQL Editor do Supabase (ou via `supabase db push`, se você
-- estiver usando a CLI do Supabase localmente).

-- 1. Tabela de perfil, 1:1 com auth.users.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil de exibição de cada usuário. Criado automaticamente no signup pela trigger handle_new_user.';

-- 2. updated_at automático em qualquer UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- 3. Cria automaticamente um profile ao criar um usuário no Supabase Auth
--    (painel: Authentication → Add user). display_name vem do metadata
--    "display_name" se você preenchê-lo ao criar o usuário; caso contrário,
--    cai no prefixo do e-mail.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 4. Row Level Security — cada usuário só vê/edita o próprio profile.
--    (Sem policy de insert/delete: a criação é feita pela trigger acima com
--    SECURITY DEFINER, e a exclusão é em cascata a partir de auth.users.)
alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
