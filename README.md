# Capimimo

Ateliê de presentes digitais personalizados: livros de memórias, cartões dobráveis, convites e stories, com fotos, mensagens, áudio e música.

[Ver o site](https://capimimo.com.br/)

## Rodar localmente

Requisitos: Node.js 22.13 ou superior e Python 3 disponíveis no terminal.

```sh
npm ci
npm run check
npm test
npm run test:client
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

O site está publicado em https://capimimo.com.br/ com Cloudflare Workers Static Assets. O www redireciona ao domínio principal. O endereço workers.dev permanece ativo para os acessos existentes e webhooks. `wrangler.jsonc` aponta para o Worker `capimimo` na conta pessoal do Matheus Bacochina.

```sh
npm run check
npm run deploy:cloudflare
```

A publicação exige autenticação do Wrangler na conta indicada. Veja [CLOUDFLARE.md](CLOUDFLARE.md) para conectar o repositório ao Workers Builds.

## Estrutura

- `dist/`: aplicativo, estilos, Three.js, fontes, imagens e animações.
- `scripts/check.mjs`: verificação de sintaxe dos módulos do frontend.
- `server/`: Worker de pedidos, confirmação no Mercado Pago, publicação R2 e RSVP persistente em D1.

O Mercado Pago está em homologação, com cobrança real bloqueada por configuração. A compra fictícia foi aprovada e a entrega publicada no R2 foi aberta em outro navegador com fotos, áudio e Three.js. A conferência agendada de pedidos a cada 10 minutos recupera notificações atrasadas e reembolsos. Envio automático de e-mail não foi contratado nem configurado. Veja INTEGRACAO-MERCADOPAGO.txt para os bloqueios de lançamento.

Credenciais, dependências instaladas, arquivos de trabalho e configurações locais ficam fora do Git.

## SEO

As páginas por ocasião são geradas por `npm run build:seo` e verificadas por `npm run check:seo`. Veja [SEO.md](SEO.md) para arquitetura, fontes, mudança de domínio e acompanhamento no Search Console.

## Revisão dos fluxos

Cinco auditorias cobriram compra, edição, recebimento, convites e acessibilidade em telas de 320 a 1440 px. Foram corrigidos reuso de compra, processamento de mídia antes de salvar/exportar, preservação de dedicatória, respostas no visualizador isolado, recuperação de links individuais e mensagens de sucesso.

`npm test` verifica a API e a autorização. `npm run test:client` cobre seleção de compra compatível, upgrade, publicação e falhas de conexão sem liberação indevida. A aplicação continua em homologação: veja LANCAMENTO.txt antes de habilitar vendas reais.
