# Publicação do Capimimo

O Worker `capimimo` está na conta pessoal do Matheus Bacochina, fixada por `account_id` em wrangler.jsonc. Não usa a organização MedCof.

## Domínio

- Principal: https://capimimo.com.br/
- https://www.capimimo.com.br/ redireciona com 308 para o principal, preservando caminho e parâmetros.
- Zona Cloudflare ativa; DNS delegado para felipe.ns.cloudflare.com e haley.ns.cloudflare.com.
- Ambos os nomes vinculados como Custom Domains no Worker; HTTPS verificado. Resolvedores com cache DNS anterior podem demorar a atualizar.
- Canonical, sitemap e robots usam o domínio principal.

O endereço https://capimimo.matheus-bacochina.workers.dev permanece ativo, incluindo webhooks já configurados. Não há redirecionamento automático dessa origem: rascunhos e chaves de compra ficam no armazenamento do navegador de cada origem. Para voltar a uma compra publicada no novo domínio, importe o arquivo de acesso da compra. As origens são autorizadas explicitamente no Worker; um Origin arbitrário não escolhe o endereço de retorno do pagamento.

## Publicar

```sh
npm ci
npm run check
npm test
npm run test:client
node tests/domain-routing.mjs
npm run build:seo
npm run check:seo
npm run deploy:cloudflare
```

Arquivos prontos em dist/. O repositório pessoal é https://github.com/Bacochina1/capimimo. O deploy atual é feito pelo Wrangler; conectar Workers Builds é uma etapa separada.

Pagamentos permanecem em homologação (`PAYMENT_MODE=test`, `SALES_ENABLED=false`). Nome público do responsável e e-mail de suporte ainda são necessários para concluir atendimento e documentos da loja. Segredos ficam nos Worker Secrets; não envie tokens, .env, .dev.vars ou .wrangler ao Git.
