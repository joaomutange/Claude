import { supabase } from './supabase';
export const operations = { em_configuracao: 'Em configuração', ativo: 'Ativo', suspenso: 'Suspenso' };
export const billing = { sem_plano: 'Sem plano', experimental: 'Experimental', ativa: 'Subscrição ativa', em_atraso: 'Em atraso', cancelada: 'Cancelada' };
export const invitations = { ativo:'Conta ativa',aguardando:'Aguardando ativação',expirado:'Convite expirado',envio_pendente:'Envio pendente',revogado:'Convite revogado',suspenso:'Conta suspensa' };
export const date = value => value ? new Date(value.length === 10 ? value + 'T12:00:00' : value).toLocaleDateString('pt-AO') : '—';
export const initials = value => (value || 'FitCore').split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase();
export const slugify = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60).replace(/-$/,'');
export function phone(value) { const clean = (value || '').replace(/[\s()-]/g,''); return /^\d{9}$/.test(clean) ? '+244' + clean : clean; }
export function validPhone(value) { return !value || /^\+[1-9][0-9]{6,14}$/.test(phone(value)); }
export async function platform(action, data = {}) {
 const result = await supabase.rpc('fitcore_plataforma',{p_acao:action,p_dados:data});
 if(result.error) throw Error(result.error.code==='23505'?'Já existe um registo com esse identificador ou nome.':result.error.message);
 return result.data;
}
export async function invite(gymId, name, email) {
 const {data,error}=await supabase.functions.invoke('convidar-admin',{body:{ginasio_id:gymId,nome_admin:name.trim(),email:email.trim().toLowerCase()}});
 if(error){let message;try{message=(await error.context?.json())?.error;}catch{}throw Error(message||'Não foi possível enviar o convite. Verifique a função e a configuração de envio.');}
 if(data?.error)throw Error(data.error);if(!data?.ok)throw Error('Resposta de convite inválida.');return data;
}
