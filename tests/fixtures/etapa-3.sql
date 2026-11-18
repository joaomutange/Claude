-- Migration aditiva; executar UMA VEZ após comparar diagnostico.sql.
-- Não altera as roles existentes gestor/trainer/aluno.
begin;
do $$ declare t text; begin
 foreach t in array array['ginasios','membros_ginasio','perfis','exercicios','planos_treino','treinos','treino_exercicios','registos_treino','registos_series','medicoes','planos_mensalidade','subscricoes','pagamentos','historico_pagamentos'] loop
  if to_regclass('public.'||t) is null then raise exception 'Tabela necessária ausente: %',t; end if;
 end loop;
 if to_regprocedure('privado.e_gestor(uuid)') is null or to_regprocedure('privado.e_membro(uuid)') is null or to_regprocedure('privado.e_staff(uuid)') is null then
  raise exception 'Helpers da etapa 2 ausentes. Compare a estrutura antes de continuar.';
 end if;
end $$;

alter table public.membros_ginasio add column ativado_em timestamptz default now();
alter table public.membros_ginasio add column criado_por uuid references auth.users(id) on delete set null;
-- Existing accounts remain activated; new provisioning explicitly sets null.
revoke insert,update,delete on public.membros_ginasio from anon,authenticated;

create table public.unidades_ginasio (
 id uuid primary key default gen_random_uuid(), ginasio_id uuid not null references public.ginasios(id),
 nome text not null check(length(trim(nome)) between 1 and 120), ativo boolean not null default true,
 criado_em timestamptz not null default now(), unique(id,ginasio_id),unique(ginasio_id,nome)
);
create table public.dados_membros (
 ginasio_id uuid not null, utilizador_id uuid not null,
 email text not null check(email=lower(trim(email)) and length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 telefone text check(telefone ~ '^\+[1-9][0-9]{6,14}$'),
 data_nascimento date check(data_nascimento>'1900-01-01'),
 genero text check(genero in ('feminino','masculino','outro','nao_informar')),
 unidade_id uuid, treinador_id uuid,
 termos_versao text, termos_aceites_em timestamptz,
 primary key(ginasio_id,utilizador_id), unique(ginasio_id,email),unique(ginasio_id,telefone),
 foreign key(ginasio_id,utilizador_id) references public.membros_ginasio(ginasio_id,utilizador_id),
 foreign key(unidade_id,ginasio_id) references public.unidades_ginasio(id,ginasio_id),
 foreign key(ginasio_id,treinador_id) references public.membros_ginasio(ginasio_id,utilizador_id)
);
create table public.auditoria_membros (
 id uuid primary key default gen_random_uuid(),ginasio_id uuid not null references public.ginasios(id),
 autor_id uuid references auth.users(id) on delete set null,
 utilizador_id uuid references auth.users(id) on delete set null,
 acao text not null, detalhes jsonb not null default '{}', ocorrido_em timestamptz not null default now()
);
create index auditoria_membros_ginasio on public.auditoria_membros(ginasio_id,ocorrido_em desc);
create table privado.administradores_plataforma (
 utilizador_id uuid primary key references auth.users(id),ativo boolean not null default true,
 atribuido_por uuid not null references auth.users(id),criado_em timestamptz not null default now()
);
create table privado.auditoria_plataforma (
 id uuid primary key default gen_random_uuid(),utilizador_id uuid not null,
 autor_id uuid,acao text not null,antes jsonb,depois jsonb,
 ocorrido_em timestamptz not null default now()
);
create table privado.cadastros (
 id uuid primary key,autor_id uuid not null references auth.users(id),ginasio_id uuid not null references public.ginasios(id),
 email text not null unique,telefone text unique,utilizador_id uuid references auth.users(id),
 criado_em timestamptz not null default now()
);
create table privado.convites (
 id uuid primary key default gen_random_uuid(),ginasio_id uuid not null,utilizador_id uuid not null,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 autor_id uuid not null references auth.users(id), criado_em timestamptz not null default now(),
 expira_em timestamptz not null default (now()+interval '24 hours'),
 revogado_em timestamptz,utilizado_em timestamptz,enviado_em timestamptz,
 estado_envio text not null default 'preparado' check(estado_envio in ('preparado','enviado','falhou')),
 lease_id uuid, lease_ate timestamptz,
 foreign key(ginasio_id,utilizador_id) references public.membros_ginasio(ginasio_id,utilizador_id)
);
create index cadastros_limite on privado.cadastros(autor_id,criado_em desc);
create unique index convite_corrente on privado.convites(ginasio_id,utilizador_id)
 where revogado_em is null and utilizado_em is null;
create index convites_limite on privado.convites(autor_id,criado_em desc);
revoke all on privado.administradores_plataforma,privado.auditoria_plataforma,privado.cadastros,privado.convites from public,anon,authenticated,service_role;
alter table privado.administradores_plataforma enable row level security;
alter table privado.cadastros enable row level security;
alter table privado.convites enable row level security;
alter table privado.auditoria_plataforma enable row level security;

-- Preserve the existing argument NAME to avoid PostgreSQL error 42P13.
do $$ declare f text; arg text; definition text; begin
 foreach f in array array['e_membro','e_staff','e_gestor'] loop
  select coalesce(p.proargnames[1],'g') into arg from pg_proc p
   where p.oid=to_regprocedure('privado.'||f||'(uuid)');
  definition := 'select exists(select 1 from public.membros_ginasio m where m.ginasio_id=$1 and m.utilizador_id=(select auth.uid()) and m.ativo and m.ativado_em is not null';
  if f='e_staff' then definition:=definition||' and m.funcao in (''gestor'',''trainer'')'; end if;
  if f='e_gestor' then definition:=definition||' and m.funcao=''gestor'''; end if;
  definition:=definition||')';
  execute format('create or replace function privado.%I(%I uuid) returns boolean language sql stable security definer set search_path='''' as %L',f,arg,definition);
  execute format('alter function privado.%I(uuid) owner to postgres',f);
  execute format('revoke all on function privado.%I(uuid) from public,anon',f);
  execute format('grant execute on function privado.%I(uuid) to authenticated',f);
 end loop;
end $$;

create function privado.autor_admin(a uuid,g uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from privado.administradores_plataforma s where s.utilizador_id=a and s.ativo)
 or exists(select 1 from public.membros_ginasio m where m.utilizador_id=a and m.ginasio_id=g and m.funcao='gestor' and m.ativo and m.ativado_em is not null)
$$;
revoke all on function privado.autor_admin(uuid,uuid) from public,anon,authenticated,service_role;

alter table public.unidades_ginasio enable row level security;
alter table public.dados_membros enable row level security;
alter table public.auditoria_membros enable row level security;
revoke all on public.unidades_ginasio,public.dados_membros,public.auditoria_membros from public,anon,authenticated,service_role;
grant select on public.unidades_ginasio,public.dados_membros,public.auditoria_membros to authenticated;
create policy unidades_ler on public.unidades_ginasio for select to authenticated using(privado.e_membro(ginasio_id));
create policy dados_ler on public.dados_membros for select to authenticated
 using(privado.e_gestor(ginasio_id) or (utilizador_id=auth.uid() and privado.e_membro(ginasio_id)));
create policy auditoria_ler on public.auditoria_membros for select to authenticated using(privado.e_gestor(ginasio_id));
create policy vinculo_ativado on public.membros_ginasio as restrictive for select to authenticated
 using(privado.e_staff(ginasio_id) or (utilizador_id=auth.uid() and ativo and ativado_em is not null));
-- Restrictive policies are ANDed with ALL permissive policies, including legacy policies.
do $$ declare t text; begin
 foreach t in array array['ginasios','exercicios','planos_treino','treinos','treino_exercicios','registos_treino','registos_series','medicoes','planos_mensalidade','subscricoes','pagamentos','historico_pagamentos'] loop
  execute format('create policy acesso_ativado on public.%I as restrictive for all to authenticated using(privado.e_membro(%I)) with check(privado.e_membro(%I))',t,case when t='ginasios' then 'id' else 'ginasio_id' end,case when t='ginasios' then 'id' else 'ginasio_id' end);
 end loop;
end $$;

-- Immutable audit trail for member and platform permission changes.
create function privado.auditar_membro() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=coalesce(nullif(current_setting('fitcore.actor',true),'')::uuid,auth.uid()); kind text;
begin
 if tg_op='DELETE' then raise exception 'Vínculos não podem ser eliminados; suspenda o acesso.'; end if;
 if tg_op='UPDATE' and (new.ginasio_id,new.utilizador_id,new.criado_em,new.criado_por) is distinct from (old.ginasio_id,old.utilizador_id,old.criado_em,old.criado_por) then
  raise exception 'Identidade e autoria do vínculo são imutáveis.';
 end if;
 if tg_op='INSERT' then kind:='utilizador_criado';
 elsif new.funcao is distinct from old.funcao then kind:='role_alterado';
 elsif new.ativo is distinct from old.ativo then kind:=case when new.ativo then 'reativado' else 'suspenso' end;
 elsif new.ativado_em is distinct from old.ativado_em then kind:='primeiro_acesso';
 elsif new.nome is distinct from old.nome then kind:='dados_alterados'; else return new; end if;
 insert into public.auditoria_membros(ginasio_id,autor_id,utilizador_id,acao,detalhes)
 values(new.ginasio_id,actor,new.utilizador_id,kind,jsonb_build_object('funcao',new.funcao,'ativo',new.ativo,'antes',case when tg_op='UPDATE' then jsonb_build_object('funcao',old.funcao,'ativo',old.ativo) else null end));
 return new;
end $$;
create trigger auditar_membro before insert or update or delete on public.membros_ginasio for each row execute function privado.auditar_membro();
create function privado.auditar_plataforma() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into privado.auditoria_plataforma(utilizador_id,autor_id,acao,antes,depois)
 values(coalesce(new.utilizador_id,old.utilizador_id),coalesce(auth.uid(),nullif(current_setting('fitcore.actor',true),'')::uuid,new.atribuido_por,old.atribuido_por),tg_op,
 case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end);
 -- Platform grants have no gym: emit an event in every currently linked academy.
 insert into public.auditoria_membros(ginasio_id,autor_id,utilizador_id,acao,detalhes)
 select m.ginasio_id,coalesce(auth.uid(),nullif(current_setting('fitcore.actor',true),'')::uuid,new.atribuido_por,old.atribuido_por),coalesce(new.utilizador_id,old.utilizador_id),'permissao_plataforma_alterada',jsonb_build_object('operacao',tg_op)
 from public.membros_ginasio m where m.utilizador_id=coalesce(new.utilizador_id,old.utilizador_id);
 return coalesce(new,old);
end $$;
create trigger auditar_plataforma after insert or update or delete on privado.administradores_plataforma for each row execute function privado.auditar_plataforma();
revoke all on function privado.auditar_membro(),privado.auditar_plataforma() from public,anon,authenticated,service_role;

-- Only the authenticated Edge backend may call this administrative API.
-- p_actor is taken from auth.getUser(Bearer), never from the request body.
create function public.fitcore_admin(p_actor uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 g uuid:=(p_data->>'ginasio_id')::uuid; u uuid; rid uuid; e text; tel text; role_db text;
 m public.membros_ginasio%rowtype; operation privado.cadastros%rowtype;
 inv privado.convites%rowtype; unit uuid; trainer uuid; plan uuid; result jsonb;
 is_super boolean; offset_n integer; limit_n integer;
begin
 if g is null or p_actor is null or not privado.autor_admin(p_actor,g) or not exists(select 1 from public.ginasios where id=g) then
  raise exception using errcode='42501',message='Sem autorização para esta academia.';
 end if;
 -- Serialize mutations against actor suspension/role change and target changes.
 perform pg_advisory_xact_lock(hashtextextended(g::text,0));
 if not privado.autor_admin(p_actor,g) then raise exception using errcode='42501',message='A autorização mudou.'; end if;
 perform set_config('fitcore.actor',p_actor::text,true);
 select exists(select 1 from privado.administradores_plataforma where utilizador_id=p_actor and ativo) into is_super;
 if p_action='list' then
  offset_n:=greatest(0,least(coalesce((p_data->>'offset')::integer,0),1000000));
  limit_n:=greatest(1,least(coalesce((p_data->>'limit')::integer,50),100));
  select jsonb_build_object('rows',coalesce(jsonb_agg(x.row),'[]'::jsonb),'total',(select count(*) from public.membros_ginasio mm where mm.ginasio_id=g and (nullif(p_data->>'search','') is null or mm.nome ilike '%'||left(p_data->>'search',120)||'%'))) into result
  from (
   select to_jsonb(mm)||jsonb_build_object('role',case mm.funcao when 'gestor' then 'gym_admin' when 'aluno' then 'student' else 'trainer' end,
    'email',coalesce(d.email,a.email),'telefone',d.telefone,'data_nascimento',d.data_nascimento,'genero',d.genero,'unidade_id',d.unidade_id,'treinador_id',d.treinador_id,
    'ultimo_acesso',a.last_sign_in_at,'plano',(select pm.nome from public.subscricoes s join public.planos_mensalidade pm on pm.id=s.plano_id and pm.ginasio_id=s.ginasio_id where s.ginasio_id=g and s.aluno_id=mm.utilizador_id order by s.criado_em desc limit 1),
    'estado',case when not mm.ativo then 'suspensa' when mm.ativado_em is not null then 'ativa' when ci.expira_em<=now() then 'expirado' when ci.estado_envio='enviado' then 'aguardando' else 'envio_pendente' end,'convite_enviado_em',ci.enviado_em,'convite_expira_em',ci.expira_em) row
   from public.membros_ginasio mm join auth.users a on a.id=mm.utilizador_id
   left join public.dados_membros d on d.ginasio_id=mm.ginasio_id and d.utilizador_id=mm.utilizador_id
   left join lateral(select * from privado.convites c where c.ginasio_id=g and c.utilizador_id=mm.utilizador_id and c.revogado_em is null order by c.criado_em desc limit 1) ci on true
   where mm.ginasio_id=g and (nullif(p_data->>'search','') is null or mm.nome ilike '%'||left(p_data->>'search',120)||'%')
   order by mm.nome,mm.utilizador_id limit limit_n offset offset_n
  ) x;
  return result;
 end if;
 if p_action='unit_create' then
  insert into public.unidades_ginasio(ginasio_id,nome) values(g,trim(p_data->>'nome')) returning to_jsonb(unidades_ginasio.*) into result;
  insert into public.auditoria_membros(ginasio_id,autor_id,acao) values(g,p_actor,'unidade_criada');
  return result;
 end if;
 if p_action in ('reserve','create') then
  rid:=(p_data->>'request_id')::uuid; e:=lower(trim(p_data->>'email')); tel:=nullif(trim(p_data->>'telefone'),'');
  if rid is null or e is null or e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(e)>254 or (tel is not null and tel !~ '^\+[1-9][0-9]{6,14}$') then
   raise exception using errcode='22023',message='Email ou telefone inválido. Use telefone internacional E.164.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(e,1));
  select * into operation from privado.cadastros where id=rid for update;
  if found then
   if (operation.autor_id,operation.ginasio_id,operation.email,operation.telefone) is distinct from (p_actor,g,e,tel) then raise exception using errcode='42501',message='Pedido não autorizado.'; end if;
  else
   if p_action<>'reserve' then raise exception 'Reserve primeiro o cadastro.'; end if;
   -- Resume a previous interrupted reservation only for the SAME verified actor/gym.
   select * into operation from privado.cadastros where email=e and autor_id=p_actor and ginasio_id=g and telefone is not distinct from tel;
   if found then
    select id into u from auth.users where lower(email)=e and raw_user_meta_data->>'fitcore_request_id'=operation.id::text;
    return jsonb_build_object('request_id',operation.id,'utilizador_id',coalesce(operation.utilizador_id,u),'concluido',operation.utilizador_id is not null);
   end if;
   if exists(select 1 from auth.users where lower(email)=e or (tel is not null and '+'||ltrim(phone,'+')=tel))
    or exists(select 1 from public.dados_membros where email=e or (tel is not null and telefone=tel))
    or exists(select 1 from public.perfis where tel is not null and regexp_replace(telefone,'[^+0-9]','','g')=tel)
    or exists(select 1 from privado.cadastros where email=e or (tel is not null and telefone=tel)) then
    raise exception using errcode='23505',message='Não é possível usar este email ou telefone. Verifique os membros existentes ou contacte a administração.';
   end if;
   if (select count(*) from privado.cadastros where autor_id=p_actor and criado_em>now()-interval '1 minute')>=10 then raise exception using errcode='P0001',message='Limite de cadastros atingido. Aguarde um minuto.'; end if;
   insert into privado.cadastros(id,autor_id,ginasio_id,email,telefone) values(rid,p_actor,g,e,tel) returning * into operation;
  end if;
  select id into u from auth.users where lower(email)=e and raw_user_meta_data->>'fitcore_request_id'=rid::text;
  if p_action='reserve' then return jsonb_build_object('request_id',rid,'utilizador_id',coalesce(operation.utilizador_id,u),'concluido',operation.utilizador_id is not null); end if;
  if operation.utilizador_id is not null then return jsonb_build_object('utilizador_id',operation.utilizador_id,'concluido',true); end if;
  if u is null or u is distinct from (p_data->>'utilizador_id')::uuid then raise exception using errcode='42501',message='Conta não corresponde ao cadastro reservado.'; end if;
  role_db:=case p_data->>'role' when 'student' then 'aluno' when 'trainer' then 'trainer' else null end;
  if role_db is null then raise exception using errcode='42501',message='Apenas aluno ou treinador podem ser cadastrados.'; end if;
  if nullif(trim(p_data->>'nome'),'') is null or length(trim(p_data->>'nome'))>120 then raise exception using errcode='22023',message='Nome inválido.'; end if;
  unit:=nullif(p_data->>'unidade_id','')::uuid;trainer:=nullif(p_data->>'treinador_id','')::uuid;plan:=nullif(p_data->>'plano_id','')::uuid;
  if unit is not null and not exists(select 1 from public.unidades_ginasio where id=unit and ginasio_id=g and ativo) then raise exception 'Unidade inválida.'; end if;
  if trainer is not null and (role_db<>'aluno' or not exists(select 1 from public.membros_ginasio where ginasio_id=g and utilizador_id=trainer and funcao='trainer' and ativo and ativado_em is not null)) then raise exception 'Treinador inválido.'; end if;
  if plan is not null and (role_db<>'aluno' or not exists(select 1 from public.planos_mensalidade where id=plan and ginasio_id=g and ativo)) then raise exception 'Plano inválido.'; end if;
  if nullif(p_data->>'data_nascimento','')::date>current_date then raise exception 'Data de nascimento inválida.'; end if;
  insert into public.membros_ginasio(ginasio_id,utilizador_id,nome,funcao,ativo,ativado_em,criado_por) values(g,u,trim(p_data->>'nome'),role_db,true,null,p_actor);
  insert into public.dados_membros(ginasio_id,utilizador_id,email,telefone,data_nascimento,genero,unidade_id,treinador_id)
   values(g,u,e,tel,nullif(p_data->>'data_nascimento','')::date,nullif(p_data->>'genero',''),unit,trainer);
  -- Existing Auth trigger owns creation of the global personal profile.
  update public.perfis set nome=trim(p_data->>'nome'),telefone=tel,data_nascimento=nullif(p_data->>'data_nascimento','')::date where id=u;
  if plan is not null then
   if nullif(p_data->>'inicio','') is null or nullif(p_data->>'fim','') is null then raise exception 'Preencha início e vencimento.'; end if;
   insert into public.subscricoes(ginasio_id,aluno_id,plano_id,inicio,fim) values(g,u,plan,(p_data->>'inicio')::date,(p_data->>'fim')::date);
  end if;
  if coalesce((p_data->>'ativo')::boolean,true)=false then update public.membros_ginasio set ativo=false where ginasio_id=g and utilizador_id=u; end if;
  update privado.cadastros set utilizador_id=u where id=rid;
  return jsonb_build_object('utilizador_id',u,'concluido',true);
 end if;
 u:=(p_data->>'utilizador_id')::uuid;
 select * into m from public.membros_ginasio where ginasio_id=g and utilizador_id=u for update;
 if not found then raise exception using errcode='42501',message='Utilizador indisponível nesta academia.'; end if;
 if u=p_actor or (m.funcao='gestor' and not is_super) then raise exception using errcode='42501',message='A gestão desta conta exige administração da plataforma.'; end if;
 if p_action in ('suspend','reactivate') then
  if p_action='suspend' and m.funcao='gestor' and not exists(select 1 from public.membros_ginasio where ginasio_id=g and utilizador_id<>u and funcao='gestor' and ativo and ativado_em is not null) then raise exception 'Não suspenda o último gestor ativo.'; end if;
  update public.membros_ginasio set ativo=(p_action='reactivate') where ginasio_id=g and utilizador_id=u;
  if p_action='suspend' then update privado.convites set revogado_em=now() where ginasio_id=g and utilizador_id=u and utilizado_em is null and revogado_em is null; end if;
  return jsonb_build_object('ok',true);
 end if;
 if p_action='update' then
  tel:=nullif(trim(p_data->>'telefone'),''); unit:=nullif(p_data->>'unidade_id','')::uuid;trainer:=nullif(p_data->>'treinador_id','')::uuid;
  if tel is not null and (exists(select 1 from public.dados_membros where telefone=tel and utilizador_id<>u) or exists(select 1 from privado.cadastros where telefone=tel and utilizador_id is distinct from u) or exists(select 1 from auth.users where id<>u and '+'||ltrim(phone,'+')=tel) or exists(select 1 from public.perfis where id<>u and regexp_replace(telefone,'[^+0-9]','','g')=tel)) then raise exception using errcode='23505',message='Telefone indisponível.'; end if;
  if unit is not null and not exists(select 1 from public.unidades_ginasio where id=unit and ginasio_id=g and ativo) then raise exception 'Unidade inválida.'; end if;
  if trainer is not null and (m.funcao<>'aluno' or not exists(select 1 from public.membros_ginasio where ginasio_id=g and utilizador_id=trainer and ativo and ativado_em is not null and funcao='trainer')) then raise exception 'Treinador inválido.'; end if;
  if nullif(p_data->>'data_nascimento','')::date>current_date then raise exception 'Data de nascimento inválida.'; end if;
  update public.membros_ginasio set nome=trim(p_data->>'nome') where ginasio_id=g and utilizador_id=u;
  insert into public.dados_membros(ginasio_id,utilizador_id,email,telefone,data_nascimento,genero,unidade_id,treinador_id)
  select g,u,lower(email),tel,nullif(p_data->>'data_nascimento','')::date,nullif(p_data->>'genero',''),unit,trainer from auth.users where id=u
  on conflict(ginasio_id,utilizador_id) do update set telefone=excluded.telefone,data_nascimento=excluded.data_nascimento,genero=excluded.genero,unidade_id=excluded.unidade_id,treinador_id=excluded.treinador_id;
  insert into public.auditoria_membros(ginasio_id,autor_id,utilizador_id,acao) values(g,p_actor,u,'cadastro_editado');
  update privado.cadastros set telefone=tel where utilizador_id=u and ginasio_id=g;
  return jsonb_build_object('ok',true);
 end if;
 if p_action='role' then
  role_db:=case p_data->>'role' when 'student' then 'aluno' when 'trainer' then 'trainer' when 'gym_admin' then case when is_super then 'gestor' end end;
  if role_db is null then raise exception using errcode='42501',message='Role não autorizada.'; end if;
  if m.funcao='gestor' and role_db<>'gestor' and not exists(select 1 from public.membros_ginasio where ginasio_id=g and utilizador_id<>u and funcao='gestor' and ativo and ativado_em is not null) then raise exception 'Não remova o último gestor ativo.'; end if;
  update public.membros_ginasio set funcao=role_db where ginasio_id=g and utilizador_id=u;
  update public.dados_membros set treinador_id=null where ginasio_id=g and (utilizador_id=u or (treinador_id=u and role_db<>'trainer'));
  return jsonb_build_object('ok',true);
 end if;
 if p_action='invite_prepare' then
  if not m.ativo or m.ativado_em is not null then raise exception 'Convite só pode ser enviado para uma conta pendente e ativa.'; end if;
  if exists(select 1 from privado.convites where ginasio_id=g and utilizador_id=u and lease_ate>now() and revogado_em is null) then raise exception 'Ativação em curso. Aguarde.'; end if;
  if exists(select 1 from privado.convites where ginasio_id=g and utilizador_id=u and criado_em>now()-interval '1 minute') or (select count(*) from privado.convites where autor_id=p_actor and criado_em>now()-interval '1 hour')>=50 then raise exception 'Aguarde antes de reenviar convites.'; end if;
  update privado.convites set revogado_em=now() where ginasio_id=g and utilizador_id=u and utilizado_em is null and revogado_em is null;
  insert into privado.convites(ginasio_id,utilizador_id,autor_id,token_hash) values(g,u,p_actor,p_data->>'token_hash') returning * into inv;
  insert into public.auditoria_membros(ginasio_id,autor_id,utilizador_id,acao) values(g,p_actor,u,'convite_gerado');
  select jsonb_build_object('id',inv.id,'email',lower(a.email),'nome',m.nome,'ginasio',(select nome from public.ginasios where id=g),'expira_em',inv.expira_em) into result from auth.users a where a.id=u;
  return result;
 end if;
 if p_action in ('invite_sent','invite_failed') then
  update privado.convites set estado_envio=case p_action when 'invite_sent' then 'enviado' else 'falhou' end,enviado_em=case when p_action='invite_sent' then now() end
   where id=(p_data->>'convite_id')::uuid and ginasio_id=g and utilizador_id=u and autor_id=p_actor and revogado_em is null returning * into inv;
  if not found then raise exception 'Convite não disponível.'; end if;
  if p_action='invite_failed' then update privado.convites set revogado_em=now() where id=inv.id; end if;
  insert into public.auditoria_membros(ginasio_id,autor_id,utilizador_id,acao) values(g,p_actor,u,case p_action when 'invite_sent' then 'convite_enviado' else 'envio_falhou' end);
  return jsonb_build_object('ok',true);
 end if;
 raise exception using errcode='22023',message='Operação inválida.';
end $$;
revoke all on function public.fitcore_admin(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.fitcore_admin(uuid,text,jsonb) to service_role;

-- Two-phase activation across Auth and PostgreSQL. Claim timeout allows recovery.
create function public.fitcore_activate(p_action text,p_hash text,p_lease uuid,p_terms text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c privado.convites%rowtype;m public.membros_ginasio%rowtype;
begin
 -- Lock gym first in the SAME order as administrative mutations.
 select * into c from privado.convites where token_hash=p_hash;
 if not found then raise exception using errcode='42501',message='Convite inválido ou expirado.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(c.ginasio_id::text,0));
 select * into c from privado.convites where token_hash=p_hash for update;
 select * into m from public.membros_ginasio where ginasio_id=c.ginasio_id and utilizador_id=c.utilizador_id for update;
 if c.revogado_em is not null or c.utilizado_em is not null or c.expira_em<=now() or not m.ativo or m.ativado_em is not null or c.estado_envio<>'enviado' then raise exception using errcode='42501',message='Convite inválido, expirado ou conta suspensa.'; end if;
 if p_action='claim' then
  if p_lease is null or (c.lease_ate>now() and c.lease_id is distinct from p_lease) then raise exception 'Convite já está a ser ativado. Aguarde.'; end if;
  update privado.convites set lease_id=p_lease,lease_ate=now()+interval '3 minutes' where id=c.id;
  return jsonb_build_object('utilizador_id',c.utilizador_id,'email',(select email from auth.users where id=c.utilizador_id));
 end if;
 if c.lease_id is distinct from p_lease or c.lease_ate<=now() then raise exception using errcode='42501',message='Ativação expirada. Tente novamente.'; end if;
 if p_action='release' then update privado.convites set lease_id=null,lease_ate=null where id=c.id;return jsonb_build_object('ok',true);end if;
 if p_action<>'complete' or nullif(trim(p_terms),'') is null then raise exception 'Termos obrigatórios.';end if;
 if not exists(select 1 from auth.users where id=c.utilizador_id and email_confirmed_at is not null) then raise exception 'Identidade não confirmada.';end if;
 perform set_config('fitcore.actor',c.utilizador_id::text,true);
 update public.dados_membros set termos_versao=p_terms,termos_aceites_em=now() where ginasio_id=c.ginasio_id and utilizador_id=c.utilizador_id;
 update public.membros_ginasio set ativado_em=now() where ginasio_id=c.ginasio_id and utilizador_id=c.utilizador_id;
 update privado.convites set utilizado_em=now(),lease_id=null,lease_ate=null where id=c.id;
 return jsonb_build_object('email',(select email from auth.users where id=c.utilizador_id),'role',case m.funcao when 'aluno' then 'student' when 'gestor' then 'gym_admin' else 'trainer' end,'ginasio_id',c.ginasio_id);
end $$;
revoke all on function public.fitcore_activate(text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.fitcore_activate(text,text,uuid,text) to service_role;
commit;
select 'Cadastro seguro instalado. Configure as Edge Functions antes de publicar o frontend.' resultado;
