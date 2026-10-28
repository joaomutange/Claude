-- ═══════════════════════════════════════════════════════════════
-- FitCore — Migração 001: Perfis e Notificações
-- Correr no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1. ACTUALIZAR ENUM funcao em membros_ginasio
--    Adicionar 'admin' e 'superadmin' aos valores existentes
-- ───────────────────────────────────────────────────────────────

-- Se funcao for um tipo ENUM, precisamos adicionar os novos valores
-- (se for TEXT simples, este bloco pode ser ignorado)
DO $$
BEGIN
  -- Verificar se existe o tipo enum
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funcao_membro') THEN
    ALTER TYPE funcao_membro ADD VALUE IF NOT EXISTS 'admin';
    ALTER TYPE funcao_membro ADD VALUE IF NOT EXISTS 'superadmin';
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────
-- 2. TABELA superadmins
--    Contas separadas que gerem toda a plataforma
--    (não pertencem a nenhum ginásio específico)
-- ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS superadmins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilizador_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome            text NOT NULL,
  email           text NOT NULL,
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT superadmins_utilizador_unique UNIQUE (utilizador_id)
);

-- Index para lookup rápido por utilizador_id
CREATE INDEX IF NOT EXISTS superadmins_utilizador_idx ON superadmins(utilizador_id);

COMMENT ON TABLE superadmins IS 'Contas da plataforma FitCore com acesso global a todos os ginásios';

-- ───────────────────────────────────────────────────────────────
-- 3. TABELA notificacoes
--    Sistema de notificações por ginásio
-- ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notificacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ginasio_id      uuid NOT NULL REFERENCES ginasios(id) ON DELETE CASCADE,

  -- Quem gerou a notificação (pode ser NULL para eventos de sistema)
  origem_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Tipo da notificação
  tipo            text NOT NULL,
  -- Valores esperados:
  --   'novo_membro'       — gestor registou novo aluno
  --   'novo_funcionario'  — gestor registou novo funcionário
  --   'pagamento_atraso'  — mensalidade em atraso
  --   'falta_excessiva'   — funcionário com faltas a mais
  --   'plano_expirado'    — plano de treino expirado

  -- Título e corpo (para mostrar no sino/painel)
  titulo          text NOT NULL,
  corpo           text,

  -- Dados adicionais (ex: id do membro, id do pagamento)
  payload         jsonb DEFAULT '{}',

  -- Destinatários por papel (quem deve ver esta notificação)
  para_roles      text[] NOT NULL DEFAULT '{admin}',
  -- ex: '{admin}', '{admin,gestor}', '{trainer}'

  -- Estado de leitura (por utilizador_id)
  lida_por        uuid[] NOT NULL DEFAULT '{}',

  prioridade      text NOT NULL DEFAULT 'normal',
  -- 'baixa' | 'normal' | 'alta' | 'urgente'

  criado_em       timestamptz NOT NULL DEFAULT now(),
  expira_em       timestamptz  -- NULL = não expira
);

-- Indexes
CREATE INDEX IF NOT EXISTS notificacoes_ginasio_idx   ON notificacoes(ginasio_id);
CREATE INDEX IF NOT EXISTS notificacoes_tipo_idx      ON notificacoes(tipo);
CREATE INDEX IF NOT EXISTS notificacoes_criado_idx    ON notificacoes(criado_em DESC);
CREATE INDEX IF NOT EXISTS notificacoes_roles_idx     ON notificacoes USING GIN(para_roles);

COMMENT ON TABLE notificacoes IS 'Notificações internas por ginásio (novo membro, pagamentos, etc.)';

-- ───────────────────────────────────────────────────────────────
-- 4. TRIGGER — atualizado_em automático em superadmins
-- ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS superadmins_atualizado_em ON superadmins;
CREATE TRIGGER superadmins_atualizado_em
  BEFORE UPDATE ON superadmins
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- ───────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS)
-- ───────────────────────────────────────────────────────────────

-- 5a. superadmins — só o próprio superadmin lê o seu registo
ALTER TABLE superadmins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_le_proprio" ON superadmins;
CREATE POLICY "superadmin_le_proprio"
  ON superadmins FOR SELECT
  USING (utilizador_id = auth.uid());

