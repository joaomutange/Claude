-- FitCore: etapa 2, tabelas da aplicacao.
-- Perfis, exercicios, planos de treino, registos de progresso,
-- planos de mensalidade, subscricoes e pagamentos.
--
-- Requisito: a etapa 1 (fitcore_etapa1.sql) ja foi executada.
-- Executar uma vez, como postgres no SQL Editor.
--
-- Regras de acesso (resumo):
--   gestor  -> gere tudo no seu ginasio, incluindo mensalidades e pagamentos
--   trainer -> gere exercicios, planos de treino e progresso dos alunos do seu ginasio
--   aluno   -> ve o seu plano, regista os seus treinos e medicoes, ve os seus pagamentos
-- Dados da aplicação separados por ginásio. Vínculos inativos perdem acesso ao ginásio.
-- Perfis são privados da própria conta; staff consulta nomes em membros_ginasio.
-- O servidor confirma pagamentos online. Gestores registam apenas pagamentos manuais.
-- Esta migração cria tabelas; não acrescenta os módulos ao site.
-- Não executar se a etapa 2 anterior já foi criada. Nesse caso é necessária outra migração.
begin;

-- Confirma que a etapa 1 existe antes de continuar.
do $$
begin
  if to_regclass('public.membros_ginasio') is null
     or to_regclass('public.ginasios') is null
     or to_regprocedure('privado.e_gestor(uuid)') is null then
    raise exception 'Executa primeiro a etapa 1 (fitcore_etapa1.sql).';
  end if;
  if exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = any(array[
      'perfis','exercicios','planos_treino','treinos','treino_exercicios',
      'registos_treino','registos_series','medicoes','planos_mensalidade',
      'subscricoes','pagamentos','historico_pagamentos'
    ])
  ) then
    raise exception 'A etapa 2 já existe parcialmente ou completamente. Não recrie as tabelas; use uma migração de atualização.';
  end if;
end $$;

-- ===============================================================
-- Funcoes auxiliares (schema privado, nao exposto pela API)
-- ===============================================================

-- Tem vinculo ativo no ginasio (qualquer funcao).
create function privado.e_membro(g uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membros_ginasio m
    where m.ginasio_id = g and m.utilizador_id = (select auth.uid()) and m.ativo
  );
$$;

-- E gestor ou trainer ativo no ginasio.
create function privado.e_staff(g uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membros_ginasio m
    where m.ginasio_id = g and m.utilizador_id = (select auth.uid())
      and m.ativo and m.funcao in ('gestor', 'trainer')
  );
$$;

alter function privado.e_membro(uuid) owner to postgres;
alter function privado.e_staff(uuid) owner to postgres;
revoke all on function privado.e_membro(uuid), privado.e_staff(uuid)
  from public, anon, authenticated;
grant usage on schema privado to authenticated;
grant execute on function privado.e_membro(uuid), privado.e_staff(uuid)
  to authenticated;

-- Atualiza a coluna atualizado_em automaticamente.
create function privado.tocar_atualizado_em()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

-- Trainers tambem passam a ver os membros do seu ginasio
-- (precisam disso para atribuir planos). Substitui a politica so de gestores.
drop policy if exists membros_gestor_ler_ginasio on public.membros_ginasio;
drop policy if exists membros_staff_ler_ginasio on public.membros_ginasio;
create policy membros_staff_ler_ginasio
on public.membros_ginasio for select to authenticated
using (privado.e_staff(ginasio_id));

-- ===============================================================
-- Perfis (um por conta, criado automaticamente)
-- ===============================================================
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 120),
  telefone text check (telefone is null or telefone ~ '^\+?[0-9 ]{6,20}$'),
  data_nascimento date check (data_nascimento is null or data_nascimento > '1900-01-01'),
  avatar_url text
    check (avatar_url is null or (avatar_url ~ '^https://' and length(avatar_url) <= 500)),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger perfis_atualizado_em before update on public.perfis
for each row execute function privado.tocar_atualizado_em();

