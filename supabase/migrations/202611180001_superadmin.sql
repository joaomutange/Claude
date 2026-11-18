-- FitCore: painel global. Backup e teste numa cópia antes da produção.
-- Não executar novamente as migrations antigas 001/002 depois desta.
begin;
do $$ begin
 if to_regclass('public.superadmins') is null or to_regclass('public.membros_ginasio') is null then
  raise exception 'Estrutura base ausente. Execute o diagnóstico antes desta migration.';
 end if;
end $$;
create schema if not exists privado;
revoke all on schema privado from public,anon;
grant usage on schema privado to authenticated;

-- Remove apenas os triggers conhecidos que ativavam vínculos por e-mail.
do $$ declare t record; begin
 for t in select tr.tgname,fn.proname,ns.nspname from pg_trigger tr
  join pg_proc fn on fn.oid=tr.tgfoid join pg_namespace ns on ns.oid=fn.pronamespace
  where tr.tgrelid='auth.users'::regclass and not tr.tgisinternal
   and ns.nspname='public' and fn.proname in ('activar_membro_por_email','activar_membro_na_confirmacao') loop
  execute format('drop trigger %I on auth.users',t.tgname);
 end loop;
end $$;

alter table public.ginasios add column if not exists morada text;
alter table public.ginasios add column if not exists telefone text;

create table public.fitcore_estado_ginasios (
 ginasio_id uuid primary key references public.ginasios(id),
 operacional text not null default 'em_configuracao' check(operacional in ('em_configuracao','ativo','suspenso')),
 comercial text not null default 'sem_plano' check(comercial in ('sem_plano','experimental','ativa','em_atraso','cancelada')),
 plano text check(length(plano) between 1 and 80),
 vencimento date, motivo text, atualizado_em timestamptz not null default now(),
 atualizado_por uuid references auth.users(id)
);
insert into public.fitcore_estado_ginasios(ginasio_id) select id from public.ginasios;
create table if not exists public.unidades_ginasio (
 id uuid primary key default gen_random_uuid(), ginasio_id uuid not null references public.ginasios(id),
 nome text not null check(length(trim(nome)) between 1 and 120),ativo boolean not null default true,
 criado_em timestamptz not null default now(),unique(id,ginasio_id),unique(ginasio_id,nome)
);
create table public.fitcore_auditoria_global (
 id uuid primary key default gen_random_uuid(),ginasio_id uuid references public.ginasios(id),
 autor_id uuid references auth.users(id),acao text not null,detalhes jsonb not null default '{}',
 ocorrido_em timestamptz not null default now()
);
create index on public.fitcore_auditoria_global(ginasio_id,ocorrido_em desc);
create table privado.fitcore_configuracao (
 id boolean primary key default true check(id), exigir_mfa boolean not null default false
);
insert into privado.fitcore_configuracao values(true,false);
create table privado.fitcore_gestor_cadastros (
 email text primary key,request_id uuid not null unique, ginasio_id uuid not null references public.ginasios(id),
 autor_id uuid not null references auth.users(id),utilizador_id uuid references auth.users(id),
 criado_em timestamptz not null default now()
);
create table privado.fitcore_convites_gestor (
 id uuid primary key default gen_random_uuid(),ginasio_id uuid not null,utilizador_id uuid not null,
 autor_id uuid not null references auth.users(id),token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 criado_em timestamptz not null default now(),expira_em timestamptz not null default now()+interval '24 hours',
 enviado_em timestamptz,revogado_em timestamptz,utilizado_em timestamptz,
 lease_id uuid,lease_ate timestamptz,termos_versao text,termos_aceites_em timestamptz,
 foreign key(ginasio_id,utilizador_id) references public.membros_ginasio(ginasio_id,utilizador_id)
);
create unique index on privado.fitcore_convites_gestor(ginasio_id,utilizador_id)
 where revogado_em is null and utilizado_em is null;
alter table privado.fitcore_configuracao enable row level security;
alter table privado.fitcore_gestor_cadastros enable row level security;
alter table privado.fitcore_convites_gestor enable row level security;
revoke all on privado.fitcore_configuracao,privado.fitcore_gestor_cadastros,privado.fitcore_convites_gestor from public,anon,authenticated,service_role;

