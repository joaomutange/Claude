-- ═══════════════════════════════════════════════════════════════════════════
-- Migração 002: Trigger para activar membro quando utilizador aceita convite
-- ═══════════════════════════════════════════════════════════════════════════
-- Quando um novo utilizador é criado em auth.users (via convite ou registo),
-- verifica se existe um registo pendente em membros_ginasio com o mesmo email
-- e actualiza: utilizador_id → id real, ativo → true, conta_pendente → false

CREATE OR REPLACE FUNCTION activar_membro_por_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.membros_ginasio
  SET
    utilizador_id  = NEW.id,
    ativo          = true,
    conta_pendente = false
  WHERE
    LOWER(email_convite) = LOWER(NEW.email)
    AND conta_pendente = true;

  RETURN NEW;
END;
$$;

-- Remover trigger anterior se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Disparar após INSERT em auth.users (novo registo ou aceitação de convite)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION activar_membro_por_email();

-- Também disparar quando o email é confirmado (convite aceite actualiza confirmed_at)
CREATE OR REPLACE FUNCTION activar_membro_na_confirmacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só actuar quando confirmed_at passa de NULL para preenchido
  IF OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL THEN
    UPDATE public.membros_ginasio
    SET
      utilizador_id  = NEW.id,
      ativo          = true,
      conta_pendente = false
    WHERE
      LOWER(email_convite) = LOWER(NEW.email)
      AND conta_pendente = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION activar_membro_na_confirmacao();