-- Cria o perfil quando uma conta nova se regista.
-- O nome vem de raw_user_meta_data.nome (definido no signUp da app) ou do email.
create function privado.criar_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
                  nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
                  'Utilizador'), 120)
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function privado.criar_perfil() from public, anon, authenticated;

create trigger ao_criar_utilizador after insert on auth.users
for each row execute function privado.criar_perfil();

-- Perfis para contas que ja existam antes deste script.
insert into public.perfis (id, nome)
select u.id,
       left(coalesce(nullif(trim(u.raw_user_meta_data ->> 'nome'), ''),
                     nullif(trim(split_part(coalesce(u.email, ''), '@', 1)), ''),
                     'Utilizador'), 120)
from auth.users u
on conflict (id) do nothing;

-- ===============================================================
-- Exercicios (biblioteca de cada ginasio)
-- ===============================================================
create table public.exercicios (
  id uuid primary key default gen_random_uuid(),
  ginasio_id uuid not null references public.ginasios(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 120),
  grupo_muscular text check (grupo_muscular in (
    'peito', 'costas', 'ombros', 'biceps', 'triceps', 'antebraco',
    'abdominais', 'quadriceps', 'posteriores', 'gluteos', 'gemeos',
    'corpo_inteiro', 'cardio', 'mobilidade')),
  equipamento text check (equipamento is null or length(equipamento) <= 80),
  descricao text check (descricao is null or length(descricao) <= 2000),
  video_url text
    check (video_url is null or (video_url ~ '^https://' and length(video_url) <= 500)),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (id, ginasio_id),
  unique (ginasio_id, nome)
);

-- ===============================================================
-- Planos de treino (ficha de um aluno) -> treinos (A, B, C...) -> exercicios
-- ===============================================================
create table public.planos_treino (
  id uuid primary key default gen_random_uuid(),
  ginasio_id uuid not null,
  aluno_id uuid not null,
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  nome text not null check (length(trim(nome)) between 1 and 120),
  objetivo text check (objetivo in (
    'hipertrofia', 'forca', 'emagrecimento', 'resistencia', 'saude', 'reabilitacao', 'outro')),
  notas text check (notas is null or length(notas) <= 2000),
  data_inicio date not null default current_date,
  data_fim date,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, ginasio_id),
  check (data_fim is null or data_fim >= data_inicio),
  -- O aluno tem de pertencer ao mesmo ginasio.
  foreign key (ginasio_id, aluno_id)
    references public.membros_ginasio(ginasio_id, utilizador_id) on delete cascade
);
create index planos_por_aluno on public.planos_treino(ginasio_id, aluno_id);

create trigger planos_atualizado_em before update on public.planos_treino
for each row execute function privado.tocar_atualizado_em();

create table public.treinos (
  id uuid primary key default gen_random_uuid(),
  ginasio_id uuid not null,
  plano_id uuid not null,
  nome text not null check (length(trim(nome)) between 1 and 60),  -- ex.: "Treino A - Peito"
  ordem smallint not null default 1 check (ordem between 1 and 50),
  unique (id, ginasio_id),
  foreign key (plano_id, ginasio_id)
    references public.planos_treino(id, ginasio_id) on delete cascade
);
create index treinos_por_plano on public.treinos(plano_id);

create table public.treino_exercicios (
  id uuid primary key default gen_random_uuid(),
  ginasio_id uuid not null,
  treino_id uuid not null,
  exercicio_id uuid not null,
  ordem smallint not null default 1 check (ordem between 1 and 100),
  series smallint not null default 3 check (series between 1 and 20),
  repeticoes text not null default '10' check (repeticoes ~ '^[0-9]{1,3}(-[0-9]{1,3})?$|^ate falhar$|^[0-9]{1,4}s$'),
  carga_kg numeric(6,2) check (carga_kg is null or carga_kg >= 0),
  descanso_seg smallint check (descanso_seg is null or descanso_seg between 0 and 1800),
  notas text check (notas is null or length(notas) <= 500),
  foreign key (treino_id, ginasio_id)
    references public.treinos(id, ginasio_id) on delete cascade,
  foreign key (exercicio_id, ginasio_id)
    references public.exercicios(id, ginasio_id) on delete restrict
);
create index treino_exercicios_por_treino on public.treino_exercicios(treino_id);
create index treino_exercicios_por_exercicio on public.treino_exercicios(exercicio_id);

