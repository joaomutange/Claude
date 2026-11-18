# Instalar o painel global melhorado

Esta entrega é código preparado e testado localmente. Não foi publicada nem executada no banco em produção. Os números das imagens de pré-visualização são fictícios.

## 1. Preparar a base de dados

Faça uma cópia de segurança e teste a migration numa cópia do projeto. O banco mudou desde o último diagnóstico do chat: confirme especialmente superadmins, membros_ginasio, ginasios, funções e triggers atuais.

Abra somente `supabase/migrations/202611180001_superadmin.sql`, copie o conteúdo completo para o SQL Editor e execute UMA VEZ como postgres. Não volte a executar 001/002, nem execute `supabase db push` sem reconciliar o histórico remoto.

A migration:
- Acrescenta `fitcore_estado_ginasios`, `fitcore_auditoria_global` e três tabelas privadas para configuração, reservas e convites; reutiliza `unidades_ginasio` caso exista.
- Inicializa os estados comerciais como sem_plano e operacionais como em_configuracao. Não inventa que os ginásios existentes estão pagos ou suspensos; em_configuracao permite os acessos existentes.
- Remove só os triggers de auth.users que chamam `public.activar_membro_por_email` ou `public.activar_membro_na_confirmacao`, responsáveis pela ativação antecipada. Preserva o trigger de criação do perfil e a auditoria.
- Preserva funções gestor/trainer/aluno, membros e históricos. Não transforma administradores antigos guardados como admin: devem ser inspecionados antes de normalização.
- Não promove contas a superadmin, não cria o primeiro superadmin e remove escrita direta em superadmins para contas do navegador. A conta operadora precisa de existir e estar ativa em public.superadmins.
- Não elimina dados: suspensão é um estado; políticas restritivas bloqueiam os dados da academia suspensa. Esta regra também se aplica a novas tabelas com ginasio_id existentes à data da migration; tabelas futuras precisam da mesma proteção.

## 2. Configurar envio e termos

No Supabase → Edge Functions → Secrets:

| Nome | Valor |
|---|---|
| APP_URL | https://claude.joaomutange.workers.dev |
| RESEND_API_KEY | Chave privada do Resend com permissão de envio |
| INVITE_FROM | FitCore <convites@DOMINIO-VERIFICADO> |
| TERMS_URL | URL HTTPS real dos seus termos publicados |
| TERMS_VERSION | Versão dos termos, por exemplo 2026-11-v1 |

APP_URL não deve ter barra final. SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são disponibilizadas pelo ambiente hospedado do Supabase; confirme que estão disponíveis. Nunca coloque a chave administrativa no frontend, no GitHub ou numa variável VITE_.

O remetente precisa de um domínio verificado no Resend. O domínio workers.dev da sua aplicação não é um domínio que possa verificar para enviar e-mails; utilize um domínio seu. Para testes de e-mail, respeite as limitações do domínio de testes do Resend.

Os novos convites são enviados pelo Resend com token de 256 bits, expirando em 24 horas. Este fluxo não depende dos templates SMTP do Supabase. A recuperação de password já existente continua com a configuração Auth do projeto.

## 3. Publicar as funções

Abra o PowerShell na pasta extraída que contém package.json e supabase. Com Node.js 22+:

```powershell
npx supabase login
npx supabase link --project-ref jxmoqmbavrdjfknpqaty
npx supabase functions deploy convidar-admin --use-api
npx supabase functions deploy ativar-gestor --use-api
```

Mantenha as definições destas funções em `supabase/config.toml`. Se já tiver outras funções/configurações, INTEGRE os dois blocos; não apague a configuração existente. `verify_jwt = false` é intencional: convidar-admin valida o Bearer JWT em auth.getUser e verifica a autorização no banco; ativar-gestor valida um token público de convite, de uso único. Nenhuma operação global fica autorizada apenas pelo frontend.

