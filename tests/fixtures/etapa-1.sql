-- FitCore: etapa 1, estrutura inicial para varios ginasios.
-- Executar uma vez no projeto novo, como postgres no SQL Editor.
-- Nao cria contas nem liga a aplicacao automaticamente.
begin;

create table public.ginasios (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url text,
  criado_em timestamptz not null default now()
);

create table public.membros_ginasio (
  ginasio_id uuid not null references public.ginasios(id),
  utilizador_id uuid not null references auth.users(id),
  nome text not null check (length(trim(nome)) between 1 and 120),
  funcao text not null check (funcao in ('gestor', 'trainer', 'aluno')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  primary key (ginasio_id, utilizador_id)
);
create index membros_por_utilizador on public.membros_ginasio(utilizador_id);

alter table public.ginasios enable row level security;
alter table public.membros_ginasio enable row level security;

revoke all on table public.ginasios, public.membros_ginasio from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.ginasios, public.membros_ginasio to authenticated;
grant update (nome, logo_url) on public.ginasios to authenticated;

-- Cada conta ve apenas os seus proprios vinculos ativos.
-- Nao ha autorizacao para criar, mudar ou eliminar vinculos pelo navegador.
create policy membros_ler_proprio
on public.membros_ginasio for select to authenticated
using (utilizador_id = (select auth.uid()) and ativo);

create policy ginasios_ler_associados
on public.ginasios for select to authenticated
using (exists (
  select 1 from public.membros_ginasio m
  where m.ginasio_id = ginasios.id
    and m.utilizador_id = (select auth.uid()) and m.ativo
));

-- Apenas gestores podem alterar o nome e logotipo do seu ginasio.
create policy ginasios_gestor_editar
on public.ginasios for update to authenticated
using (exists (
  select 1 from public.membros_ginasio m
  where m.ginasio_id = ginasios.id
    and m.utilizador_id = (select auth.uid()) and m.ativo and m.funcao = 'gestor'
))
with check (exists (
  select 1 from public.membros_ginasio m
  where m.ginasio_id = ginasios.id
    and m.utilizador_id = (select auth.uid()) and m.ativo and m.funcao = 'gestor'
));

commit;
select 'Estrutura inicial criada com sucesso' as resultado;
