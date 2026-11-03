# Capimimo

Ateliê de presentes digitais personalizados: livros de memórias, cartões dobráveis, convites e stories, com fotos, mensagens, áudio e música.

[Ver o site](https://capimimo.matheus-bacochina.workers.dev/)

## Rodar localmente

Requisitos: Node.js e Python 3 disponíveis no terminal.

```sh
npm ci
npm run check
npm run dev
```

Abra http://127.0.0.1:4177/. Os arquivos prontos do aplicativo estão em `dist/`; não há etapa de compilação.

## Recursos

- Visualização de livros, cartões e convites em Three.js, com abertura e aproximação.
- Capas, cores, texturas, molduras e ilustrações para diferentes ocasiões.
- Livros com várias páginas e cartões simples com uma dedicatória.
- Fotos, gravação de voz, upload de áudio/música e criação de stories.
- Arquivos digitais para baixar e compartilhar, com recursos para visualização offline.
- Rascunhos e biblioteca armazenados localmente no navegador.

## Publicação

O site está publicado em Cloudflare Workers Static Assets. `wrangler.jsonc` aponta para o Worker `capimimo` na conta pessoal do Matheus Bacochina.

```sh
npm run check
npm run deploy:cloudflare
```

A publicação exige autenticação do Wrangler na conta indicada. Veja [CLOUDFLARE.md](CLOUDFLARE.md) para conectar o repositório ao Workers Builds.

## Estrutura

- `dist/`: aplicativo, estilos, Three.js, fontes, imagens e animações.
- `scripts/check.mjs`: verificação de sintaxe dos módulos do frontend.
- `server/`: módulos preparados para futuras integrações; não são executados pela hospedagem estática atual.

Pagamentos reais, persistência em servidor e envio automático de e-mail ainda dependem da configuração dos serviços correspondentes. O fluxo atual prioriza criação, prévia e entrega de arquivos digitais no navegador.

Credenciais, dependências instaladas, arquivos de trabalho e configurações locais ficam fora do Git.

## SEO

As páginas por ocasião são geradas por `npm run build:seo` e verificadas por `npm run check:seo`. Veja [SEO.md](SEO.md) para arquitetura, fontes, mudança de domínio e acompanhamento no Search Console.
