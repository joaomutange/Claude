const {PGlite}=require('@electric-sql/pglite');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..'),base=path.resolve(__dirname,'..');const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;let tests=0;let db;
async function ok(name,query,verify){const result=await db.query(query);if(verify&&!verify(result.rows))throw Error(name+': '+JSON.stringify(result.rows));console.log('OK '+name);tests++;return result.rows;}
async function deny(name,query){try{await db.query(query);}catch(err){console.log('BLOQUEADO '+name+': '+err.message);tests++;return;}throw Error('Não bloqueado: '+name);}
const rpc=(action,data={})=>`select public.fitcore_plataforma('${action}','${JSON.stringify(data).replaceAll("'","''")}'::jsonb) result`;
const backend=(actor,action,data={},aal='aal1')=>`select public.fitcore_convite_backend('${id(actor)}','${aal}','${action}','${JSON.stringify(data).replaceAll("'","''")}'::jsonb) result`;
const activate=(action,hash='a'.repeat(64),lease=900)=>`select public.fitcore_ativar_backend('${action}','${hash}','${id(lease)}','terms-v1') result`;
async function as(n,aal='aal1'){await db.exec(`reset role;set role authenticated;set request.jwt.claim.sub='${id(n)}';set request.jwt.claim.aal='${aal}';`);}
async function service(){await db.exec(`reset role;set role service_role;set request.jwt.claim.sub='';set request.jwt.claim.aal='';`);}
async function owner(){await db.exec(`reset role;set request.jwt.claim.sub='';set request.jwt.claim.aal='';`);}
async function setup(withStage3){
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,phone text,last_sign_in_at timestamptz,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.role() returns text language sql stable as $$select current_user::text$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',nullif(current_setting('request.jwt.claim.aal',true),''))$$;
 grant usage on schema auth to authenticated,anon,service_role;`);
 await db.exec(fs.readFileSync(path.join(__dirname,'fixtures/etapa-1.sql'),'utf8'));
 await db.exec(`create schema privado;create function privado.e_gestor(p_ginasio_id uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.membros_ginasio where ginasio_id=p_ginasio_id and utilizador_id=auth.uid() and ativo and funcao='gestor')$$;revoke all on function privado.e_gestor(uuid) from public;grant usage on schema privado to authenticated;grant execute on function privado.e_gestor(uuid) to authenticated;`);
 await db.exec(fs.readFileSync(path.join(__dirname,'fixtures/etapa-2.sql'),'utf8'));
 if(withStage3)await db.exec(fs.readFileSync(path.join(__dirname,'fixtures/etapa-3.sql'),'utf8'));
 // Only the existing global table is needed, never a bootstrap by e-mail.
 await db.exec(`create table public.superadmins(utilizador_id uuid primary key references auth.users(id),nome text,email text,ativo boolean default true);alter table public.superadmins enable row level security;
 insert into auth.users(id,email,raw_user_meta_data) values('${id(1)}','sa@test.invalid','{}'),('${id(2)}','manager@test.invalid','{}'),('${id(3)}','student@test.invalid','{}'),('${id(4)}','other@test.invalid','{}');
 insert into public.superadmins values('${id(1)}','Admin','sa@test.invalid',true);
 insert into public.ginasios(id,nome,slug) values('${id(10)}','Gym A','gym-a'),('${id(20)}','Gym B','gym-b');
 insert into public.membros_ginasio(ginasio_id,utilizador_id,nome,funcao) values('${id(10)}','${id(2)}','Gestor','gestor'),('${id(10)}','${id(3)}','Aluno','aluno'),('${id(20)}','${id(4)}','Outro gestor','gestor');
 insert into public.exercicios(ginasio_id,nome) values('${id(10)}','Exercise A'),('${id(20)}','Exercise B');
 create function public.activar_membro_por_email() returns trigger language plpgsql as $$begin return new;end$$;
 create trigger on_auth_user_created after insert on auth.users for each row execute function public.activar_membro_por_email();`);
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/202611180001_superadmin.sql'),'utf8'));
 await ok('Trigger inseguro removido',`select count(*)::int n from pg_trigger where tgname='on_auth_user_created'`,r=>r[0].n===0);
 await as(2);await deny('Gestor não lista plataforma',rpc('listar'));await deny('Gestor não cria ginásio',rpc('criar',{ginasio_id:id(30),nome:'X',slug:'x'}));
 await ok('Isolamento mantido','select nome from public.exercicios',r=>r.length===1&&r[0].nome==='Exercise A');
 await deny('Cliente não chama API service',backend(1,'reservar',{ginasio_id:id(10),email:'hack@test.invalid'}));
 await deny('Cliente não altera estado diretamente',`insert into public.fitcore_estado_ginasios(ginasio_id) values('${id(30)}')`);
 await as(1);await ok('Superadmin autorizado','select public.is_superadmin() ok',r=>r[0].ok);
 await ok('Lista global tem dois ginásios',rpc('listar'),r=>r[0].result.ginasios.length===2);
 await ok('Criação guiada',rpc('criar',{ginasio_id:id(30),nome:'Gym C',slug:'gym-c',telefone:'+244923000000',comercial:'experimental'}));
 await ok('Repetição não duplica ginásio',rpc('criar',{ginasio_id:id(30),nome:'Gym C',slug:'gym-c'}),r=>r[0].result.existente===true);
 await deny('Telefone inválido rejeitado',rpc('editar',{ginasio_id:id(30),nome:'Gym C',telefone:'abc'}));
 await ok('Edição de contactos',rpc('editar',{ginasio_id:id(30),nome:'Gym C novo',telefone:'+244923000000',morada:'Luanda'}));
 await ok('Estado comercial separado',rpc('comercial',{ginasio_id:id(30),comercial:'ativa',plano:'Pro',vencimento:'2026-12-30'}));
 await deny('Sem gestor não ativa operação',rpc('estado',{ginasio_id:id(30),operacional:'ativo',motivo:'Preparado para abrir'}));
 await ok('Adicionar unidade',rpc('unidade',{ginasio_id:id(10),nome:'Talatona'}));
 await ok('Detalhes incluem unidade',rpc('detalhes',{ginasio_id:id(10)}),r=>r[0].result.unidades.length===1);
 await deny('Suspensão sem motivo',rpc('estado',{ginasio_id:id(10),operacional:'suspenso',motivo:''}));
 await ok('Suspensão do ginásio',rpc('estado',{ginasio_id:id(10),operacional:'suspenso',motivo:'Pedido do responsável'}));
 if(withStage3){await service();await deny('API anterior também bloqueia ginásio suspenso',`select public.fitcore_admin('${id(2)}','list','{"ginasio_id":"${id(10)}"}'::jsonb)`);}
 await as(3);await ok('JWT anterior perde acesso aos exercícios','select * from public.exercicios',r=>r.length===0);await ok('JWT anterior perde acesso ao ginásio','select * from public.ginasios',r=>r.length===0);
 await as(4);await ok('Outro ginásio continua acessível','select * from public.exercicios',r=>r.length===1);
 await as(1);await ok('Superadmin reativa pelo backend',rpc('estado',{ginasio_id:id(10),operacional:'ativo',motivo:'Pedido resolvido'}));
 await as(3);await ok('Histórico recuperado','select nome from public.exercicios',r=>r.length===1&&r[0].nome==='Exercise A');
 await as(1);await deny('Último gestor não suspenso',rpc('gestor_estado',{ginasio_id:id(10),utilizador_id:id(2),ativo:false,motivo:'Tentativa teste'}));
 await service();await deny('Backend verifica ator real',backend(2,'reservar',{ginasio_id:id(30),email:'invite@test.invalid'}));
 await deny('Não associa conta Auth existente',backend(1,'reservar',{ginasio_id:id(30),email:'manager@test.invalid'}));
 const reserve=await ok('Reserva de novo gestor',backend(1,'reservar',{ginasio_id:id(30),email:'invite@test.invalid'}));
 await owner();await db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)`,[id(5),'invite@test.invalid',{nome:'Novo gestor',fitcore_platform_request:reserve[0].result.request_id}]);
 await service();const prepared=await ok('Convite cria vínculo gestor pendente',backend(1,'preparar',{ginasio_id:id(30),email:'invite@test.invalid',nome_admin:'Novo gestor',utilizador_id:id(5),token_hash:'a'.repeat(64)}));
 await as(5);await ok('Pendente não vê ginásio','select * from public.ginasios',r=>r.length===0);
 await service();await deny('Sem envio confirmado não ativa',activate('reclamar'));
 await ok('Regista envio',backend(1,'enviado',{ginasio_id:id(30),convite_id:prepared[0].result.convite_id}));
 await ok('Reclama convite',activate('reclamar'));
 await deny('Pedido concorrente bloqueado',activate('reclamar','a'.repeat(64),901));
 await deny('Sem confirmação Auth não conclui',activate('concluir'));
 await owner();await db.exec(`update auth.users set email_confirmed_at=now() where id='${id(5)}'`);await service();
 await ok('Ativação após confirmação',activate('concluir'));
 await deny('Token não reutilizável',activate('reclamar'));
 await deny('Conta ativa não recebe reset por convite',backend(1,'reservar',{ginasio_id:id(30),email:'invite@test.invalid'}));
 await owner();await db.exec(`update public.membros_ginasio set ativo=false where ginasio_id='${id(30)}' and utilizador_id='${id(5)}'`);await service();
 await deny('Conta suspensa não recebe reset por convite',backend(1,'reservar',{ginasio_id:id(30),email:'invite@test.invalid'}));
 await owner();await db.exec(`update public.membros_ginasio set ativo=true where ginasio_id='${id(30)}' and utilizador_id='${id(5)}'`);await service();
 const second=await ok('Reserva para testar reenvio',backend(1,'reservar',{ginasio_id:id(10),email:'second@test.invalid'}));
 await owner();await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id(6),'second@test.invalid',{fitcore_platform_request:second[0].result.request_id}]);await service();
 const firstSend=await ok('Prepara convite de teste',backend(1,'preparar',{ginasio_id:id(10),email:'second@test.invalid',nome_admin:'Segundo Gestor',utilizador_id:id(6),token_hash:'b'.repeat(64)}));
 await ok('Confirma primeiro envio',backend(1,'enviado',{ginasio_id:id(10),convite_id:firstSend[0].result.convite_id}));
 await deny('Reenvio imediato limitado',backend(1,'preparar',{ginasio_id:id(10),email:'second@test.invalid',nome_admin:'Segundo Gestor',utilizador_id:id(6),token_hash:'c'.repeat(64)}));
 await owner();await db.exec(`update privado.fitcore_convites_gestor set criado_em=now()-interval '2 minutes' where token_hash='${'b'.repeat(64)}'`);await service();
 const resend=await ok('Novo convite substitui anterior',backend(1,'preparar',{ginasio_id:id(10),email:'second@test.invalid',nome_admin:'Segundo Gestor',utilizador_id:id(6),token_hash:'c'.repeat(64)}));
 await ok('Novo envio confirmado',backend(1,'enviado',{ginasio_id:id(10),convite_id:resend[0].result.convite_id}));
 await deny('Convite antigo revogado',activate('reclamar','b'.repeat(64)));
 await owner();await db.exec(`update privado.fitcore_convites_gestor set expira_em=now()-interval '1 second' where token_hash='${'c'.repeat(64)}'`);await service();
 await deny('Convite expirado bloqueado',activate('reclamar','c'.repeat(64)));
 await as(5);await ok('Gestor ativado vê o ginásio','select nome from public.ginasios',r=>r.length===1&&r[0].nome==='Gym C novo');
 await as(1);await ok('Auditoria contém autor e ação',rpc('detalhes',{ginasio_id:id(30)}),r=>r[0].result.auditoria.some(a=>a.acao==='gestor_ativado'&&a.autor_id===id(5)));
 await deny('MFA só é exigido após sessão aal2',rpc('mfa_exigir',{exigir:true}));
 await as(1,'aal2');await ok('Ativar exigência MFA',rpc('mfa_exigir',{exigir:true}));await as(1);await deny('Sessão aal1 bloqueada',rpc('listar'));
 await service();await deny('Convite exige MFA no backend',backend(1,'reservar',{ginasio_id:id(10),email:'second@test.invalid'}));
 await as(1,'aal2');await ok('Sessão aal2 autorizada',rpc('listar'));
 await owner();await ok('Dados preservados',`select count(*)::int n from public.exercicios`,r=>r[0].n===2);
 console.log('Cenário '+(withStage3?'com':'sem')+' etapa 3 aprovado');await db.close();
}
(async()=>{await setup(false);await setup(true);console.log('TOTAL '+tests+' verificações SQL.');})().catch(async err=>{console.error(err.message,err.where||'',err.query||'');if(db)await db.close();process.exitCode=1;});
