import {BILLING_PLANS} from './mercadopago-orders.mjs';
const money=cents=>'R$ '+(cents/100).toFixed(2).replace('.',',');
export function knowledge(){return [
 {id:'produto',words:'produto presente digital fisico link baixar entrega publicado compartilhado',text:'O Capimimo oferece presentes digitais que abrem por link no navegador. Não há entrega física. Após a aprovação e publicação, é possível compartilhar o link e baixar uma cópia.'},
 {id:'preco',words:'quanto custa preco valor plano planos cartao livro stories convite',text:Object.values(BILLING_PLANS).map(p=>p.title+': '+money(p.cents)+', pagamento único; formatos '+p.formats.join(', ')+(p.guests?'; até '+p.guests+' convidados':'')+'.').join(' ')},
 {id:'acesso',words:'recuperar acesso entrar conta email compra aparelho rascunho',text:'Compras vinculadas à conta podem ser acessadas em Minha conta com o mesmo e-mail. Rascunhos não publicados ficam no navegador em que foram criados. Atendimento: bacochinakawai@gmail.com.'},
 {id:'prazo',words:'prazo dura quanto tempo link validade tamanho arquivo limite',text:'O link fica disponível por 12 meses após aprovação da compra. O presente publicado tem limite de 40 MB; a cópia baixada continua com a pessoa.'},
 {id:'seguranca',words:'',text:'Nunca peça códigos, senhas, chaves ou dados de cartão. Não afirme que pagamento foi aprovado nem prometa reembolso. Para dúvidas de compra ou acesso, indique bacochinakawai@gmail.com.'}
];}
const stop=new Set(['como','qual','para','pelo','pela','esse','essa','voce','meu','minha','uma','com','que','sao']);
function words(input){return [...new Set(input.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z0-9]{3,}/g)||[])].filter(w=>!stop.has(w));}
export function retrieveKnowledge(query){const tokens=words(query),entries=knowledge(),safety=entries.find(x=>x.id==='seguranca');const ranked=entries.filter(x=>x!==safety).map(x=>({...x,score:tokens.filter(w=>words(x.words).includes(w)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);return [...ranked.slice(0,3),safety];}