-- ===============================================================
-- Progresso: treinos realizados, series feitas e medicoes
-- ===============================================================
create table public.registos_treino (
  id uuid primary key default gen_random_uuid(),
  ginasio_id uuid not null,
  aluno_id uuid not null,
  treino_id uuid,  -- opcional: treino livre fica sem plano
  realizado_em timestamptz not null default now(),
  duracao_min smallint check (duracao_min is null or duracao_min between 1 and 600),
  esforco smallint check (esforco is null or esforco between 1 and 10),
  notas text check (notas is null or length(notas) <= 1000),
  unique (id, ginasio_id),
  foreign key (ginasio_id, aluno_id)
    references public.membros_ginasio(ginasio_id, utilizador_id) on delete cascade,
  foreign key (treino_id, ginasio_id)
    references public.treinos(id, ginasio_id) on delete set null (treino_id)
);
create index registos_por_aluno on public.registos_treino(ginasio_id, aluno_id, realizado_em desc);
create index registos_por_treino on public.registos_treino(treino_id);

create table public.registos_series (
  id uuid primary key default gen_random_uuid(),
  ginasio_id uuid not null,
  registo_id uuid not null,
  exercicio_id uuid not null,
  serie smallint not null check (serie between 1 and 50),
  repeticoes smallint check (repeticoes is null or repeticoes between 0 and 1000),
  carga_kg numeric(6,2) check (carga_kg is null or carga_kg >= 0),
  foreign key (registo_id, ginasio_id)
    references public.registos_treino(id, ginasio_id) on delete cascade,
  foreign key (exercicio_id, ginasio_id)
    references public.exercicios(id, ginasio_id) on delete restrict
);
create index series_por_registo on public.registos_series(registo_id);
create index series_por_exercicio on public.registos_series(exercicio_id);

create table public.medicoes (
  id uuid primary key default gen_random_uuid(),
  ginasio_id uuid not null,
  aluno_id uuid not null,
  registado_por uuid default auth.uid() references auth.users(id) on delete set null,
  medido_em date not null default current_date,
  peso_kg numeric(5,2) check (peso_kg is null or peso_kg between 20 and 400),
  altura_cm numeric(5,1) check (altura_cm is null or altura_cm between 80 and 250),
  gordura_pct numeric(4,1) check (gordura_pct is null or gordura_pct between 2 and 70),
  cintura_cm numeric(5,1) check (cintura_cm is null or cintura_cm between 30 and 250),
  anca_cm numeric(5,1) check (anca_cm is null or anca_cm between 30 and 250),
  peito_cm numeric(5,1) check (peito_cm is null or peito_cm between 30 and 250),
  braco_cm numeric(4,1) check (braco_cm is null or braco_cm between 10 and 80),
  coxa_cm numeric(4,1) check (coxa_cm is null or coxa_cm between 20 and 120),
  notas text check (notas is null or length(notas) <= 1000),
  criado_em timestamptz not null default now(),
  foreign key (ginasio_id, aluno_id)
    references public.membros_ginasio(ginasio_id, utilizador_id) on delete cascade
);
create index medicoes_por_aluno on public.medicoes(ginasio_id, aluno_id, medido_em desc);

-- ===============================================================
-- Mensalidades, subscricoes e pagamentos
-- ===============================================================
create table public.planos_mensalidade (
  id uuid primary key default gen_random_uuid(),
  ginasio_id uuid not null references public.ginasios(id) on delete cascade,
  nome text not null check (length(trim(nome)) between 1 and 80),
  descricao text check (descricao is null or length(descricao) <= 500),
  preco numeric(12,2) not null check (preco >= 0),
  moeda char(3) not null default 'AOA' check (moeda ~ '^[A-Z]{3}$'),
  duracao_dias smallint not null default 30 check (duracao_dias between 1 and 730),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (id, ginasio_id)
);

