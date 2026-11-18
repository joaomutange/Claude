# Verificações locais

Instale as dependências desta pasta com `npm install`. Os scripts usam um banco PostgreSQL em memória (PGlite), HTTP simulado para Auth/Resend e Playwright para o navegador.

```text
npm run sql
npm run backend
npm run ui
```

Para a interface, faça primeiro `npm run build` na raiz do projeto. Se necessário, instale o navegador de testes com `npx playwright install chromium`, ou defina CHROME_PATH com o caminho do seu Chrome.

As fixtures da pasta fixtures são EXCLUSIVAS do banco em memória. Não as execute no Supabase real. São dois cenários: estrutura base das etapas 1/2 e estrutura com a etapa 3 de cadastro seguro.

A transpilação TypeScript permite executar os handlers no Node com uma simulação Deno. Não substitui typecheck ou execução hospedada no Deno/Supabase. MFA usa afirmações simuladas nos testes de banco; teste a inscrição TOTP real antes de exigir AAL2 em produção.
