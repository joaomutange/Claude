# FitCore — demonstração de gestão de ginásios

## O que foi preparado
O código original foi colocado em src/App.jsx e acompanhado dos ficheiros necessários para executar e compilar uma aplicação React com Vite. A compilação foi verificada com sucesso.

## Publicar através do GitHub
1. Extraia fitcore-projeto.zip.
2. No repositório Claude, escolha Adicionar arquivo > Carregar arquivos.
3. Carregue o conteúdo extraído na raiz: package.json, index.html, vite.config.js, README.md e a pasta src. Não carregue o ZIP como ficheiro nem coloque tudo dentro de outra pasta.
4. Guarde as alterações com Commit changes. O ficheiro antigo Projecto Ginásio já não é utilizado e pode ser eliminado.
5. No painel Cloudflare, abra Workers & Pages > Create application > Pages > Import from an existing Git repository.
6. Ligue o GitHub e selecione o repositório Claude.
7. Selecione a branch que contém os ficheiros (normalmente main; o navegador traduzido pode mostrar principal).
8. Comando de compilação: npm run build
9. Diretório de saída: dist
10. Diretório raiz: deixe vazio. Use Node.js 22 ou superior.
11. Escolha Save and Deploy. O endereço público será apresentado no painel.

Documentação: https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/

## Publicar sem configurar uma compilação
O ZIP fitcore-site.zip contém a aplicação compilada. Pode usá-lo num novo projeto Cloudflare Pages com Direct Upload, ou extraí-lo e carregar o conteúdo da pasta. A raiz publicada deve conter index.html e assets/.
Os projetos Direct Upload não podem ser convertidos posteriormente para integração Git; para atualizações automáticas pelo GitHub, use a opção anterior desde o início.

## Executar localmente
Instale Node.js 22 ou superior. Na pasta do projeto:
npm install
npm run dev

## Limitações da aplicação atual
Esta é uma demonstração, não um SaaS pronto para clientes reais.
- As contas e palavras-passe de demonstração estão no código enviado ao navegador.
- Não existe servidor de autenticação nem controlo seguro de permissões.
- Os dados ficam apenas na memória; alterações e novos registos desaparecem ao atualizar a página.
- Não existe base de dados partilhada, isolamento seguro entre ginásios nem processamento real de pagamentos.
Não introduza dados reais de clientes nesta versão. Para produção, implemente autenticação no servidor, base de dados, permissões por ginásio e integração real de pagamentos, se necessária.

## Contas de demonstração
Gestor: admin@fitcore.ao / admin123
Trainer: trainer@fitcore.ao / trainer123
Aluno: ana@fitcore.ao / ana123
