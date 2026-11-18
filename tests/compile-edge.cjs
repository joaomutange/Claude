const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');const root=path.resolve(__dirname,'..');const esbuild=require('esbuild');const target=path.join(root,'tests/generated');fs.mkdirSync(target,{recursive:true});
for(const [source,dest] of [['supabase/functions/_shared/platform.ts','platform.mjs'],['supabase/functions/convidar-admin/index.ts','invite.mjs'],['supabase/functions/ativar-gestor/index.ts','activate.mjs']]){
 let content=fs.readFileSync(path.join(root,source),'utf8').replace('https://esm.sh/@supabase/supabase-js@2.117.2','@supabase/supabase-js').replace('../_shared/platform.ts','./platform.mjs');
 fs.writeFileSync(path.join(target,dest),esbuild.transformSync(content,{loader:'ts',format:'esm',target:'es2022'}).code);
}
console.log('Funções TypeScript transpiladas para testes locais.');
