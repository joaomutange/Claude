import { adminClient, environment, preflight, response, body, token, hash, escape, uuid } from '../_shared/platform.ts';

export async function handler(req: Request): Promise<Response> {
  try {
    const early = preflight(req); if (early) return early;
    const client = adminClient();
    const bearer = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!bearer) return response(req, 401, { error: 'Inicie sessão novamente.' });
    const { data: identity, error: identityError } = await client.auth.getUser(bearer);
    if (identityError || !identity.user) return response(req, 401, { error: 'Sessão inválida.' });
    // Decode only the SAME JWT just validated by the Auth server.
    let aal = 'aal1';
    try { aal = JSON.parse(atob(bearer.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).aal || 'aal1'; } catch {}
    const input = await body(req);
    if (!uuid(input.ginasio_id) || typeof input.nome_admin !== 'string' || input.nome_admin.trim().length < 1 || input.nome_admin.length > 120 || typeof input.email !== 'string' || input.email.length > 254) {
      return response(req, 400, { error: 'Verifique o ginásio, o nome e o e-mail.' });
    }
    const email = input.email.trim().toLowerCase();
    const data = { ginasio_id: input.ginasio_id, nome_admin: input.nome_admin.trim(), email };
    async function call(action: string, extra = {}) {
      return client.rpc('fitcore_convite_backend', { p_actor: identity.user!.id, p_aal: aal, p_acao: action, p_dados: { ...data, ...extra } });
    }
    const key = Deno.env.get('RESEND_API_KEY'), from = Deno.env.get('INVITE_FROM');
    const env = environment();
    if (!key || !from || !env.terms || !env.version || new URL(env.terms).protocol !== 'https:') return response(req, 503, { error: 'Configure o envio de e-mails e os termos antes de enviar convites.' });
    const reservation = await call('reservar');
    if (reservation.error) return response(req, reservation.error.code === '42501' ? 403 : 409, { error: reservation.error.message });
    let userId = reservation.data.utilizador_id;
    if (!userId) {
      const created = await client.auth.admin.createUser({ email, password: 'Aa1!' + token(), email_confirm: false,
        user_metadata: { nome: data.nome_admin, fitcore_platform_request: reservation.data.request_id } });
      if (created.error || !created.data.user) return response(req, 409, { error: 'Não foi possível criar a conta. Uma conta existente exige associação autorizada. Pode repetir para retomar um cadastro interrompido.' });
      userId = created.data.user.id;
    }
    const rawToken = token();
    const prepared = await call('preparar', { utilizador_id: userId, token_hash: await hash(rawToken) });
    if (prepared.error) return response(req, 409, { error: prepared.error.message });
    const inviteId = prepared.data.convite_id;
    const link = env.origin + '/primeiro-acesso#token=' + rawToken;
    let sent = false;
    try {
      const result = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(15000), headers: {
        Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'Idempotency-Key': 'fitcore-gestor-' + inviteId,
      }, body: JSON.stringify({ from, to: [email], subject: 'O seu acesso a ' + prepared.data.nome_ginasio,
        html: '<h1>Bem-vindo ao FitCore</h1><p>Olá, ' + escape(data.nome_admin) + '.</p><p>Foi convidado para gerir ' + escape(prepared.data.nome_ginasio) + '.</p><p><a href="' + escape(link) + '">Definir palavra-passe e ativar acesso</a></p><p>O convite expira em 24 horas e só pode ser utilizado uma vez. Se não esperava este convite, ignore-o.</p>',
        text: 'Ative o seu acesso de gestor: ' + link + '\nVálido por 24 horas, uma única utilização.',
      }) });
      sent = result.ok;
    } catch {}
    const recorded = await call(sent ? 'enviado' : 'falhou', { convite_id: inviteId });
    if (recorded.error || !sent) return response(req, 200, { ok: true, invitationSent: false,
      message: 'Gestor cadastrado. O envio do convite não foi confirmado. Verifique o serviço de e-mail e reenvie pela lista de gestores.' });
    return response(req, 200, { ok: true, invitationSent: true, message: 'Gestor cadastrado com sucesso. Convite de acesso enviado.' });
  } catch { return response(req, 500, { error: 'Não foi possível concluir o convite. Verifique a configuração e tente novamente.' }); }
}
Deno.serve(handler);

