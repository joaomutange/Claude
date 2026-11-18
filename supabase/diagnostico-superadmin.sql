-- Só leitura. Executar e exportar antes de instalar a nova migration.
select 'colunas' as secao,jsonb_agg(to_jsonb(q)) resultado from (
 select table_name,column_name,data_type,is_nullable,column_default from information_schema.columns
 where table_schema='public' and table_name in ('ginasios','membros_ginasio','superadmins','unidades_ginasio') order by table_name,ordinal_position
) q
union all
select 'funcoes',jsonb_agg(to_jsonb(q)) from (
 select n.nspname,p.proname,pg_get_functiondef(p.oid) definicao,p.proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where p.prokind='f' and ((n.nspname='privado' and p.proname in ('e_membro','e_staff','e_gestor','autor_admin')) or (n.nspname='public' and p.proname in ('is_superadmin','activar_membro_por_email','activar_membro_na_confirmacao')))
) q
union all
select 'triggers_auth',jsonb_agg(to_jsonb(q)) from (
 select tgname,pg_get_triggerdef(oid) definicao from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal
) q
union all
select 'politicas',jsonb_agg(to_jsonb(q)) from (
 select * from pg_policies where schemaname='public' and tablename in ('ginasios','membros_ginasio','superadmins','unidades_ginasio')
) q;
