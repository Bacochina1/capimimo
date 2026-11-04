import test from 'node:test';import assert from 'node:assert/strict';import {retrieveKnowledge} from '../server/ai-knowledge.mjs';import {BILLING_PLANS} from '../server/mercadopago-orders.mjs';
test('recupera valores atuais e inclui regras de segurança',()=>{const entries=retrieveKnowledge('Quanto custa cartão e como entregar?');assert.ok(entries.some(x=>x.id==='preco'&&x.text.includes((BILLING_PLANS.mimo.cents/100).toFixed(2).replace('.',','))));assert.ok(entries.some(x=>x.id==='seguranca'));});
test('recupera acesso e não inventa tópicos sem relação',()=>{assert.ok(retrieveKnowledge('Como recuperar acesso em outro aparelho?').some(x=>x.id==='acesso'));assert.deepEqual(retrieveKnowledge('xilofonexyz').map(x=>x.id),['seguranca']);});

test('consulta perguntas de clientes por assunto sem confundir preço com prazo',()=>{
 const cases=[['Quanto custa um livro?','preco'],['O presente é físico ou digital?','produto'],['Por quanto tempo o link fica disponível?','prazo'],['Troquei de celular, como recupero minha conta?','acesso'],['Quem pode ver as fotos?','privacidade'],['Como excluir o presente publicado?','privacidade'],['Quantos convidados podem confirmar presença no casamento?','convites'],['Quero pedir estorno da compra','reembolso']];
 for(const [question,id] of cases)assert.ok(retrieveKnowledge(question).some(entry=>entry.id===id),question);
 assert.equal(retrieveKnowledge('Quanto custa?')[0].id,'preco');assert.equal(retrieveKnowledge('Quanto tempo dura?')[0].id,'prazo');
});
test('consulta é normalizada, limitada e desconhecidos não geram fatos',()=>{
 assert.ok(retrieveKnowledge('QUAL O PREÇO?').some(entry=>entry.id==='preco'));
 for(const query of ['',null,'xilofonexyz','x'.repeat(5000)])assert.deepEqual(retrieveKnowledge(query).map(entry=>entry.id),['seguranca']);
 for(const entry of retrieveKnowledge('Qual o valor e como recupero o acesso?'))assert.ok(entry.text.length>0);
});
test('informação sensível e suporte não contradizem os fluxos declarados',()=>{
 const entries=retrieveKnowledge('Como apagar minhas fotos privadas e pedir reembolso?');
 assert.ok(entries.some(entry=>entry.id==='privacidade'&&/Quem tiver o link/.test(entry.text)));
 assert.ok(entries.some(entry=>entry.id==='reembolso'&&entry.text.includes('bacochinakawai@gmail.com')));
 assert.ok(entries.some(entry=>entry.id==='seguranca'&&/Nunca peça códigos/.test(entry.text)));
});

test('convites explicam envio individual apenas após publicação',()=>{const item=retrieveKnowledge('Como enviar convites para convidados?').find(x=>x.id==='convites');assert.match(item.text,/Após publicar/);assert.match(item.text,/envio individual por e-mail/);assert.match(item.text,/confirmando o endereço/);});

test('dúvidas sobre fotos e áudio recuperam passos concretos de criação',()=>{for(const q of ['Como coloco minhas fotos?','Posso colocar uma canção?']){const entry=retrieveKnowledge(q).find(x=>x.id==='criacao');assert.ok(entry,q);assert.match(entry.text,/Escolher fotos/);assert.match(entry.text,/áudio/);}});
