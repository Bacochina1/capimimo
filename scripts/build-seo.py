"""Generate crawlable occasion guides; run with SEO_ORIGIN after a domain move."""
from pathlib import Path
from html import escape as e
from urllib.parse import urlparse
import json, os, re

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
ORIGIN = os.environ.get('SEO_ORIGIN', 'https://capimimo.com.br').rstrip('/')
parsed = urlparse(ORIGIN)
if parsed.scheme != 'https' or not parsed.hostname or parsed.path or parsed.query or parsed.fragment:
    raise SystemExit('SEO_ORIGIN must be a public HTTPS origin without a path')

# Copy is based on existing editor features, never on invented testimonials or search volumes.
GUIDES = [
 dict(slug='casamento', label='Casamento', occasion='casamento', format='convite', title='Convite digital de casamento personalizado', headline='O convite de vocês.', image='photo-life-wedding.webp', art='casamento',
 lead='Nomes, data, local e uma foto que tenha a cara do casal. Prepare um convite digital e confira como ele abre no celular antes de compartilhar.',
 heading='Convite ou presente para o casal?',
 paragraphs=['São dois caminhos diferentes. Para convidar, escolha o formato convite e organize as informações da cerimônia. Para presentear quem vai casar, um livro de lembranças permite contar a história do casal em capítulos, com fotos e uma dedicatória.', 'No convite, coloque primeiro os nomes do casal. Confira a data e escreva o local por extenso, incluindo a cidade. Uma fotografia com espaço ao redor dos rostos costuma funcionar melhor na capa do que uma foto de grupo muito fechada.'],
 steps=['Escolha uma capa que combine com a celebração. Ajuste a cor e os enfeites sem competir com as informações.', 'Preencha os nomes, a data e o local. Abra a prévia e amplie o texto para conferir a leitura.', 'Prepare a lista de convidados no painel. Revise o nome de cada pessoa antes de gerar seu convite.'],
 tip='Quem recebe precisa encontrar a data e o endereço sem procurar. Deixe a dedicatória curta e use uma mensagem complementar para explicar traje ou outros detalhes da celebração.',
 question='Um convite precisa ter várias páginas?', answer='Não. O convite é um formato próprio. Um cartão simples abre e fecha com uma dedicatória; o livro é a opção para quem quer reunir várias lembranças. Você escolhe o formato de acordo com o que precisa contar.'),
 dict(slug='aniversario', label='Aniversário', occasion='aniversario', format='cartao', title='Cartão de aniversário digital com fotos e mensagem', headline='Mais um ano de histórias.', image='photo-life-birthday.webp', art='aniversario',
 lead='Junte uma foto de vocês, um apelido e aquela mensagem que só você poderia escrever. Um cartão de aniversário digital pode ser pequeno e ainda dizer muito.',
 heading='Uma lembrança para este aniversário',
 paragraphs=['Comece por um momento que a pessoa reconheça: uma viagem, um almoço em família ou uma foto antiga que sempre rende conversa. Essa lembrança ajuda a escolher a capa e dá um ponto de partida para a mensagem.', 'Para uma homenagem curta, o cartão simples resolve. Se a ideia é relembrar vários anos, escolha o livro e organize as fotos por fase da vida. Nos Stories, as imagens aparecem em sequência e podem acompanhar sua voz ou uma música enviada por você.'],
 steps=['Escolha entre cartão, livro e Stories. Use o cartão para uma dedicatória ou o livro para uma retrospectiva.', 'Escreva o nome ou apelido e acrescente uma lembrança concreta na mensagem.', 'Confira o corte das fotos e a sequência. Teste o som antes de guardar a versão final.'],
 tip='Em vez de repetir uma frase pronta, conte algo que você admira na pessoa e cite uma situação. Uma mensagem sobre o dia em que ela esteve ao seu lado costuma ter mais significado do que uma lista de votos.',
 question='Posso criar um convite de aniversário também?', answer='Sim. Escolha o formato convite no ateliê, mantenha o tema aniversário e preencha a data e o local. Confira as informações do evento separadamente da mensagem de homenagem.'),
 dict(slug='natal', label='Natal', occasion='natal', format='cartao', title='Cartão de Natal digital personalizado com fotos', headline='Um Natal com a sua voz.', image='photo-life-natal.webp', art='natal',
 lead='Uma foto da família, um recado gravado ou as lembranças do ano. Crie um cartão de Natal digital com cores e detalhes natalinos escolhidos por você.',
 heading='Uma mensagem de Natal que parece sua',
 paragraphs=['Pense em quem vai receber. Para os avós, uma foto com os netos e um áudio curto podem dizer mais do que uma montagem cheia de enfeites. Para amigos que moram longe, escolha uma lembrança compartilhada e escreva o que você gostaria de viver junto no próximo ano.', 'O tema Natal oferece uma base para a capa. Você pode ajustar a cor, experimentar texturas e usar os enfeites como um detalhe. O centro do cartão continua sendo a foto e a mensagem, com espaço suficiente para ler no celular.'],
 steps=['Escolha o tema Natal e uma capa que deixe a fotografia respirar.', 'Adicione a mensagem e, se quiser, envie ou grave um áudio. Ouça o resultado na prévia.', 'Abra o cartão como destinatário. Confira o tamanho da letra e guarde a versão revisada.'],
 tip='Se for enviar para várias pessoas, revise o nome de quem recebe em cada versão. Evite deixar um apelido particular em uma mensagem destinada à família inteira.',
 question='Posso fazer uma retrospectiva do ano?', answer='Sim. Escolha o livro para distribuir as lembranças por páginas ou os Stories para uma sequência de fotos com legendas. O cartão simples é mais indicado para uma mensagem única de Natal.'),
 dict(slug='dia-dos-namorados', label='Dia dos Namorados', occasion='namorados', format='livro', title='Presente digital para namorados com fotos e música', headline='A história é de vocês.', image='photo-young-couple-park.webp', art='amor',
 lead='O primeiro encontro, uma viagem e os pequenos dias comuns. Transforme as fotos do casal em um presente digital com uma carta e a música de vocês.',
 heading='Do álbum do celular para um presente',
 paragraphs=['Selecione fotos que contem momentos diferentes. Uma imagem do começo da relação, uma de uma conquista e outra do cotidiano já ajudam a mostrar o caminho de vocês. Não é preciso usar apenas as fotos mais produzidas.', 'No livro, cada capítulo pode ter uma fotografia e um texto próprio. O cartão mantém uma declaração em destaque. Os Stories funcionam como uma sequência visual, com nome, apelido, legendas e som personalizados no editor.'],
 steps=['Escolha o formato e organize as fotos na ordem em que quer contar a história.', 'Escreva uma dedicatória com detalhes da relação. Ajuste a capa e experimente uma textura.', 'Confira a abertura, amplie as páginas e ouça o áudio escolhido antes de concluir.'],
 tip='Não coloque toda a carta na capa. Use uma frase curta para apresentar o presente e deixe a mensagem maior para dentro. Assim, a surpresa tem um começo e a leitura fica confortável.',
 question='Serve para aniversário de namoro?', answer='Sim. O ateliê também tem a ocasião aniversário de namoro. Você pode usar as mesmas fotos para montar uma retrospectiva, trocar a capa e escrever uma mensagem para a data de vocês.'),
 dict(slug='dia-das-maes', label='Dia das Mães', occasion='maes', format='livro', title='Presente digital para o Dia das Mães com fotos e áudio', headline='Ela faz parte de tudo.', image='photo-life-mother.webp', art='familia',
 lead='Reúna as fotos que contam o cuidado dela: os almoços, os passeios, os abraços. Acrescente uma mensagem sua para um presente de Dia das Mães feito em família.',
 heading='Lembranças de quem cuida',
 paragraphs=['Uma homenagem pode mostrar fases diferentes da família. Separe uma fotografia antiga, uma recente e um momento que represente o jeito dela. Em cada página, explique por que aquela lembrança importa para você.', 'Se a família quiser participar, combinem primeiro quais fotos vão entrar e quem vai escrever a mensagem. Uma pessoa pode organizar o material no editor, conferir os nomes e escolher o áudio que acompanha a homenagem. Não há edição simultânea entre aparelhos.'],
 steps=['Escolha livro para uma homenagem com capítulos ou cartão para uma mensagem única.', 'Organize as fotos e escreva legendas fáceis de ler. Use os nomes que ela reconhece.', 'Revise a prévia no celular e teste o botão de ampliar. Deixe o áudio como um complemento da mensagem escrita.'],
 tip='Para quem prefere ler com calma, use letras maiores e poucos enfeites perto do texto. O carinho não depende de uma animação: a pessoa também precisa conseguir chegar à mensagem com facilidade.',
 question='Posso incluir uma mensagem de voz?', answer='Sim. O editor permite gravar ou enviar áudio. Se você também adicionar música, escolha qual som vai acompanhar o presente e confira o volume na prévia. O navegador pode pedir um toque para começar a reprodução.'),
 dict(slug='dia-dos-pais', label='Dia dos Pais', occasion='pais', format='livro', title='Presente digital para o Dia dos Pais personalizado', headline='As histórias com ele.', image='photo-life-father.webp', art='familia',
 lead='Aquela viagem de carro, a receita que ele ensinou ou a foto antiga da família. Faça um presente de Dia dos Pais com lembranças que tenham a cara de vocês.',
 heading='Uma homenagem sem frase pronta',
 paragraphs=['Comece por uma cena: algo que vocês fizeram juntos ou um conselho que ficou. Use a foto desse momento, se tiver, ou uma imagem que represente a relação. A dedicatória pode contar por que você ainda se lembra daquilo.', 'O livro ajuda a reunir fases diferentes e permite personalizar as páginas. Para uma homenagem direta, escolha um cartão simples. As cores e os detalhes da capa são editáveis; você não precisa seguir uma combinação fixa de azul ou marrom.'],
 steps=['Separe as fotos que vão entrar e escolha qual delas apresenta melhor a homenagem.', 'Ajuste a capa, a cor e o texto. Nos capítulos do livro, conte uma lembrança por página.', 'Abra a prévia e confira fotos na vertical e na horizontal. Ajuste o enquadramento quando necessário.'],
 tip='Se os filhos estiverem preparando juntos, juntem as mensagens antes de editar. Identifique quem escreveu cada trecho para a homenagem continuar pessoal e não virar uma mensagem genérica da família.',
 question='Posso usar fotos antigas digitalizadas?', answer='Sim, desde que estejam em JPEG, PNG ou WebP. Confira se os rostos continuam nítidos ao ampliar. Uma foto pequena não ganha detalhes por ser colocada numa página maior; nesses casos, use uma composição com mais espaço ao redor.'),
 dict(slug='pascoa', label='Páscoa', occasion='pascoa', format='cartao', title='Cartão de Páscoa digital com foto e mensagem', headline='Um carinho de Páscoa.', image='photo-life-easter.webp', art='pascoa',
 lead='Uma mensagem de Páscoa pode acompanhar um almoço em família, uma lembrança de infância ou um abraço à distância. Escolha as fotos e prepare o seu cartão digital.',
 heading='O tema combina com a sua mensagem',
 paragraphs=['Para as crianças, uma fotografia da família e um recado curto mantêm o cartão fácil de entender. Para uma mensagem de fé ou agradecimento, escolha uma capa discreta e deixe o texto em destaque. A mesma ocasião pode ter jeitos diferentes de celebrar.', 'No ateliê, o tema Páscoa tem seus próprios detalhes de capa. Experimente texturas e cores, escolha os enfeites e veja se a decoração ajuda a compor a lembrança. Você também pode criar sem personagens, mantendo apenas a fotografia e a mensagem.'],
 steps=['Selecione Páscoa e o formato cartão. Experimente as capas antes de inserir o texto final.', 'Escolha uma foto e escreva o nome de quem recebe. Acrescente um recado de Páscoa do seu jeito.', 'Revise contraste e tamanho da letra na prévia. Confira a abertura antes de guardar o cartão.'],
 tip='Se a mensagem for para uma família, use os nomes ou um tratamento que inclua todos. Um recado pensado para o grupo evita que o cartão pareça uma mensagem encaminhada sem cuidado.',
 question='Preciso usar desenhos de coelhos?', answer='Não. Os desenhos são opcionais. Você pode escolher uma composição centrada na fotografia, alterar as cores da capa ou manter os detalhes de Páscoa apenas nos pequenos enfeites.'),
 dict(slug='amizade', label='Amizade', occasion='amizade', format='stories', title='Presente digital para amigos com fotos e mensagem', headline='Só porque é você.', image='photo-life-friends.webp', art='familia',
 lead='Uma amizade não precisa esperar o aniversário. Escolha as fotos de vocês e prepare uma lembrança digital com apelidos, mensagens e os momentos que sempre viram assunto.',
 heading='Uma história que só vocês entendem',
 paragraphs=['Pode ser a viagem que deu errado e virou piada, o primeiro dia de aula ou os encontros de fim de semana. Escolha fotos que tragam essas histórias de volta. Uma legenda curta ajuda a pessoa a reconhecer o momento sem precisar de uma explicação longa.', 'Nos Stories, você organiza a sequência, ajusta textos e escolhe como as fotos aparecem. Se preferir uma lembrança para folhear, use o livro. Para um agradecimento ou uma mensagem de saudade, um cartão com uma única dedicatória também funciona.'],
 steps=['Escolha uma foto de abertura e organize as outras como uma pequena história.', 'Use o apelido da pessoa, revise as legendas e ajuste a cor dos elementos.', 'Veja a sequência inteira. Confira se cada texto tem tempo e espaço para ser lido.'],
 tip='Nem toda piada interna precisa virar legenda. Antes de compartilhar, pense se a pessoa ficaria à vontade com aquela foto ou mensagem sendo vista por alguém ao lado dela.',
 question='Dá para personalizar sem capivaras?', answer='Sim. As capivaras e os adesivos são decoração opcional. Você pode criar um presente focado nas fotos, escolher outros detalhes visuais e deixar o texto como protagonista.'),
]

