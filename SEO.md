# SEO do Capimimo

Implementação de 3 de novembro de 2026. Origem canônica atual: https://capimimo.matheus-bacochina.workers.dev.

## O que foi aplicado

- Homepage com título descritivo, description, canonical absoluto, Open Graph e Twitter Card.
- Oito páginas estáticas em `/ocasioes/`: casamento, aniversário, Natal, Dia dos Namorados, Dia das Mães, Dia dos Pais, Páscoa e amizade. Cada página explica decisões próprias daquela ocasião e leva à demonstração com tema e formato selecionados. O conteúdo principal funciona sem JavaScript.
- Links HTML entre a homepage e todas as páginas. As páginas não são versões de cidades ou trocas automáticas de palavras para capturar buscas.
- JSON-LD de Organization, WebSite e WebPage na homepage; WebPage e BreadcrumbList nas ocasiões. Não há avaliações, depoimentos, números de clientes ou preços inventados no schema. Não foi prometido rich result.
- `robots.txt` e sitemap XML com nove URLs públicas e canônicas. Sem `lastmod` artificial, parâmetros de compra ou presentes pessoais.
- Respostas HTTP 404 para URLs inexistentes, em lugar da homepage com status 200. Redirecionamento 301 para normalizar `/index.html` e barras finais nas ocasiões.
- `noindex` nos presentes, API e retornos de compra. Presentes não são listados em páginas públicas. Essa diretiva de busca não substitui os controles de acesso do produto.
- Imagens locais WebP, dimensões explícitas e carregamento tardio das imagens secundárias. O processamento de mídia do editor é uma implementação separada, validada nos testes de compressão.

## Orientações utilizadas

Skills instaladas e lidas:

- [Claude SEO: técnico, schema, sitemap e conteúdo](https://github.com/AgricIDaniel/claude-seo)
- [SuperSEO: improve-content](https://github.com/inhouseseo/superseo-skills)

Aplicação adaptada ao produto existente: sem executar instaladores de shell dos repositórios, sem subagentes automáticos, sem metas de densidade de palavras-chave e sem inventar prova social. As integrações pagas Ahrefs, DataForSEO e SE Ranking não foram conectadas. A instalação local de skills não instala automaticamente os plugins do Claude nem seus serviços de dados.

Comparação de intenção de busca: páginas públicas de [LovePanda](https://lovepanda.com.br/), [Bilhetin](https://www.bilhetin.com/) e [Ouvella](https://www.ouvella.com/pt-br). Oportunidade identificada: explicar com clareza os formatos e ajudar famílias e convidados, além do público de casais. Textos dos concorrentes não foram copiados. Não há dados verificados de volume de busca, dificuldade ou posição.

Referências primárias: [Google Search Essentials](https://developers.google.com/search/docs/essentials), [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing) e [dados estruturados](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data).

## Verificação e manutenção

```sh
npm run build:seo
npm run check:seo
npm run check
```

`check:seo` verifica todas as páginas, arquivos de imagem/CSS, canonical, JSON-LD, sitemap, normalização de URLs, 404 e exclusão dos presentes. A conferência visual foi feita em 390, 768 e 1440 px; o acesso do guia de Natal ao ateliê foi testado com o tema e o formato corretos.

Ao mudar para um domínio próprio, defina `SEO_ORIGIN=https://seu-dominio` antes de executar `build:seo`, atualize `SITE_ORIGIN` na configuração do servidor e redirecione a origem antiga para o novo domínio. Não mantenha duas origens concorrentes com canonical diferente do domínio escolhido.

## Ainda depende da conta e de tráfego real

1. Verificar a propriedade no Google Search Console e enviar `/sitemap.xml`. Nenhuma submissão ou verificação de propriedade foi feita nesta etapa.
2. Acompanhar indexação, consultas, impressões, cliques e conversões antes de escolher novas páginas. As sugestões de termos são hipóteses, não previsões de tráfego.
3. Medir Core Web Vitals de campo quando houver amostra de usuários. Os testes locais não equivalem a dados CrUX e nenhum score de campo foi alegado.
4. Completar dados reais de atendimento, termos comerciais e privacidade antes da abertura de vendas. Não inserir dados pessoais ou jurídicos fictícios para preencher schema.

Indexação e posição dependem do Google. A implementação remove obstáculos técnicos e melhora a utilidade das páginas; não garante ranking.
