import assert from 'node:assert/strict';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const env={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-secret',APP_URL:'https://fitcore.test',TERMS_URL:'https://fitcore.test/termos',TERMS_VERSION:'v1',RESEND_API_KEY:'test-mail',INVITE_FROM:'FitCore <convites@fitcore.test>'};
globalThis.Deno={env:{get:k=>env[k]},serve:()=>{}};
const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id(1),aal:'aal2'})).toString('base64url')+'.mock';
let mode='ok',calls=[],mail=[],passwords=[],consumed=false,lease=false,count=0;
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
globalThis.fetch=async(url,options={})=>{const request=url instanceof Request?url:null;const u=new URL(request?.url||url),method=request?.method||options.method||'GET';const h=new Headers(request?.headers||options.headers);const b=method==='GET'?null:JSON.parse(request?await request.clone().text():options.body||'{}');
 if(u.pathname==='/auth/v1/user')return h.get('authorization')==='Bearer '+jwt?json({id:id(1),email:'sa@test.invalid',aud:'authenticated',created_at:new Date().toISOString()}):json({message:'invalid token'},401);
 if(u.pathname==='/auth/v1/admin/users'&&method==='POST'){passwords.push(b.password);return json({id:id(2),email:b.email});}
 if(u.pathname==='/auth/v1/admin/users/'+id(2)){passwords.push(b.password);return mode==='password-fail'?json({message:'password rejected'},422):json({id:id(2),email:'new@test.invalid'});}
 if(u.hostname==='api.resend.com'){mail.push(b);return mode==='mail-fail'?json({error:'mail unavailable'},500):json({id:'test-mail'});}
 if(u.pathname==='/rest/v1/rpc/fitcore_convite_backend'){
 calls.push(b);if(mode==='forbidden')return json({code:'42501',message:'Acesso reservado.'},403);
 if(b.p_acao==='reservar')return json({request_id:id(50),utilizador_id:null});
 if(b.p_acao==='preparar')return mode==='insert-fail'?json({code:'23514',message:'Vínculo inválido.'},400):json({convite_id:id(60),nome_ginasio:'Ginásio & Qualidade'});
 return json({ok:true});}
 if(u.pathname==='/rest/v1/rpc/fitcore_ativar_backend'){
 calls.push(b);if(b.p_acao==='libertar'){lease=false;return json({ok:true});}
 if(consumed)return json({code:'P0001',message:'Expirado'},400);
 if(b.p_acao==='reclamar'){lease=true;return json({utilizador_id:id(2),email:'new@test.invalid'});}
 if(b.p_acao==='concluir'){consumed=true;lease=false;return json({email:'new@test.invalid'});}}
 throw Error('Unexpected request '+u.pathname);
};
const {handler:invite}=await import('./generated/invite.mjs');const {handler:activate}=await import('./generated/activate.mjs');
const req=(body,auth=jwt,origin=env.APP_URL)=>new Request('https://mock.supabase.co/functions/v1/test',{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:'Bearer '+auth}:{}),origin},body:JSON.stringify(body)});
const payload={ginasio_id:id(10),nome_admin:'Nome <script>',email:' NEW@test.invalid ',p_actor:id(99)};
async function check(name,fn){await fn();count++;console.log('OK '+name);}
await check('JWT obrigatório',async()=>assert.equal((await invite(req(payload,''))).status,401));
await check('JWT falso recusado',async()=>assert.equal((await invite(req(payload,'fake'))).status,401));
await check('Origem externa recusada',async()=>assert.equal((await invite(req(payload,jwt,'https://evil.test'))).status,403));
await check('Corpo excessivo recusado',async()=>assert.notEqual((await invite(req({...payload,nome_admin:'x'.repeat(20000)}))).status,200));
await check('UUID inválido recusado',async()=>assert.equal((await invite(req({...payload,ginasio_id:'x'}))).status,400));
mode='forbidden';await check('Backend consulta autorização no banco',async()=>assert.equal((await invite(req(payload))).status,403));mode='ok';
await check('Autor é retirado do JWT verificado',async()=>{const response=await invite(req(payload));assert.equal(response.status,200);const value=await response.json();assert.equal(value.invitationSent,true);assert.ok(calls.every(c=>!c.p_actor||c.p_actor===id(1)));assert.ok(calls.filter(c=>c.p_actor).every(c=>c.p_aal==='aal2'));});
await check('Password inicial forte e não devolvida',async()=>{assert.equal(passwords[0].length,68);assert.ok(passwords[0].startsWith('Aa1!'));});
await check('Convite HTML escapa nome e usa fragmento',async()=>{assert.ok(mail[0].html.includes('Nome &lt;script&gt;'));assert.ok(mail[0].html.includes('https://fitcore.test/primeiro-acesso#token='));assert.ok(mail[0].html.includes('Ginásio &amp; Qualidade'));assert.ok(calls.find(c=>c.p_acao==='preparar').p_dados.token_hash.match(/^[a-f0-9]{64}$/));});
mode='insert-fail';await check('Erro de vínculo impede envio',async()=>{const before=mail.length;assert.notEqual((await invite(req(payload))).status,200);assert.equal(mail.length,before);});mode='mail-fail';
await check('Falha email não aparece como sucesso de envio',async()=>{const r=await invite(req(payload));assert.equal((await r.json()).invitationSent,false);assert.ok(calls.some(c=>c.p_acao==='falhou'));});mode='ok';
const activation={token:'a'.repeat(64),password:'Senha-exclusiva-2026',accepted:true,termsVersion:'v1'};
await check('Aceitação dos termos obrigatória',async()=>assert.equal((await activate(req({...activation,accepted:false},''))).status,400));
await check('Versão de termos tem de coincidir',async()=>assert.equal((await activate(req({...activation,termsVersion:'outros'},''))).status,400));
await check('Password curta rejeitada',async()=>assert.equal((await activate(req({...activation,password:'curta'},''))).status,400));
await check('Limite UTF8 da password aplicado',async()=>assert.equal((await activate(req({...activation,password:'🔐'.repeat(20)},''))).status,400));
mode='password-fail';await check('Falha Auth liberta a reserva',async()=>{assert.equal((await activate(req(activation,''))).status,400);assert.equal(lease,false);assert.ok(calls.some(c=>c.p_acao==='libertar'));});mode='ok';
await check('Ativação usa password escolhida',async()=>{const r=await activate(req(activation,'')),b=await r.json();assert.equal(r.status,200);assert.equal(b.email,'new@test.invalid');assert.equal(passwords.at(-1),activation.password);assert.equal(calls.at(-1).p_termos,'v1');assert.ok(!JSON.stringify(b).includes('test-secret'));});
await check('Segundo uso recusado',async()=>assert.equal((await activate(req(activation,''))).status,400));
console.log('TOTAL '+count+' verificações de backend com Auth e email simulados.');
