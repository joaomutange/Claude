// Edge Function: convidar-admin
// Recebe: { ginasio_id, nome_admin, email }
// Usa service_role para:
//   1. Enviar convite por email via auth.admin.inviteUserByEmail
//   2. Criar/actualizar registo em membros_ginasio com utilizador_id real
// Requer variáveis de ambiente (definidas automaticamente no Supabase):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Validar que o pedido vem de um utilizador autenticado ──────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Não autenticado." }, 401);
    }

    // Cliente com a chave do utilizador (para verificar se é superadmin)
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verificar que o utilizador é superadmin
    const { data: isSA, error: saErr } = await supabaseUser.rpc("is_superadmin");
    if (saErr || !isSA) {
      return json({ error: "Acesso negado. Apenas superadmins podem convidar administradores." }, 403);
    }

    // ── 2. Ler e validar o body ───────────────────────────────────────────
    const body = await req.json();
    const { ginasio_id, nome_admin, email } = body ?? {};

    if (!ginasio_id || !nome_admin || !email) {
      return json({ error: "Campos obrigatórios em falta: ginasio_id, nome_admin, email." }, 400);
    }

    const emailNorm = String(email).trim().toLowerCase();

    // ── 3. Cliente com service_role (ignora RLS, pode criar utilizadores) ─
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 4. Verificar se já existe membro com este email neste ginásio ─────
    const { data: existing } = await supabaseAdmin
      .from("membros_ginasio")
      .select("utilizador_id, conta_pendente")
      .eq("ginasio_id", ginasio_id)
      .eq("email_convite", emailNorm)
      .maybeSingle();

    if (existing && !existing.conta_pendente) {
      return json({ error: "Já existe um administrador activo com este e-mail neste ginásio." }, 409);
    }

    // ── 5. Verificar se o utilizador já existe em auth.users ─────────────
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = authUsers?.users?.find(u => u.email === emailNorm);

    let utilizadorId: string;

    if (existingAuthUser) {
      // Utilizador já tem conta — associar directamente
      utilizadorId = existingAuthUser.id;
    } else {
      // Enviar convite por email — Supabase cria o utilizador e envia o link
      const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        emailNorm,
        {
          data: { nome: String(nome_admin).trim() }, // guardado em raw_user_meta_data
          redirectTo: `${Deno.env.get("SITE_URL") ?? "https://fitcore.ao"}/login`,
        }
      );
      if (inviteErr) {
        return json({ error: "Erro ao enviar convite: " + inviteErr.message }, 500);
      }
      utilizadorId = invited.user!.id;
    }

    // ── 6. Criar ou actualizar registo em membros_ginasio ─────────────────
    if (existing) {
      // Já existe registo pendente — actualizar com o utilizador_id real
      await supabaseAdmin
        .from("membros_ginasio")
        .update({
          utilizador_id:  utilizadorId,
          nome:           String(nome_admin).trim(),
          ativo:          !!existingAuthUser, // ativo imediatamente se já tem conta
          conta_pendente: !existingAuthUser,
        })
        .eq("ginasio_id", ginasio_id)
        .eq("email_convite", emailNorm);
    } else {
      await supabaseAdmin
        .from("membros_ginasio")
        .insert({
          utilizador_id:  utilizadorId,
          ginasio_id,
          nome:           String(nome_admin).trim(),
          email_convite:  emailNorm,
          funcao:         "admin",
          ativo:          !!existingAuthUser,
          conta_pendente: !existingAuthUser,
        });
    }

    const mensagem = existingAuthUser
      ? `Utilizador existente associado como admin do ginásio.`
      : `Convite enviado para ${emailNorm}. O acesso será activado após o primeiro login.`;

    return json({ ok: true, message: mensagem, utilizador_id: utilizadorId });

  } catch (err) {
    console.error("[convidar-admin]", err);
    return json({ error: "Erro interno: " + (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
