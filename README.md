# FitCore — painel global melhorado

Projeto React/Vite ligado ao Supabase e publicado em Cloudflare Workers. Esta entrega foi preparada a partir de joaomutange/Claude, ramo main, e preserva Dashboard.jsx e os módulos existentes.

Comece por **INSTALACAO-SUPERADMIN.md**. **ANALISE-SUPERADMIN.md** explica a estrutura e o impacto da migration. A nova migration deve ser aplicada uma vez; depois publique as duas Edge Functions e só então o frontend.

Inclui:
- Indicadores separados de operação, configuração e subscrição.
- Pesquisa, filtros, paginação e apresentação adaptada a telemóvel.
- Cadastro guiado de ginásio e primeiro gestor, com revisão antes de guardar.
- Detalhes, unidades, gestores, convites, subscrição e histórico por ginásio.
- Suspensão com motivo e preservação dos dados.
- Convites de gestor com token de 256 bits, hash no banco, expiração, reenvio e primeiro acesso.
- Autorização global no banco, sem promoção por endereço de e-mail fixo.
- Configuração e verificação TOTP; exigência opcional de AAL2 nas operações globais.

## Desenvolvimento local

```text
npm install
npm run dev
npm run build
```

Use Node.js 22+. Copie .env.example para .env.local e configure os termos reais, ou defina essas variáveis no ambiente. Nenhuma chave administrativa pode usar prefixo VITE_.

## Validação

A pasta tests contém verificações locais de SQL, backend e interface com dados fictícios. Leia tests/README.md. Os testes não enviam mensagens, não alteram o Supabase remoto e não substituem um teste integrado de produção.

Os dados das imagens são simulados. A subscrição da plataforma é um registo administrativo; esta entrega não implementa cobranças automáticas nem isolamento independente por unidade.