create table public.subscricoes (
  id uuid primary key default gen_random_uuid(),
  ginasio_id uuid not null,
  aluno_id uuid not null,
  plano_id uuid not null,
  inicio date not null default current_date,
  fim date not null,
  -- Guardados na contratação; não mudam quando o catálogo muda.
  preco_contratado numeric(12,2) not null check (preco_contratado >= 0),
  moeda_contratada char(3) not null check (moeda_contratada ~ '^[A-Z]{3}$'),
  estado text not null default 'ativa'
    check (estado in ('ativa', 'pausada', 'cancelada', 'expirada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, ginasio_id),
  unique (id, ginasio_id, aluno_id),
  check (fim >= inicio),
  foreign key (ginasio_id, aluno_id)
    references public.membros_ginasio(ginasio_id, utilizador_id) on delete restrict,
  foreign key (plano_id, ginasio_id)
    references public.planos_mensalidade(id, ginasio_id) on delete restrict
);
create index subscricoes_por_aluno on public.subscricoes(ginasio_id, aluno_id, fim desc);
create index subscricoes_por_plano on public.subscricoes(plano_id);

create trigger subscricoes_atualizado_em before update on public.subscricoes
for each row execute function privado.tocar_atualizado_em();

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  ginasio_id uuid not null,
  aluno_id uuid not null,
  subscricao_id uuid,
  registado_por uuid default auth.uid() references auth.users(id) on delete set null,
  valor numeric(12,2) not null check (valor > 0),
  moeda char(3) not null default 'AOA' check (moeda ~ '^[A-Z]{3}$'),
  metodo text not null
    check (metodo in ('dinheiro', 'multicaixa_express', 'referencia', 'transferencia', 'cartao', 'outro')),
  estado text not null default 'pendente'
    check (estado in ('pendente', 'pago', 'falhado', 'reembolsado')),
  referencia text check (referencia is null or length(referencia) <= 120),
  pago_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (estado <> 'pago' or pago_em is not null),
  -- Pagamentos nunca desaparecem em cascata: preservam o historico financeiro.
  foreign key (ginasio_id, aluno_id)
    references public.membros_ginasio(ginasio_id, utilizador_id) on delete restrict,
  foreign key (subscricao_id, ginasio_id, aluno_id)
    references public.subscricoes(id, ginasio_id, aluno_id) on delete restrict
);
create index pagamentos_por_aluno on public.pagamentos(ginasio_id, aluno_id, criado_em desc);
create index pagamentos_por_estado on public.pagamentos(ginasio_id, estado);
create index pagamentos_por_subscricao on public.pagamentos(subscricao_id);

create trigger pagamentos_atualizado_em before update on public.pagamentos
for each row execute function privado.tocar_atualizado_em();

-- ===============================================================
-- Permissoes base
-- ===============================================================
alter table public.perfis              enable row level security;
alter table public.exercicios          enable row level security;
alter table public.planos_treino       enable row level security;
alter table public.treinos             enable row level security;
alter table public.treino_exercicios   enable row level security;
alter table public.registos_treino     enable row level security;
alter table public.registos_series     enable row level security;
alter table public.medicoes            enable row level security;
alter table public.planos_mensalidade  enable row level security;
alter table public.subscricoes         enable row level security;
alter table public.pagamentos          enable row level security;

revoke all on table
  public.perfis, public.exercicios, public.planos_treino, public.treinos,
  public.treino_exercicios, public.registos_treino, public.registos_series,
  public.medicoes, public.planos_mensalidade, public.subscricoes, public.pagamentos
from public, anon, authenticated, service_role;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on table
  public.perfis, public.exercicios, public.planos_treino, public.treinos,
  public.treino_exercicios, public.registos_treino, public.registos_series,
  public.medicoes, public.planos_mensalidade, public.subscricoes
to service_role;
grant select, insert, update on public.pagamentos to service_role;

grant select on public.perfis to authenticated;
grant update (nome, telefone, data_nascimento, avatar_url) on public.perfis to authenticated;

grant select, insert, update, delete on
  public.exercicios, public.planos_treino, public.treinos, public.treino_exercicios,
  public.registos_treino, public.registos_series, public.medicoes,
  public.planos_mensalidade, public.subscricoes
to authenticated;

-- Pagamentos manuais podem ser registados pelo gestor.
-- Triggers abaixo bloqueiam confirmação online pelo navegador e alterações
-- a pagamentos confirmados. Nenhuma função de aplicação recebe DELETE.
grant select, insert, update on public.pagamentos to authenticated;

-- ===============================================================
-- Politicas
-- ===============================================================

-- Perfil pessoal global: só a própria conta consulta e edita.
-- Staff usa membros_ginasio para consultar os nomes do seu ginásio.
create policy perfis_ler_proprio on public.perfis for select to authenticated
using (id = (select auth.uid()));
create policy perfis_editar_proprio on public.perfis for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Exercicios: membros veem; staff gere.
create policy exercicios_ler on public.exercicios for select to authenticated
using (privado.e_membro(ginasio_id));
create policy exercicios_staff_inserir on public.exercicios for insert to authenticated
with check (privado.e_staff(ginasio_id));
create policy exercicios_staff_editar on public.exercicios for update to authenticated
using (privado.e_staff(ginasio_id)) with check (privado.e_staff(ginasio_id));
create policy exercicios_staff_apagar on public.exercicios for delete to authenticated
using (privado.e_staff(ginasio_id));

-- Planos de treino: aluno ve os seus; staff gere todos do ginasio.
create policy planos_aluno_ler on public.planos_treino for select to authenticated
using (aluno_id = (select auth.uid()) and privado.e_membro(ginasio_id));
create policy planos_staff_ler on public.planos_treino for select to authenticated
using (privado.e_staff(ginasio_id));
create policy planos_staff_inserir on public.planos_treino for insert to authenticated
with check (privado.e_staff(ginasio_id));
create policy planos_staff_editar on public.planos_treino for update to authenticated
using (privado.e_staff(ginasio_id)) with check (privado.e_staff(ginasio_id));
create policy planos_staff_apagar on public.planos_treino for delete to authenticated
using (privado.e_staff(ginasio_id));

-- Treinos (dentro de um plano): visiveis a quem ve o plano; staff gere.
create policy treinos_ler on public.treinos for select to authenticated
using (exists (select 1 from public.planos_treino p where p.id = treinos.plano_id));
create policy treinos_staff_inserir on public.treinos for insert to authenticated
with check (privado.e_staff(ginasio_id));
create policy treinos_staff_editar on public.treinos for update to authenticated
using (privado.e_staff(ginasio_id)) with check (privado.e_staff(ginasio_id));
create policy treinos_staff_apagar on public.treinos for delete to authenticated
using (privado.e_staff(ginasio_id));

-- Exercicios de cada treino: visiveis a quem ve o treino; staff gere.
create policy treino_ex_ler on public.treino_exercicios for select to authenticated
using (exists (select 1 from public.treinos t where t.id = treino_exercicios.treino_id));
create policy treino_ex_staff_inserir on public.treino_exercicios for insert to authenticated
with check (privado.e_staff(ginasio_id));
create policy treino_ex_staff_editar on public.treino_exercicios for update to authenticated
using (privado.e_staff(ginasio_id)) with check (privado.e_staff(ginasio_id));
create policy treino_ex_staff_apagar on public.treino_exercicios for delete to authenticated
using (privado.e_staff(ginasio_id));

-- Treinos realizados: o aluno gere os seus; staff ve e corrige os do ginasio.
create policy registos_aluno_tudo on public.registos_treino for all to authenticated
using (aluno_id = (select auth.uid()) and privado.e_membro(ginasio_id))
with check (aluno_id = (select auth.uid()) and privado.e_membro(ginasio_id));
create policy registos_staff_tudo on public.registos_treino for all to authenticated
using (privado.e_staff(ginasio_id)) with check (privado.e_staff(ginasio_id));

-- Series feitas: seguem o registo a que pertencem.
create policy series_aluno_tudo on public.registos_series for all to authenticated
using (exists (
  select 1 from public.registos_treino r
  where r.id = registos_series.registo_id and r.aluno_id = (select auth.uid())
    and privado.e_membro(r.ginasio_id)))
with check (exists (
  select 1 from public.registos_treino r
  where r.id = registos_series.registo_id and r.aluno_id = (select auth.uid())
    and privado.e_membro(r.ginasio_id)));
create policy series_staff_tudo on public.registos_series for all to authenticated
using (privado.e_staff(ginasio_id)) with check (privado.e_staff(ginasio_id));

-- Medicoes: o aluno gere as suas; staff gere as do ginasio.
create policy medicoes_aluno_tudo on public.medicoes for all to authenticated
using (aluno_id = (select auth.uid()) and privado.e_membro(ginasio_id))
with check (aluno_id = (select auth.uid()) and privado.e_membro(ginasio_id));
create policy medicoes_staff_tudo on public.medicoes for all to authenticated
using (privado.e_staff(ginasio_id)) with check (privado.e_staff(ginasio_id));

-- Planos de mensalidade: membros veem os ativos; gestor gere.
create policy mensalidades_ler on public.planos_mensalidade for select to authenticated
using (ativo and privado.e_membro(ginasio_id));
create policy mensalidades_gestor_tudo on public.planos_mensalidade for all to authenticated
using (privado.e_gestor(ginasio_id)) with check (privado.e_gestor(ginasio_id));

-- Subscricoes: aluno ve as suas; staff ve as do ginasio; so o gestor altera.
create policy subscricoes_aluno_ler on public.subscricoes for select to authenticated
using (aluno_id = (select auth.uid()) and privado.e_membro(ginasio_id));
create policy subscricoes_staff_ler on public.subscricoes for select to authenticated
using (privado.e_staff(ginasio_id));
create policy subscricoes_gestor_inserir on public.subscricoes for insert to authenticated
with check (privado.e_gestor(ginasio_id));
create policy subscricoes_gestor_editar on public.subscricoes for update to authenticated
using (privado.e_gestor(ginasio_id)) with check (privado.e_gestor(ginasio_id));
create policy subscricoes_gestor_apagar on public.subscricoes for delete to authenticated
using (privado.e_gestor(ginasio_id));

-- Pagamentos: aluno ve os seus; so o gestor regista e corrige (trainers nao veem).
-- Pagamentos online (Multicaixa Express, cartao) devem ser confirmados pelo servidor.
create policy pagamentos_aluno_ler on public.pagamentos for select to authenticated
using (aluno_id = (select auth.uid()) and privado.e_membro(ginasio_id));
create policy pagamentos_gestor_ler on public.pagamentos for select to authenticated
using (privado.e_gestor(ginasio_id));
create policy pagamentos_gestor_inserir on public.pagamentos for insert to authenticated
with check (privado.e_gestor(ginasio_id));
create policy pagamentos_gestor_editar on public.pagamentos for update to authenticated
using (privado.e_gestor(ginasio_id)) with check (privado.e_gestor(ginasio_id));


-- ===============================================================
-- Validações e autoria: as políticas não substituem estas regras
-- ===============================================================

-- Referências de aluno devem apontar para um aluno ativo na criação.
-- Staff pode consultar/corrigir registos históricos de alunos inativos.
create function privado.validar_aluno()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.membros_ginasio m
    where m.ginasio_id = new.ginasio_id
      and m.utilizador_id = new.aluno_id
      and m.funcao = 'aluno' and m.ativo
  ) then
    raise exception 'É necessário um aluno ativo deste ginásio.';
  end if;
  return new;
