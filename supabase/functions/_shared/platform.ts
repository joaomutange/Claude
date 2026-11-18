import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2';
export function environment() {
 const url=Deno.env.get('APP_URL');
 if(!url || new URL(url).protocol!=='https:' || new URL(url).origin!==url) throw Error('APP_URL deve ser origem HTTPS sem barra final.');
 return {origin:url,terms:Deno.env.get('TERMS_URL'),version:Deno.env.get('TERMS_VERSION')};
}
export function adminClient(){return createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});}
export function response(_req:Request,status:number,value:unknown){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':Deno.env.get('APP_URL')||'','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}});}
export function preflight(req:Request):Response|null{
 const {origin}=environment();
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return response(req,403,{error:'Origem não autorizada.'});
 if(req.method==='OPTIONS')return response(req,200,{ok:true});
 if(req.method!=='POST')return response(req,405,{error:'Método inválido.'});return null;
}
export async function body(req:Request){
 if(Number(req.headers.get('content-length'))>16384)throw Error('Pedido demasiado grande.');
 const reader=req.body?.getReader();if(!reader)throw Error('Pedido vazio.');
 const chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw Error('Pedido demasiado grande.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
export function token(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');}
export async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');}
export function escape(value:string){return value.replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]!));}
export function uuid(value:unknown){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
