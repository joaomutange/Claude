import {adminClient,environment,preflight,response,body,hash} from '../_shared/platform.ts';
export async function handler(req:Request):Promise<Response>{
 let lease:string|undefined,tokenHash:string|undefined;let client:ReturnType<typeof adminClient>|undefined;
 try{
  const early=preflight(req);if(early)return early;client=adminClient();
  const input=await body(req),env=environment();
  if(!env.version||!env.terms||new URL(env.terms).protocol!=='https:')return response(req,503,{error:'Primeiro acesso indisponível. Contacte a plataforma.'});
  if(typeof input.token!=='string'||!/^[a-f0-9]{64}$/.test(input.token)||typeof input.password!=='string'||input.password.length<12||new TextEncoder().encode(input.password).length>72||input.accepted!==true||input.termsVersion!==env.version)return response(req,400,{error:'Verifique o convite, aceite os termos e use uma palavra-passe com pelo menos 12 caracteres e até 72 bytes.'});
  lease=crypto.randomUUID();tokenHash=await hash(input.token);
  const claim=await client.rpc('fitcore_ativar_backend',{p_acao:'reclamar',p_hash:tokenHash,p_lease:lease});
  if(claim.error)return response(req,400,{error:'Convite inválido, expirado ou em utilização. Peça um novo convite.'});
  const updated=await client.auth.admin.updateUserById(claim.data.utilizador_id,{password:input.password,email_confirm:true});
  if(updated.error)throw Error('password');
  const complete=await client.rpc('fitcore_ativar_backend',{p_acao:'concluir',p_hash:tokenHash,p_lease:lease,p_termos:env.version});
  if(complete.error)throw Error('completion');lease=undefined;
  return response(req,200,{ok:true,email:complete.data.email});
 }catch{
  if(client&&lease&&tokenHash)await client.rpc('fitcore_ativar_backend',{p_acao:'libertar',p_hash:tokenHash,p_lease:lease});
  return response(req,400,{error:'Não foi possível ativar o acesso. Tente novamente; se persistir, peça novo convite.'});
 }
}
Deno.serve(handler);