end $$;

-- Não permite referenciar um treino atribuído a outra pessoa.
create function privado.validar_registo_treino()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.treino_id is not null and not exists (
    select 1 from public.treinos t
    join public.planos_treino p
      on p.id = t.plano_id and p.ginasio_id = t.ginasio_id
    where t.id = new.treino_id and t.ginasio_id = new.ginasio_id
      and p.aluno_id = new.aluno_id
  ) then
    raise exception 'O treino deve pertencer ao aluno e ao ginásio do registo.';
  end if;
  return new;
end $$;

-- Protege identificadores, contexto e autoria em atualizações.
-- Em inserts, a conta autenticada não pode atribuir a autoria a outra pessoa.
-- Chamadas administrativas sem utilizador podem fornecer a autoria.
create function privado.proteger_contexto()
returns trigger language plpgsql set search_path = '' as $$
declare
  anterior jsonb;
  novo jsonb := to_jsonb(new);
  campo text;
  autor uuid := auth.uid();
begin
  if tg_op = 'UPDATE' then
    anterior := to_jsonb(old);
    foreach campo in array array[
      'id','ginasio_id','aluno_id','plano_id','treino_id','exercicio_id',
      'registo_id','subscricao_id','criado_por','registado_por','criado_em'
    ] loop
      if (novo -> campo) is distinct from (anterior -> campo) then
        raise exception 'O campo % não pode ser alterado neste registo.', campo;
      end if;
    end loop;
  else
    if novo ? 'criado_em' then
      novo := jsonb_set(novo, '{criado_em}', to_jsonb(now()));
    end if;
    if autor is not null then
      foreach campo in array array['criado_por','registado_por'] loop
        if novo ? campo then
          novo := jsonb_set(novo, array[campo], to_jsonb(autor));
        end if;
      end loop;
    end if;
    new := jsonb_populate_record(new, novo);
  end if;
  return new;
