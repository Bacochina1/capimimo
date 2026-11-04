# Administração Capimimo

Acesse https://capimimo.com.br/admin. As credenciais iniciais estão somente no arquivo privado Capimimo-admin-acesso.txt na Área de Trabalho do proprietário; nunca coloque esse arquivo no repositório.

## Criar e testar

1. Entre no painel e escolha cartão, livro, convite ou Stories.
2. Preencha as seis etapas: destinatário, fotos, mensagem/áudio, extras, capa/cores e conferência.
3. Use a prévia para ver o que a pessoa recebe. As opções avançadas são opcionais.
4. Publique para obter o link e o QR Code. O presente administrativo é sinalizado como teste e não gera cobrança.
5. Volte por **Meus testes e conta** para guardar o rascunho e escolher outro presente.

Os rascunhos completos ficam neste navegador. A versão publicada pode ser recuperada pela conta em outro aparelho. Antes de limpar dados do navegador, publique ou baixe a cópia que deseja guardar.

Troque a senha na seção **Trocar minha senha**. Isso encerra os outros acessos da conta. Sair da conta revoga a sessão atual. A publicação existente continua acessível pelo link, para testar a experiência do destinatário.

## Implementação e verificações

O servidor valida sessão HttpOnly/Secure/SameSite e proprietário do teste. Uma chave de compra isolada não libera privilégios administrativos. As concessões internas têm valor zero e não chamam o provedor de pagamentos. Os planos normais permanecem com suas permissões originais.

Migração aditiva: `server/billing-migrations/0003_admin.sql`. Não há cadastro público de administradores nem senha embutida nos arquivos do site. Login, troca de senha e concessões têm limites de requisições.

Verificação: `npm run test:admin`, `npm test`, `npm run test:client`, `npm run check` e `npm run check:seo`.
