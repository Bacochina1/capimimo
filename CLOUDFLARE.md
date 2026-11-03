# Publicação do Capimimo

O site usa Cloudflare Workers Static Assets, com arquivos prontos em `dist/`.
O `account_id` em `wrangler.jsonc` fixa a conta pessoal do Matheus Bacochina.

## Publicar uma atualização

```sh
npm ci
npm run check
npm run deploy:cloudflare
```

## Conectar o repositório depois

Suba o projeto ao repositório pessoal desejado. No painel do Cloudflare, abra o Worker `capimimo`, depois Settings > Builds e conecte o repositório. Use a raiz que contém `package.json` e `wrangler.jsonc`.

- Comando de build: `npm run check`
- Comando de deploy: `npm run deploy:cloudflare`
- Nome do Worker: `capimimo`
- Não é necessário compilar o HTML/JS estático.

Não envie `.env`, `.dev.vars`, tokens ou a pasta `.wrangler` ao repositório.

Esta publicação contém a UI e as funções locais já implementadas. Pagamentos e envio automático por e-mail continuam para a próxima integração.

## Endereço publicado

https://capimimo.matheus-bacochina.workers.dev

Versão: `cdea5dd1-d148-4c87-811e-595c9287a6a7`. Publicado na conta pessoal do Matheus Bacochina. Nenhum repositório foi vinculado nesta etapa.