O endpoint convidar-admin é substituído pela versão corrigida. O cliente mantém o formato {ginasio_id,nome_admin,email}. Contas já existentes são rejeitadas para evitar redefinir a password ou associar pessoas a um ginásio sem procedimento específico. Cadastros novos interrompidos podem ser retomados pelo mesmo autor; não elimine manualmente contas para resolver convites.

## 4. Atualizar GitHub e Cloudflare

Atualize os ficheiros dentro da pasta `src`, não na raiz:

- App.jsx, SuperadminPanel.jsx, platform.js, FirstAccess.jsx, MfaSettings.jsx, superadmin.css.
- Preserve Dashboard.jsx, styles.css, main.jsx e supabase.js: estão incluídos para entregar uma cópia completa, mas os módulos existentes não foram substituídos por demonstrações.

Carregue a nova migration, as duas funções e o ficheiro compartilhado em supabase/functions/_shared/platform.ts. Não envie node_modules, dist, .env com segredos nem tests/generated.

Integre `wrangler.jsonc` com a configuração existente. Preserve nome do Worker, domínios, rotas e bindings. A propriedade assets.directory deve apontar para ./dist e assets.not_found_handling deve ser single-page-application, para que /primeiro-acesso e /gym-admin abram diretamente.

Nas variáveis de BUILD da Cloudflare:

```text
VITE_TERMS_URL=URL HTTPS real dos termos
VITE_TERMS_VERSION=a mesma versão de TERMS_VERSION
```

Comando de construção: `npm run build`. Comando de publicação para Workers: `npx wrangler deploy`. Diretório raiz: `/` quando package.json está na raiz. Publique novamente após alterar as variáveis. Se o ambiente de instalação utiliza npm, pode gerar package-lock.json com `npm install` e guardá-lo no repositório; não use um lockfile antigo incompatível.

## 5. Validar antes de abrir a utilizadores

1. Entre com o superadmin real. O e-mail por si só já não concede esse papel.
2. Confira os ginásios existentes e atualize plano/estado de forma explícita.
3. Use um e-mail novo para criar um ginásio e o primeiro gestor. Se o envio falhar, o ginásio é preservado e o painel informa que o convite não foi confirmado.
4. Abra o link recebido, defina password, aceite os termos e confirme a entrada no painel do ginásio.
5. Reenvie um convite ainda pendente: o anterior deve deixar de ativar o acesso. Convites já aceites não são usados para redefinir passwords.
6. Suspenda um ginásio de teste com motivo. Com uma sessão já aberta de um membro, novas consultas devem ser bloqueadas; a interface revalida o acesso em até 30 segundos ou ao voltar à aba. Dados já mostrados no ecrã não podem ser apagados retroativamente.
7. Reative o ginásio: histórico e registos devem continuar presentes.
8. Confirme que um gestor de ginásio não consegue chamar fitcore_plataforma nem os endpoints exclusivos de serviço.
9. Configure TOTP em Segurança. Confirme aal2. Só depois de inscrever os outros administradores ative a exigência global de dois fatores. Para recuperação administrativa, um operador autorizado do banco pode rever privado.fitcore_configuracao; não há bypass por e-mail.

## Limites conhecidos

- O plano comercial é um registo administrativo; não é integração com faturação bancária.
- A pesquisa e a paginação do painel são locais sobre a listagem global. Para dezenas de milhares de ginásios, evoluir para paginação/filtros no servidor e índices conforme as consultas reais.
- Unidades organizam o ginásio; não têm isolamento RLS independente nesta entrega.
- A regra existente dos treinadores não foi alterada para limitar apenas a alunos atribuídos.
- Históricos globais mostram as 100 operações mais recentes por ginásio; as anteriores permanecem no banco. Autor identificado por UUID para preservar rastreabilidade.
- Os testes não representam envio real, autenticação de produção nem uma execução Deno hospedada. Fazer o teste integrado acima é obrigatório para validar a instalação.