-- 5b. notificacoes — utilizador vê notificações do seu ginásio
--     se o seu papel (funcao) estiver em para_roles
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificacao_visivel_por_role" ON notificacoes;
CREATE POLICY "notificacao_visivel_por_role"
  ON notificacoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membros_ginasio m
      WHERE m.utilizador_id = auth.uid()
        AND m.ginasio_id    = notificacoes.ginasio_id
        AND m.ativo         = true
        AND m.funcao        = ANY(notificacoes.para_roles)
    )
  );

-- Gestores e admins podem inserir notificações no seu ginásio
DROP POLICY IF EXISTS "notificacao_inserir" ON notificacoes;
CREATE POLICY "notificacao_inserir"
  ON notificacoes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM membros_ginasio m
      WHERE m.utilizador_id = auth.uid()
        AND m.ginasio_id    = notificacoes.ginasio_id
        AND m.ativo         = true
        AND m.funcao        IN ('admin', 'gestor', 'superadmin')
    )
  );

-- ───────────────────────────────────────────────────────────────
-- 6. FUNÇÃO AUXILIAR — marcar notificação como lida
-- ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION marcar_notificacao_lida(p_notificacao_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notificacoes
  SET lida_por = array_append(lida_por, auth.uid())
  WHERE id = p_notificacao_id
    AND NOT (auth.uid() = ANY(lida_por)); -- evitar duplicados
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ───────────────────────────────────────────────────────────────
-- 7. FUNÇÃO AUXILIAR — verificar se utilizador é superadmin
-- ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM superadmins
    WHERE utilizador_id = auth.uid()
      AND ativo = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ───────────────────────────────────────────────────────────────
-- 8. SUPERADMIN — acesso total (bypassa RLS dos ginásios)
-- ───────────────────────────────────────────────────────────────

-- Superadmin pode ler todos os ginásios
DROP POLICY IF EXISTS "superadmin_le_ginasios" ON ginasios;
CREATE POLICY "superadmin_le_ginasios"
  ON ginasios FOR SELECT
  USING (is_superadmin());

-- Superadmin pode criar ginásios
DROP POLICY IF EXISTS "superadmin_cria_ginasio" ON ginasios;
CREATE POLICY "superadmin_cria_ginasio"
  ON ginasios FOR INSERT
  WITH CHECK (is_superadmin());

-- Superadmin pode actualizar qualquer ginásio
DROP POLICY IF EXISTS "superadmin_atualiza_ginasio" ON ginasios;
CREATE POLICY "superadmin_atualiza_ginasio"
  ON ginasios FOR UPDATE
  USING (is_superadmin());

-- Superadmin pode ler todos os membros
DROP POLICY IF EXISTS "superadmin_le_membros" ON membros_ginasio;
CREATE POLICY "superadmin_le_membros"
  ON membros_ginasio FOR SELECT
  USING (is_superadmin());

-- Superadmin pode inserir membros (incluindo criar o primeiro admin)
DROP POLICY IF EXISTS "superadmin_insere_membro" ON membros_ginasio;
CREATE POLICY "superadmin_insere_membro"
  ON membros_ginasio FOR INSERT
  WITH CHECK (is_superadmin());

-- ───────────────────────────────────────────────────────────────
-- 9. DADOS INICIAIS — registar o superadmin da plataforma
--    SUBSTITUIR o email e nome correctos antes de correr!
-- ───────────────────────────────────────────────────────────────

-- INSTRUÇÃO: Descomentar e preencher com os teus dados reais:
/*
INSERT INTO superadmins (utilizador_id, nome, email)
SELECT
  id,
  'Teu Nome Aqui',
  'teu@email.com'
FROM auth.users
WHERE email = 'teu@email.com'
ON CONFLICT (utilizador_id) DO NOTHING;
*/

-- ═══════════════════════════════════════════════════════════════
-- FIM DA MIGRAÇÃO
-- Verificar com:
--   SELECT * FROM superadmins;
--   SELECT * FROM notificacoes LIMIT 5;
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'membros_ginasio';
-- ═══════════════════════════════════════════════════════════════
