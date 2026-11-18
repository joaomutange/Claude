# Análise antes da implementação

Origem: joaomutange/Claude, ramo main, consultado em 18/11/2026. As alterações são preparadas localmente; não executadas na produção.

## Estrutura observada

- React 18/Vite, entrada index.html → src/main.jsx → src/App.jsx. O painel global está embutido em App.jsx. Dashboard.jsx contém os módulos dos ginásios.
- Auth com Supabase; superadmins é a tabela global e is_superadmin() é a verificação existente. membros_ginasio utiliza gestor/trainer/aluno na base histórica.
- As migrations no GitHub não constituem uma descrição completa do banco em produção. Há também a migration de cadastro seguro entregue anteriormente. As políticas e constraints exportadas no chat são anteriores às últimas alterações do utilizador.

## Problemas identificados

- App.jsx contém promoção visual por endereço de e-mail fixo. Remover e verificar exclusivamente a autorização no banco.
- convidar-admin grava admin e ignora erros ao inserir/atualizar membros. O endpoint também associa contas existentes sem confirmação específica e pesquisa apenas a primeira página de Auth.
- Migration 002 ativa vínculos ao criar auth.users, antes de aceitar o convite; uma segunda função altera vínculos por e-mail na confirmação. A nova migration remove somente esses dois triggers conhecidos, preservando a criação de perfis e a auditoria.
- Acesso do treinador na aplicação e nas regras existentes precisa ser distinguido: as regras anteriores são amplas no ginásio. Esta entrega não muda a regra para apenas alunos atribuídos.

## Fluxo proposto e ficheiros

- Extrair o painel para src/SuperadminPanel.jsx, com métricas separadas, pesquisa, filtros, detalhes, unidades, gestores e auditoria; formulário guiado e suspensão com motivo.
- src/platform.js contém validação/apresentação e o cliente da RPC. src/superadmin.css limita os estilos ao novo painel.
- src/App.jsx reutiliza login, recuperação e dashboard. Acrescentar src/FirstAccess.jsx para definir a palavra-passe e aceitar um convite associado à sessão correta.
- supabase/migrations/202611180001_superadmin.sql acrescenta estado operacional e comercial separados, convites, auditoria e RPCs. Mantém gestor como função e preserva membros existentes. Sem apagar tabelas ou históricos.
- supabase/functions/convidar-admin/index.ts valida JWT e superadmin no servidor, cria a conta Auth e um convite próprio pendente por RPC e envia pelo Resend. Tokens não são devolvidos ao gestor. Reenvios revogam o nonce anterior; expiração adicional de 24 horas é verificada no banco.

## RLS e migração

- Dados globais só são lidos pelo superadmin; escrita por RPCs com verificação no banco, sem confiar em papel enviado pelo cliente.
- Políticas restritivas bloqueiam operações de utilizadores de um ginásio suspenso; suspensão preserva dados e não suspende a conta Auth global.
- Novos convites só ativam o vínculo após sessão verificada, nonce válido e password definida. O primeiro acesso não exige palavra-passe visível ao gestor.
- Sem backfill de contactos nem conversão automática de admin para gestor: normalizar somente registos afetados após inspeção, caso existam. As funções e os vínculos antigos são preservados.
- MFA: a interface disponibilizará configuração TOTP. Exigência de AAL2 deve ser ativada após inscrição; ativar obrigatoriamente antes pode bloquear o único operador. O banco terá configuração explícita inicialmente desligada.
- Antes de produção: backup, diagnóstico atual e teste numa cópia. A migration é transacional e recusa uma estrutura base ausente. Não voltar a correr migrations 001/002 antigas depois desta.

## Limites

Estados comerciais são administrativos; não confirmam cobrança bancária. O último acesso Auth é global da conta, não uma prova de visita ao ginásio. SMTP/Resend, DNS, termos e credenciais devem ser configurados pelo operador. Não há impersonação nem eliminação de ginásios nesta entrega.