end $$;

-- Os preços da subscrição são copiados do catálogo na criação.
-- Alterar o preço do plano não reescreve o preço contratado.
create function privado.preco_da_subscricao()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    select p.preco, p.moeda
      into new.preco_contratado, new.moeda_contratada
    from public.planos_mensalidade p
    where p.id = new.plano_id and p.ginasio_id = new.ginasio_id;
    if not found then
      raise exception 'Plano de mensalidade inexistente ou sem autorização.';
    end if;
  elsif new.plano_id is distinct from old.plano_id
     or new.preco_contratado is distinct from old.preco_contratado
     or new.moeda_contratada is distinct from old.moeda_contratada then
    raise exception 'Para mudar de plano ou preço, crie uma nova subscrição.';
  end if;
  return new;
end $$;

-- Manual: dinheiro, transferência e outro (por exemplo pagamento presencial).
-- Online: multicaixa_express, referencia, cartao. Apenas servidor confirma.
-- Este trigger é SECURITY INVOKER: current_user é o papel da chamada.
create function privado.proteger_pagamento()
returns trigger language plpgsql set search_path = '' as $$
declare
  administrativo boolean := current_user in ('postgres','service_role');
begin
  if tg_op = 'DELETE' then
    raise exception 'Pagamentos não podem ser eliminados; registe correções ou reembolsos.';
  end if;
  if not administrativo then
    if new.metodo in ('multicaixa_express','referencia','cartao') then
      raise exception 'Pagamentos online são registados e confirmados pelo servidor.';
    end if;
    if tg_op = 'UPDATE' then
      if old.metodo in ('multicaixa_express','referencia','cartao') then
        raise exception 'Pagamentos online são alterados apenas pelo servidor.';
      end if;
      if old.estado in ('pago','reembolsado') then
        raise exception 'Pagamentos confirmados são corrigidos pelo servidor.';
      end if;
    end if;
    if new.estado = 'reembolsado' then
      raise exception 'Reembolsos são registados pelo servidor.';
    end if;
  end if;
  if tg_op = 'UPDATE' and old.estado in ('pago','reembolsado') then
    if new.valor is distinct from old.valor
       or new.moeda is distinct from old.moeda
       or new.subscricao_id is distinct from old.subscricao_id
       or new.metodo is distinct from old.metodo
       or new.referencia is distinct from old.referencia
       or new.pago_em is distinct from old.pago_em then
      raise exception 'Não reescreva os dados de um pagamento confirmado.';
    end if;
    if old.estado = 'pago' and new.estado not in ('pago','reembolsado') then
      raise exception 'Um pagamento pago só pode passar a reembolsado.';
    end if;
    if old.estado = 'reembolsado' and new.estado <> 'reembolsado' then
      raise exception 'Um pagamento reembolsado não pode regressar a outro estado.';
    end if;
  end if;
  return new;
