# FitCore — login e ginásios ligados ao Supabase

Esta versão tem um painel inicial diferente da demonstração anterior. Implementa login por email e palavra-passe, saída da sessão, escolha entre ginásios autorizados, consulta dos membros e edição do nome/logótipo pelo gestor. O código da demonstração anterior foi preservado no ZIP original.

Os dados vêm apenas de public.ginasios e public.membros_ginasio. As permissões são aplicadas pelo Supabase. Mensalidades, presenças, treinos, inscrições, convites, recuperação de palavra-passe e criação de ginásios pelo site ainda não foram implementados. Não é o SaaS completo.

## Carregar no GitHub
Extraia fitcore-login-projeto.zip. Carregue o conteúdo na raiz do repositório Claude, preservando a pasta src. Substitua package.json, index.html, vite.config.js e os ficheiros src/App.jsx, src/main.jsx e src/styles.css; acrescente src/supabase.js.
Não carregue o ZIP como ficheiro nem arraste os ficheiros de src individualmente para a raiz.

## Cloudflare Worker existente
Comando de compilação: npm run build
Comando de implantação: npx wrangler deploy --assets ./dist
Diretório raiz: /
Use Node.js 22 ou superior. Mantenha workers.dev habilitado.
Se a integração já gerar a configuração de assets corretamente, o comando de implantação existente pode ser mantido.

## Supabase
Authentication > URL Configuration:
Site URL: https://claude.joaomutange.workers.dev
Não há recuperação de palavra-passe nem convites tratados nesta versão.
A conta criada por Authentication > Users deve ter palavra-passe definida e, se exigido pelo projeto, email confirmado.
A atribuição de funções continua a ser feita no painel/servidor administrativo.

A URL e a chave publishable fornecidas estão em src/supabase.js. São valores públicos; não há chaves secretas neste projeto.

## Validação realizada
Compilação de produção concluída. O serviço de autenticação respondeu com sucesso à chave pública. Consultas sem login às duas tabelas foram recusadas por falta de permissões.
Não foi feito login com a conta do gestor, nem testado o isolamento entre duas contas autenticadas: não temos palavras-passe nem uma segunda conta de teste.
Após publicar, entrar com a conta real, confirmar Elite Fitness e os membros, testar uma alteração do nome e confirmar a persistência ao atualizar. Depois testar duas contas de ginásios diferentes e uma conta sem vínculo.