def ld(data):
    return '<script type="application/ld+json">'+json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')+'</script>'

def metadata(title, description, path, image):
    url = ORIGIN + path
    return f'''<title>{e(title)} | Capimimo</title>
<meta name="description" content="{e(description,quote=True)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="website"><meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Capimimo"><meta property="og:title" content="{e(title,quote=True)} | Capimimo">
<meta property="og:description" content="{e(description,quote=True)}"><meta property="og:url" content="{url}">
<meta property="og:image" content="{ORIGIN}/assets/{image}"><meta property="og:image:alt" content="Exemplo ilustrativo do Capimimo">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{e(title,quote=True)} | Capimimo"><meta name="twitter:description" content="{e(description,quote=True)}"><meta name="twitter:image" content="{ORIGIN}/assets/{image}">'''

links=''.join(f'<a href="/ocasioes/{g["slug"]}/">{e(g["label"])}</a>' for g in GUIDES)
nav=f'<nav class="seo-occasion-links" aria-label="Ideias por ocasião">{links}</nav>'
paths=['/']
for g in GUIDES:
    path=f'/ocasioes/{g["slug"]}/';paths.append(path)
    url=ORIGIN+path
    data={'@context':'https://schema.org','@graph':[
        {'@type':'WebPage','@id':url+'#page','url':url,'name':g['title'],'description':g['lead'],'inLanguage':'pt-BR','isPartOf':{'@id':ORIGIN+'/#website'},'breadcrumb':{'@id':url+'#breadcrumb'}},
        {'@type':'BreadcrumbList','@id':url+'#breadcrumb','itemListElement':[{'@type':'ListItem','position':1,'name':'Capimimo','item':ORIGIN+'/'},{'@type':'ListItem','position':2,'name':g['label'],'item':url}]}
    ]}
    target=f'/?ocasiao={g["occasion"]}&formato={g["format"]}#atelier'
    content=f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
{metadata(g['title'],g['lead'],path,g['image'])}
<meta name="theme-color" content="#fff9f1"><link rel="icon" href="/assets/favicon.webp"><link rel="stylesheet" href="/fonts.css"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/seo.css">{ld(data)}</head><body>
<a class="skip" href="#conteudo">Pular para o conteúdo</a>
<header class="header"><div class="nav-wrap"><a href="/" class="brand" aria-label="Capimimo, início">capimimo.</a><nav aria-label="Principal"><a href="/#ocasioes">Ocasiões</a><a href="/#como-funciona">Como funciona</a></nav><a class="button primary" href="{e(target,quote=True)}">Experimentar</a></div></header>
<main id="conteudo" class="seo-guide section-width"><nav class="seo-breadcrumb" aria-label="Você está aqui"><a href="/">Capimimo</a><span aria-hidden="true"> / </span><span>{e(g['label'])}</span></nav>
<section class="seo-guide-hero"><div><p class="seo-kicker">{e(g['title'])}</p><h1>{e(g['headline'])}</h1><p class="seo-lead">{e(g['lead'])}</p><a class="button primary" href="{e(target,quote=True)}">Ver modelos de {e(g['label'])} ↗</a><p class="seo-caption">Experimente a demonstração antes de escolher.</p></div><figure><img src="/assets/{g['image']}" width="600" height="400" fetchpriority="high" alt="{e(g['label'])}: fotografia ilustrativa com pessoas fictícias"><figcaption>Fotografia ilustrativa · pessoas fictícias</figcaption></figure></section>
<section class="seo-guide-body"><div><h2>{e(g['heading'])}</h2>{''.join('<p>'+e(p)+'</p>' for p in g['paragraphs'])}<h2>Prepare o seu mimo</h2><ol>{''.join('<li>'+e(s)+'</li>' for s in g['steps'])}</ol><h2>Um detalhe que faz diferença</h2><p>{e(g['tip'])}</p><h2>{e(g['question'])}</h2><p>{e(g['answer'])}</p><h2>Como funciona a entrega digital?</h2><p>No Capimimo, você personaliza o presente com suas fotos e palavras e pode acrescentar um áudio ou música. Depois da compra e da publicação, a pessoa recebe um link para abrir no navegador; você também pode baixar uma cópia. É um presente digital, sem entrega física.</p><p>O pagamento é único. O link fica disponível por 12 meses desde a aprovação da compra, e o presente publicado pode ter até 40 MB. Confira os formatos, os valores e os detalhes de cada opção nos <a href="/#planos">planos do Capimimo</a>.</p></div><aside><img src="/assets/cover-art-{g['art']}.webp" width="600" height="600" loading="lazy" alt="Arte decorativa da coleção {e(g['label'])}"><p>Escolha a cor, a capa e os detalhes. Suas fotos continuam sendo o centro da história.</p><a href="{e(target,quote=True)}">Abrir a prévia no ateliê ↗</a></aside></section>
<section class="seo-guide-end"><h2>Agora, com as suas fotos.</h2><p>Veja como o formato funciona e escolha o que combina com a sua mensagem.</p><a class="button primary" href="{e(target,quote=True)}">Experimentar o ateliê ↗</a></section>
</main><footer class="footer section-width"><a class="brand" href="/">capimimo.</a><p>Outras ocasiões para lembrar de alguém.</p>{nav}<small>Presentes digitais · sem entrega física.</small></footer></body></html>'''
    dest=DIST/path.lstrip('/')/'index.html';dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(content,encoding='utf8')

index=DIST/'index.html';html=index.read_text(encoding='utf8')
html=re.sub(r'<!-- seo:start -->.*?<!-- seo:end -->\s*','',html,flags=re.S)
html=re.sub(r'<title>.*?</title>\s*','',html,count=1,flags=re.S)
html=re.sub(r'<meta name="description"[^>]*>\s*','',html,count=1)
graph={'@context':'https://schema.org','@graph':[
 {'@type':'Organization','@id':ORIGIN+'/#organization','name':'Capimimo','url':ORIGIN+'/'},
 {'@type':'WebSite','@id':ORIGIN+'/#website','name':'Capimimo','url':ORIGIN+'/','inLanguage':'pt-BR','publisher':{'@id':ORIGIN+'/#organization'}},
 {'@type':'WebPage','@id':ORIGIN+'/#page','url':ORIGIN+'/','name':'Presentes digitais personalizados com fotos, voz e música','inLanguage':'pt-BR','isPartOf':{'@id':ORIGIN+'/#website'},'about':{'@id':ORIGIN+'/#organization'}}]}
block=metadata('Presentes digitais personalizados com fotos e música','Crie um presente digital com suas fotos, mensagens e áudio. Experimente livros, cartões, convites e Stories personalizados para cada ocasião.','/','hero-motion-poster.webp')+ld(graph)+'<link rel="stylesheet" href="seo.css">'
html=html.replace('</head>','<!-- seo:start -->'+block+'<!-- seo:end -->\n</head>')
html=re.sub(r'<!-- seo-links:start -->.*?<!-- seo-links:end -->','',html,flags=re.S)
html=html.replace('</footer>','<!-- seo-links:start -->'+nav+'<!-- seo-links:end --></footer>',1)
index.write_text(html,encoding='utf8')
(DIST/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join(f'  <url><loc>{ORIGIN}{p}</loc></url>\n' for p in paths)+'</urlset>\n',encoding='utf8')
(DIST/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: '+ORIGIN+'/sitemap.xml\n',encoding='utf8')
(ROOT/'server/seo-routes.mjs').write_text('// Generated by scripts/build-seo.py\nexport const publicPages = new Set('+json.dumps(paths)+');\n',encoding='utf8')
print(f'Built {len(paths)} canonical public pages. No personal gifts included.')