end $$;

-- Histórico financeiro: cada alteração é registada automaticamente.
-- Nenhum papel da aplicação recebe escrita direta neste histórico.
create table public.historico_pagamentos (
  id uuid primary key default gen_random_uuid(),
  ginasio_id uuid not null,
  pagamento_id uuid not null references public.pagamentos(id) on delete restrict,
  autor_id uuid references auth.users(id) on delete set null,
  papel text not null,
  operacao text not null check (operacao in ('INSERT','UPDATE')),
  antes jsonb,
  depois jsonb not null,
  ocorrido_em timestamptz not null default now()
);
create index historico_por_pagamento
  on public.historico_pagamentos(pagamento_id, ocorrido_em);
create index historico_por_ginasio
  on public.historico_pagamentos(ginasio_id, ocorrido_em);
alter table public.historico_pagamentos enable row level security;
revoke all on public.historico_pagamentos from public, anon, authenticated, service_role;
grant select on public.historico_pagamentos to authenticated, service_role;
create policy historico_gestor_ler on public.historico_pagamentos
for select to authenticated using (privado.e_gestor(ginasio_id));

create function privado.auditar_pagamento()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.historico_pagamentos(
    ginasio_id, pagamento_id, autor_id, papel, operacao, antes, depois
  ) values (
    new.ginasio_id, new.id, auth.uid(), coalesce(auth.role(), 'administrativo'),
    tg_op, case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end $$;

-- Trigger functions não são endpoints para o navegador.
alter function privado.validar_aluno() owner to postgres;
alter function privado.validar_registo_treino() owner to postgres;
alter function privado.criar_perfil() owner to postgres;
alter function privado.auditar_pagamento() owner to postgres;
revoke all on function
  privado.validar_aluno(), privado.validar_registo_treino(),
  privado.proteger_contexto(), privado.preco_da_subscricao(),
  privado.proteger_pagamento(), privado.auditar_pagamento(),
  privado.tocar_atualizado_em(), privado.criar_perfil()
from public, anon, authenticated;

-- Instalar as proteções nas tabelas correspondentes.
do $$
declare tabela text;
begin
  foreach tabela in array array[
    'perfis','exercicios','planos_treino','treinos','treino_exercicios',
    'registos_treino','registos_series','medicoes','planos_mensalidade',
    'subscricoes','pagamentos'
  ] loop
    execute format(
      'create trigger contexto_protegido before insert or update on public.%I for each row execute function privado.proteger_contexto()',
      tabela
    );
  end loop;
  foreach tabela in array array['planos_treino','registos_treino','medicoes','subscricoes','pagamentos'] loop
    execute format(
      'create trigger aluno_validado before insert on public.%I for each row execute function privado.validar_aluno()',
      tabela
    );
  end loop;
end $$;

create trigger registo_treino_validado before insert or update
on public.registos_treino for each row execute function privado.validar_registo_treino();
create trigger preco_contratado_guardado before insert or update
on public.subscricoes for each row execute function privado.preco_da_subscricao();
create trigger pagamento_protegido before insert or update or delete
on public.pagamentos for each row execute function privado.proteger_pagamento();
create trigger pagamento_auditado after insert or update
on public.pagamentos for each row execute function privado.auditar_pagamento();

commit;
select 'Etapa 2 corrigida criada com sucesso' as resultado;