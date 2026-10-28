-- ═══════════════════════════════════════════════════════════════
-- FitCore — Migração 001: Perfis e Notificações
-- Correr TUDO DE UMA VEZ no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1. ACTUALIZAR ENUM funcao (se existir como tipo enum)
-- ───────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'funcao_membro') THEN
    ALTER TYPE funcao_membro ADD VALUE IF NOT EXISTS 'admin';
    ALTER TYPE funcao_membro ADD VALUE IF NOT EXISTS 'superadmin';
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────
-- 2. TABELA superadmins
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

CREATE INDEX IF NOT EXISTS superadmins_utilizador_idx ON superadmins(utilizador_id);

-- ───────────────────────────────────────────────────────────────
-- 3. TABELA notificacoes
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacoes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ginasio_id  uuid NOT NULL REFERENCES ginasios(id) ON DELETE CASCADE,
  origem_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo        text NOT NULL,
  titulo      text NOT NULL,
  corpo       text,
  payload     jsonb DEFAULT '{}',
  para_roles  text[] NOT NULL DEFAULT '{admin}',
  lida_por    uuid[] NOT NULL DEFAULT '{}',
  prioridade  text NOT NULL DEFAULT 'normal',
  criado_em   timestamptz NOT NULL DEFAULT now(),
  expira_em   timestamptz
);

CREATE INDEX IF NOT EXISTS notificacoes_ginasio_idx ON notificacoes(ginasio_id);
CREATE INDEX IF NOT EXISTS notificacoes_criado_idx  ON notificacoes(criado_em DESC);
CREATE INDEX IF NOT EXISTS notificacoes_roles_idx   ON notificacoes USING GIN(para_roles);

-- ───────────────────────────────────────────────────────────────
-- 4. TRIGGER atualizado_em
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
-- 5. FUNÇÃO is_superadmin()
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
-- 6. FUNÇÃO marcar_notificacao_lida()
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION marcar_notificacao_lida(p_notificacao_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notificacoes
  SET lida_por = array_append(lida_por, auth.uid())
  WHERE id = p_notificacao_id
    AND NOT (auth.uid() = ANY(lida_por));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ───────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────

-- superadmins
ALTER TABLE superadmins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_le_proprio" ON superadmins;
CREATE POLICY "superadmin_le_proprio"
  ON superadmins FOR SELECT
  USING (utilizador_id = auth.uid());

-- notificacoes
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificacao_select" ON notificacoes;
CREATE POLICY "notificacao_select"
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

DROP POLICY IF EXISTS "notificacao_insert" ON notificacoes;
CREATE POLICY "notificacao_insert"
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

-- Políticas superadmin para ginasios
DROP POLICY IF EXISTS "superadmin_select_ginasios" ON ginasios;
CREATE POLICY "superadmin_select_ginasios"
  ON ginasios FOR SELECT
  USING (is_superadmin());

DROP POLICY IF EXISTS "superadmin_insert_ginasio" ON ginasios;
CREATE POLICY "superadmin_insert_ginasio"
  ON ginasios FOR INSERT
  WITH CHECK (is_superadmin());

DROP POLICY IF EXISTS "superadmin_update_ginasio" ON ginasios;
CREATE POLICY "superadmin_update_ginasio"
  ON ginasios FOR UPDATE
  USING (is_superadmin());

-- Políticas superadmin para membros_ginasio
DROP POLICY IF EXISTS "superadmin_select_membros" ON membros_ginasio;
CREATE POLICY "superadmin_select_membros"
  ON membros_ginasio FOR SELECT
  USING (is_superadmin());

DROP POLICY IF EXISTS "superadmin_insert_membro" ON membros_ginasio;
CREATE POLICY "superadmin_insert_membro"
  ON membros_ginasio FOR INSERT
  WITH CHECK (is_superadmin());

-- ───────────────────────────────────────────────────────────────
-- 8. REGISTAR O SUPERADMIN DA PLATAFORMA
--    (a tabela já existe agora, pode correr em segurança)
-- ───────────────────────────────────────────────────────────────
INSERT INTO superadmins (utilizador_id, nome, email)
SELECT
  id,
  'Miguel Mutange',
  'joaomutange@gmail.com'
FROM auth.users
WHERE email = 'joaomutange@gmail.com'
ON CONFLICT (utilizador_id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL
-- ───────────────────────────────────────────────────────────────
SELECT 'superadmins' AS tabela, count(*) AS registos FROM superadmins
UNION ALL
SELECT 'notificacoes', count(*) FROM notificacoes;