create function privado.fitcore_superadmin(u uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select u is not null and exists(select 1 from public.superadmins s where s.utilizador_id=u and s.ativo)
$$;
revoke all on function privado.fitcore_superadmin(uuid) from public,anon,authenticated,service_role;
-- Substitui a função antiga com search_path seguro. Nunca usa e-mail como papel.
create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path='' as $$
 select privado.fitcore_superadmin(auth.uid())
$$;
revoke all on function public.is_superadmin() from public,anon;
grant execute on function public.is_superadmin() to authenticated;
revoke insert,update,delete on public.superadmins from anon,authenticated;

create function privado.fitcore_exigir_superadmin(u uuid, aal text) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if not privado.fitcore_superadmin(u) then raise exception using errcode='42501',message='Acesso reservado ao administrador da plataforma.'; end if;
 if (select exigir_mfa from privado.fitcore_configuracao where id) and aal is distinct from 'aal2' then
  raise exception using errcode='42501',message='Confirme o código de autenticação de dois fatores.';
 end if;
end $$;
revoke all on function privado.fitcore_exigir_superadmin(uuid,text) from public,anon,authenticated,service_role;

create function privado.fitcore_ginasio_disponivel(g uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.fitcore_estado_ginasios e where e.ginasio_id=g and e.operacional='suspenso')
$$;
revoke all on function privado.fitcore_ginasio_disponivel(uuid) from public,anon;
grant execute on function privado.fitcore_ginasio_disponivel(uuid) to authenticated;
-- Também protege as funções auxiliares antigas usadas por APIs SECURITY DEFINER.
-- Preserva nomes dos parâmetros para evitar 42P13 e não muda as funções/roles existentes.
do $$ declare f text; p record; args text; predicate text; begin
 foreach f in array array['e_membro','e_staff','e_gestor','autor_admin'] loop
  select pr.*,la.lanname into p from pg_proc pr join pg_namespace ns on ns.oid=pr.pronamespace
   join pg_language la on la.oid=pr.prolang
   where ns.nspname='privado' and pr.proname=f and pr.proargtypes::text=case when f='autor_admin' then '2950 2950' else '2950' end;
  if not found then continue; end if;
  if p.lanname<>'sql' then raise exception 'Função privado.% usa linguagem diferente da estrutura analisada. Rever antes de migrar.',f; end if;
  args:=format('%I uuid',coalesce(p.proargnames[1],'a'));
  if f='autor_admin' then args:=args||format(',%I uuid',coalesce(p.proargnames[2],'g')); end if;
  predicate:='select privado.fitcore_ginasio_disponivel('||case when f='autor_admin' then '$2' else '$1' end||') and ('||rtrim(btrim(p.prosrc),';'||chr(10)||chr(13)||' ')||')';
  execute format('create or replace function privado.%I(%s) returns boolean language sql stable security definer set search_path='''' as %L',f,args,predicate);
 end loop;
end $$;
alter table public.fitcore_estado_ginasios enable row level security;
alter table public.fitcore_auditoria_global enable row level security;
alter table public.unidades_ginasio enable row level security;
revoke all on public.fitcore_estado_ginasios,public.fitcore_auditoria_global from public,anon,authenticated,service_role;
grant select on public.fitcore_estado_ginasios,public.fitcore_auditoria_global to authenticated;
create policy plataforma_estado_ler on public.fitcore_estado_ginasios for select to authenticated using(public.is_superadmin());
create policy plataforma_auditoria_ler on public.fitcore_auditoria_global for select to authenticated using(public.is_superadmin());
-- Sem conceder escrita direta nas unidades. A RPC verifica o autor global.
revoke insert,update,delete on public.unidades_ginasio from anon,authenticated;

-- Bloqueia a academia suspensa também para JWTs já emitidos. As políticas
-- existentes continuam a decidir quais dados cada membro pode consultar.
do $$ declare t text; begin
 for t in select distinct c.table_name from information_schema.columns c
  join pg_class r on r.oid=to_regclass(format('public.%I',c.table_name)) and r.relkind='r'
  where c.table_schema='public' and c.column_name='ginasio_id' loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy fitcore_bloqueio_suspensao on public.%I as restrictive for all to authenticated using(privado.fitcore_ginasio_disponivel(ginasio_id)) with check(privado.fitcore_ginasio_disponivel(ginasio_id))',t);
 end loop;
 create policy fitcore_bloqueio_suspensao on public.ginasios as restrictive for all to authenticated
 using(privado.fitcore_ginasio_disponivel(id)) with check(privado.fitcore_ginasio_disponivel(id));
end $$;

create function public.fitcore_plataforma(p_acao text,p_dados jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); g uuid:=(p_dados->>'ginasio_id')::uuid; resultado jsonb; antes jsonb;
 nome text; tel text; estado text; alvo uuid; m public.membros_ginasio%rowtype;
begin
 perform privado.fitcore_exigir_superadmin(u,auth.jwt()->>'aal');
 if p_acao='listar' then
  select jsonb_build_object('ginasios',coalesce(jsonb_agg(to_jsonb(q) order by q.criado_em desc),'[]'::jsonb),
   'mfa_obrigatoria',(select exigir_mfa from privado.fitcore_configuracao where id)) into resultado
  from (
   select gg.*, coalesce(e.operacional,'em_configuracao') operacional,coalesce(e.comercial,'sem_plano') comercial,
    e.plano plano_plataforma,e.vencimento,e.motivo,
    (select count(*) from public.membros_ginasio mm where mm.ginasio_id=gg.id and mm.funcao='aluno' and mm.ativo) alunos_ativos,
    (select count(*) from public.membros_ginasio mm where mm.ginasio_id=gg.id and mm.funcao in ('gestor','admin') and mm.ativo) gestores_ativos,
    (select count(*) from privado.fitcore_convites_gestor c where c.ginasio_id=gg.id and c.utilizado_em is null and c.revogado_em is null) convites_pendentes,
    (select string_agg(mm.nome,', ' order by mm.nome) from public.membros_ginasio mm where mm.ginasio_id=gg.id and mm.funcao in ('gestor','admin')) gestores
   from public.ginasios gg left join public.fitcore_estado_ginasios e on e.ginasio_id=gg.id
  ) q;
  return resultado;
 end if;
 if p_acao='mfa_exigir' then
  if auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'Verifique primeiro um segundo fator nesta sessão.'; end if;
  update privado.fitcore_configuracao set exigir_mfa=(p_dados->>'exigir')::boolean where id;
  insert into public.fitcore_auditoria_global(autor_id,acao,detalhes) values(u,'exigencia_mfa_alterada',jsonb_build_object('exigir',(p_dados->>'exigir')::boolean));
  return jsonb_build_object('ok',true);
 end if;
 if p_acao='criar' then
  nome:=trim(p_dados->>'nome');tel:=nullif(regexp_replace(p_dados->>'telefone','[\s()-]','','g'),'');
  if nome is null or length(nome) not between 1 and 120 then raise exception 'Introduza o nome do ginásio.'; end if;
  if tel is not null and tel !~ '^\+[1-9][0-9]{6,14}$' then raise exception 'Use telefone internacional, por exemplo +244923000000.'; end if;
  if length(coalesce(p_dados->>'morada',''))>200 then raise exception 'Morada demasiado longa.'; end if;
  if g is null then raise exception 'Identificador do cadastro obrigatório.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(g::text,0));
  if exists(select 1 from public.ginasios where id=g) then
   if not exists(select 1 from public.fitcore_auditoria_global where ginasio_id=g and autor_id=u and acao='ginasio_criado') then raise exception 'Identificador já utilizado.'; end if;
   return jsonb_build_object('ginasio_id',g,'existente',true);
  end if;
  insert into public.ginasios(id,nome,slug,morada,telefone) values(g,nome,trim(p_dados->>'slug'),nullif(trim(p_dados->>'morada'),''),tel);
  insert into public.fitcore_estado_ginasios(ginasio_id,comercial,plano,vencimento,atualizado_por)
  values(g,coalesce(p_dados->>'comercial','sem_plano'),nullif(trim(p_dados->>'plano'),''),(p_dados->>'vencimento')::date,u);
  insert into public.fitcore_auditoria_global(ginasio_id,autor_id,acao,detalhes) values(g,u,'ginasio_criado',jsonb_build_object('nome',nome));
  return jsonb_build_object('ginasio_id',g);
 end if;
 if g is null or not exists(select 1 from public.ginasios where id=g) then raise exception 'Ginásio inexistente.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(g::text,0));
 if p_acao='detalhes' then
  return jsonb_build_object('unidades',(select coalesce(jsonb_agg(to_jsonb(uu) order by uu.nome),'[]'::jsonb) from public.unidades_ginasio uu where uu.ginasio_id=g),
   'gestores',(select coalesce(jsonb_agg(to_jsonb(q) order by q.nome),'[]'::jsonb) from (
    select mm.utilizador_id,mm.nome,mm.funcao,mm.ativo,aa.email,aa.last_sign_in_at,
     case when ci.utilizado_em is not null then 'ativo' when ci.revogado_em is not null then 'revogado'
      when ci.expira_em<now() then 'expirado' when ci.enviado_em is not null then 'aguardando' when ci.id is not null then 'envio_pendente'
      when mm.ativo then 'ativo' else 'suspenso' end estado_convite,
     ci.expira_em,ci.utilizado_em,exists(select 1 from privado.fitcore_gestor_cadastros cc where cc.ginasio_id=g and cc.utilizador_id=mm.utilizador_id) gerido_por_convite
    from public.membros_ginasio mm join auth.users aa on aa.id=mm.utilizador_id
    left join lateral(select * from privado.fitcore_convites_gestor c where c.ginasio_id=g and c.utilizador_id=mm.utilizador_id order by c.criado_em desc limit 1) ci on true
    where mm.ginasio_id=g and mm.funcao in ('gestor','admin')
   ) q),
   'auditoria',(select coalesce(jsonb_agg(to_jsonb(a) order by a.ocorrido_em desc),'[]'::jsonb) from (select * from public.fitcore_auditoria_global where ginasio_id=g order by ocorrido_em desc limit 100) a));
 elsif p_acao='editar' then
  nome:=trim(p_dados->>'nome');tel:=nullif(regexp_replace(p_dados->>'telefone','[\s()-]','','g'),'');
  if nome is null or length(nome) not between 1 and 120 or length(coalesce(p_dados->>'morada',''))>200 then raise exception 'Verifique o nome e a morada.'; end if;
  if tel is not null and tel !~ '^\+[1-9][0-9]{6,14}$' then raise exception 'Telefone internacional inválido.'; end if;
  select jsonb_build_object('nome',gg.nome,'morada',gg.morada,'telefone',gg.telefone) into antes from public.ginasios gg where id=g;
  update public.ginasios gg set nome=trim(p_dados->>'nome'),morada=nullif(trim(p_dados->>'morada'),''),telefone=tel where gg.id=g;
  insert into public.fitcore_auditoria_global(ginasio_id,autor_id,acao,detalhes) values(g,u,'dados_editados',jsonb_build_object('antes',antes,'depois',p_dados-'ginasio_id'));
 elsif p_acao='comercial' then
  select to_jsonb(e) into antes from public.fitcore_estado_ginasios e where e.ginasio_id=g;
  insert into public.fitcore_estado_ginasios(ginasio_id,comercial,plano,vencimento,atualizado_por)
  values(g,p_dados->>'comercial',nullif(trim(p_dados->>'plano'),''),(p_dados->>'vencimento')::date,u)
  on conflict(ginasio_id) do update set comercial=excluded.comercial,plano=excluded.plano,vencimento=excluded.vencimento,atualizado_por=u,atualizado_em=now();
  insert into public.fitcore_auditoria_global(ginasio_id,autor_id,acao,detalhes) values(g,u,'subscricao_editada',jsonb_build_object('antes',antes,'depois',p_dados-'ginasio_id'));
 elsif p_acao='estado' then
  estado:=p_dados->>'operacional';
  if estado not in ('em_configuracao','ativo','suspenso') or estado is null then raise exception 'Estado inválido.'; end if;
  if length(trim(coalesce(p_dados->>'motivo','')))<5 then raise exception 'Indique um motivo com pelo menos cinco caracteres.'; end if;
  if estado='ativo' and not exists(select 1 from public.membros_ginasio where ginasio_id=g and funcao in ('gestor','admin') and ativo) then raise exception 'Convide e ative primeiro um gestor.'; end if;
  select to_jsonb(e) into antes from public.fitcore_estado_ginasios e where e.ginasio_id=g;
  insert into public.fitcore_estado_ginasios(ginasio_id,operacional,motivo,atualizado_por) values(g,estado,left(trim(p_dados->>'motivo'),1000),u)
  on conflict(ginasio_id) do update set operacional=excluded.operacional,motivo=excluded.motivo,atualizado_por=u,atualizado_em=now();
  insert into public.fitcore_auditoria_global(ginasio_id,autor_id,acao,detalhes) values(g,u,'estado_alterado',jsonb_build_object('antes',antes,'estado',estado,'motivo',left(trim(p_dados->>'motivo'),1000)));
 elsif p_acao='unidade' then
  if length(trim(coalesce(p_dados->>'nome',''))) not between 1 and 120 then raise exception 'Indique o nome da unidade.'; end if;
  if nullif(p_dados->>'unidade_id','') is null then
   insert into public.unidades_ginasio(ginasio_id,nome) values(g,trim(p_dados->>'nome'));
  else
   update public.unidades_ginasio set nome=trim(p_dados->>'nome'),ativo=coalesce((p_dados->>'ativo')::boolean,true)
   where id=(p_dados->>'unidade_id')::uuid and ginasio_id=g;
   if not found then raise exception 'Unidade inexistente neste ginásio.'; end if;
  end if;
  insert into public.fitcore_auditoria_global(ginasio_id,autor_id,acao,detalhes) values(g,u,'unidade_guardada',p_dados-'ginasio_id');
 elsif p_acao='gestor_estado' then
  alvo:=(p_dados->>'utilizador_id')::uuid;
  select * into m from public.membros_ginasio where ginasio_id=g and utilizador_id=alvo and funcao in ('gestor','admin') for update;
  if not found then raise exception 'Gestor inexistente neste ginásio.'; end if;
  if length(trim(coalesce(p_dados->>'motivo','')))<5 then raise exception 'Indique o motivo da alteração.'; end if;
  if (p_dados->>'ativo')::boolean is not true and not exists(select 1 from public.membros_ginasio where ginasio_id=g and utilizador_id<>alvo and funcao in ('gestor','admin') and ativo) then raise exception 'Não pode suspender o último gestor ativo.'; end if;
  if exists(select 1 from privado.fitcore_convites_gestor where ginasio_id=g and utilizador_id=alvo) and not exists(select 1 from privado.fitcore_convites_gestor where ginasio_id=g and utilizador_id=alvo and utilizado_em is not null) then raise exception 'Conta por ativar. Utilize o reenvio de convite.'; end if;
  perform set_config('fitcore.actor',u::text,true);
  update public.membros_ginasio set ativo=(p_dados->>'ativo')::boolean where ginasio_id=g and utilizador_id=alvo;
  insert into public.fitcore_auditoria_global(ginasio_id,autor_id,acao,detalhes) values(g,u,'gestor_estado_alterado',p_dados-'ginasio_id');
 else raise exception 'Operação desconhecida.';
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.fitcore_plataforma(text,jsonb) from public,anon,service_role;
grant execute on function public.fitcore_plataforma(text,jsonb) to authenticated;

-- API de convite exclusiva do backend; p_actor vem de auth.getUser, nunca do corpo.
create function public.fitcore_convite_backend(p_actor uuid,p_aal text,p_acao text,p_dados jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare g uuid:=(p_dados->>'ginasio_id')::uuid; e text:=lower(trim(p_dados->>'email')); u uuid; r uuid;
 c privado.fitcore_gestor_cadastros%rowtype; inv privado.fitcore_convites_gestor%rowtype; nome text:=trim(p_dados->>'nome_admin');
begin
 perform privado.fitcore_exigir_superadmin(p_actor,p_aal);
 if g is null or not exists(select 1 from public.ginasios where id=g) then raise exception 'Ginásio inexistente.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(g::text,0));
 if not privado.fitcore_ginasio_disponivel(g) then raise exception 'Reative o ginásio antes de enviar convites.'; end if;
 perform set_config('fitcore.actor',p_actor::text,true);
 if p_acao='reservar' then
  if e is null or length(e)>254 or e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail inválido.'; end if;
  select * into c from privado.fitcore_gestor_cadastros where email=e for update;
  if found and (c.ginasio_id<>g or c.autor_id<>p_actor) then raise exception 'E-mail já utilizado noutro cadastro.'; end if;
  select id into u from auth.users where lower(email)=e;
  if u is not null and (c.email is null or not exists(select 1 from auth.users aa where aa.id=u and aa.raw_user_meta_data->>'fitcore_platform_request'=c.request_id::text)) then
   raise exception 'Esta conta já existe. A associação de contas existentes exige um procedimento separado.';
  end if;
  if exists(select 1 from public.membros_ginasio where ginasio_id=g and utilizador_id=u and ativo)
   or exists(select 1 from privado.fitcore_convites_gestor where ginasio_id=g and utilizador_id=u and utilizado_em is not null)
  then raise exception 'Esta conta já foi ativada. Utilize a reativação, sem redefinir a palavra-passe por convite.'; end if;
  if c.email is null then
   if (select count(*) from privado.fitcore_gestor_cadastros where autor_id=p_actor and criado_em>now()-interval '1 hour')>=30 then raise exception 'Limite de cadastros atingido. Aguarde.'; end if;
   insert into privado.fitcore_gestor_cadastros(email,request_id,ginasio_id,autor_id) values(e,gen_random_uuid(),g,p_actor) returning * into c;
  end if;
  return jsonb_build_object('request_id',c.request_id,'utilizador_id',u);
 elsif p_acao='preparar' then
  select * into c from privado.fitcore_gestor_cadastros where email=e and ginasio_id=g and autor_id=p_actor for update;
  u:=(p_dados->>'utilizador_id')::uuid;
  if c.email is null or u is null or not exists(select 1 from auth.users aa where aa.id=u and lower(aa.email)=e and aa.raw_user_meta_data->>'fitcore_platform_request'=c.request_id::text) then raise exception 'Conta Auth não corresponde ao cadastro reservado.'; end if;
  if length(coalesce(nome,'')) not between 1 and 120 then raise exception 'Nome do gestor inválido.'; end if;
  if exists(select 1 from public.membros_ginasio where ginasio_id=g and utilizador_id=u and ativo)
   or exists(select 1 from privado.fitcore_convites_gestor where ginasio_id=g and utilizador_id=u and utilizado_em is not null)
  then raise exception 'Conta já ativada. Não pode redefinir a palavra-passe por convite.'; end if;
  if exists(select 1 from privado.fitcore_convites_gestor where ginasio_id=g and utilizador_id=u and lease_ate>now() and revogado_em is null) then raise exception 'Ativação em curso. Aguarde.'; end if;
  if exists(select 1 from privado.fitcore_convites_gestor where ginasio_id=g and utilizador_id=u and criado_em>now()-interval '1 minute') then raise exception 'Aguarde um minuto antes de reenviar.'; end if;
  if (select count(*) from privado.fitcore_convites_gestor where autor_id=p_actor and criado_em>now()-interval '1 hour')>=50 then raise exception 'Limite de convites atingido. Aguarde.'; end if;
  insert into public.membros_ginasio(ginasio_id,utilizador_id,nome,funcao,ativo) values(g,u,nome,'gestor',false)
  on conflict(ginasio_id,utilizador_id) do nothing;
  if not exists(select 1 from public.membros_ginasio where ginasio_id=g and utilizador_id=u and funcao='gestor' and not ativo) then raise exception 'Vínculo incompatível.'; end if;
  update privado.fitcore_gestor_cadastros set utilizador_id=u where email=e;
  -- A versão anterior do cadastro pode ter colunas adicionais de ativação.
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='membros_ginasio' and column_name='ativado_em') then
   execute 'update public.membros_ginasio set ativado_em=null where ginasio_id=$1 and utilizador_id=$2' using g,u;
  end if;
  update privado.fitcore_convites_gestor set revogado_em=now() where ginasio_id=g and utilizador_id=u and revogado_em is null and utilizado_em is null;
  insert into privado.fitcore_convites_gestor(ginasio_id,utilizador_id,autor_id,token_hash)
  values(g,u,p_actor,p_dados->>'token_hash') returning * into inv;
  insert into public.fitcore_auditoria_global(ginasio_id,autor_id,acao,detalhes) values(g,p_actor,'convite_preparado',jsonb_build_object('utilizador_id',u,'convite_id',inv.id));
  return jsonb_build_object('convite_id',inv.id,'nome_ginasio',(select gg.nome from public.ginasios gg where gg.id=g));
 elsif p_acao in ('enviado','falhou') then
  update privado.fitcore_convites_gestor set enviado_em=case when p_acao='enviado' then now() else null end
  where id=(p_dados->>'convite_id')::uuid and ginasio_id=g and autor_id=p_actor and revogado_em is null and utilizado_em is null returning * into inv;
  if not found then raise exception 'Convite já substituído. Atualize a lista.'; end if;
  insert into public.fitcore_auditoria_global(ginasio_id,autor_id,acao,detalhes) values(g,p_actor,'convite_'||p_acao,jsonb_build_object('utilizador_id',inv.utilizador_id,'convite_id',inv.id));
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Operação de convite inválida.';
end $$;
revoke all on function public.fitcore_convite_backend(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.fitcore_convite_backend(uuid,text,text,jsonb) to service_role;

-- Ativação: token aleatório de 256 bits; apenas o hash é guardado.
create function public.fitcore_ativar_backend(p_acao text,p_hash text,p_lease uuid,p_termos text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c privado.fitcore_convites_gestor%rowtype;
begin
 select * into c from privado.fitcore_convites_gestor where token_hash=p_hash;
 if not found then raise exception 'Convite inválido ou expirado.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(c.ginasio_id::text,0));
 select * into c from privado.fitcore_convites_gestor where token_hash=p_hash for update;
 if p_acao='libertar' then
  update privado.fitcore_convites_gestor set lease_id=null,lease_ate=null where id=c.id and lease_id=p_lease;
  return jsonb_build_object('ok',true);
 end if;
 if c.revogado_em is not null or c.utilizado_em is not null or c.enviado_em is null or c.expira_em<=now() or not privado.fitcore_ginasio_disponivel(c.ginasio_id) then raise exception 'Convite inválido ou expirado.'; end if;
 if not exists(select 1 from public.membros_ginasio where ginasio_id=c.ginasio_id and utilizador_id=c.utilizador_id and funcao='gestor' and not ativo) then raise exception 'Convite indisponível.'; end if;
 if p_acao='reclamar' then
  if p_lease is null or c.lease_ate>now() then raise exception 'Ativação em curso. Aguarde.'; end if;
  update privado.fitcore_convites_gestor set lease_id=p_lease,lease_ate=now()+interval '3 minutes' where id=c.id;
 elsif p_acao='concluir' then
  if c.lease_id is distinct from p_lease or c.lease_ate<=now() or c.lease_ate is null or nullif(trim(p_termos),'') is null then raise exception 'Ativação não autorizada.'; end if;
  if not exists(select 1 from auth.users where id=c.utilizador_id and email_confirmed_at is not null) then raise exception 'Confirmação de identidade em falta.'; end if;
  perform set_config('fitcore.actor',c.utilizador_id::text,true);
  update public.membros_ginasio set ativo=true where ginasio_id=c.ginasio_id and utilizador_id=c.utilizador_id;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='membros_ginasio' and column_name='ativado_em') then
   execute 'update public.membros_ginasio set ativado_em=now() where ginasio_id=$1 and utilizador_id=$2' using c.ginasio_id,c.utilizador_id;
  end if;
  update privado.fitcore_convites_gestor set utilizado_em=now(),termos_versao=p_termos,termos_aceites_em=now(),lease_id=null,lease_ate=null where id=c.id;
  insert into public.fitcore_auditoria_global(ginasio_id,autor_id,acao,detalhes) values(c.ginasio_id,c.utilizador_id,'gestor_ativado',jsonb_build_object('convite_id',c.id,'termos_versao',p_termos));
 else raise exception 'Operação inválida.';
 end if;
 return jsonb_build_object('utilizador_id',c.utilizador_id,'email',(select email from auth.users where id=c.utilizador_id),'ginasio_id',c.ginasio_id);
end $$;
revoke all on function public.fitcore_ativar_backend(text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.fitcore_ativar_backend(text,text,uuid,text) to service_role;
commit;
select 'Painel global instalado. Publique as duas Edge Functions antes do frontend.' as resultado;
