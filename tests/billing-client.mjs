import assert from 'node:assert/strict';
import test from 'node:test';
import {initBillingClient} from '../dist/billing-client.js';
import {BILLING_PLANS} from '../server/mercadopago-orders.mjs';

const storeKey='capimimo-purchases-v1';
const historia={id:'history-old',draftId:'fixture-draft',planId:'historia',mode:'test',status:'approved',createdAt:1,accessKey:'fixture-history-only'};
const mimo={...historia,id:'mimo-new',planId:'mimo',createdAt:2,accessKey:'fixture-mimo-only'};

// All network calls stay inside this fixture. Restore browser globals per case.
async function fixture(t,records,state,{hostname="capimimo.test",configResponse}={}){
 const globals=new Map(['fetch','localStorage','document','location'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 t.after(()=>{for(const [key,descriptor] of globals)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
 Object.defineProperty(globalThis,'location',{configurable:true,value:{hostname}});
 const storage=new Map([[storeKey,JSON.stringify(records)]]),calls=[],events=[];
 const orders=new Map(records.filter(record=>record&&record.id).map(record=>[record.id,structuredClone(record)]));
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value))}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{dispatchEvent:event=>{events.push(event);return true;}}});
 globalThis.fetch=async(path,options={})=>{
  const method=options.method||'GET';calls.push({path,method,...options});
  if(path==='/api/billing/config'&&configResponse)return configResponse();
  if(path==='/api/billing/config')return Response.json({mode:'test',checkoutReady:true,plans:BILLING_PLANS,maxArchiveBytes:40*1024*1024});
  if(path==='/api/checkout'&&method==='POST')return Response.json({id:'new-history',status:'pending',requestedFormat:null});
  const match=String(path).match(/^\/api\/orders\/([^/]+)(\/publish)?$/);
  if(match&&orders.has(match[1])){
   if(!match[2]&&method==='GET')return Response.json(orders.get(match[1]));
   if(match[2]&&method==='PUT')return Response.json({delivery:{id:'published-fixture',revision:1}});
  }
  throw Error('Unexpected fixture request: '+method+' '+path);
 };
 const client=initBillingClient({getState:()=>state});await client.ready;
 return {client,calls,events,storage};
}

await test('older Historia remains usable for a book when a newer Mimo shares the draft',async t=>{
 const {client,calls}=await fixture(t,[historia,mimo],{draftId:historia.draftId,format:'livro'});
 assert.equal(client.find().id,historia.id);
 assert.equal(await client.requirePurchase('livro'),true);
 assert.deepEqual(calls.filter(c=>c.path.startsWith('/api/orders/')).map(c=>c.path),['/api/orders/'+historia.id]);
});

for(const format of ['cartao','stories'])await test('Historia is reused for Mimo '+format+' without a second checkout',async t=>{
 const {client,calls}=await fixture(t,[historia],{draftId:historia.draftId,format,checkoutPlan:'mimo',checkoutFormat:format});
 assert.equal((await client.checkout('mimo')).id,historia.id);
 assert.equal(calls.filter(c=>c.path==='/api/checkout').length,0);
 assert.ok(calls.some(c=>c.path==='/api/orders/'+historia.id));
});

await test('Mimo permits an explicit Historia upgrade for a book',async t=>{
 const {client,calls,storage}=await fixture(t,[mimo],{draftId:mimo.draftId,format:'cartao',checkoutPlan:'historia',checkoutFormat:'livro'});
 assert.equal((await client.checkout('historia')).id,'new-history');
 const checkouts=calls.filter(c=>c.path==='/api/checkout');assert.equal(checkouts.length,1);
 assert.equal(checkouts[0].method,'POST');assert.equal(JSON.parse(checkouts[0].body).planId,'historia');
 assert.equal(JSON.parse(storage.get(storeKey)).find(r=>r.id==='new-history').requestedFormat,'livro');
});

await test('publishing a book uses the compatible Historia purchase and credentials',async t=>{
 // Current UI format deliberately differs from published data; publish must use data.format.
 const {client,calls}=await fixture(t,[historia,mimo],{draftId:historia.draftId,format:'cartao'});
 const progress=[];const delivery=await client.publish({draftId:historia.draftId,format:'livro',recipient:'Lia & Rafa'},new Blob(['<html>fixture gift</html>']),value=>progress.push(value));
 assert.equal(delivery.id,'published-fixture');
 const uploads=calls.filter(c=>c.method==='PUT');assert.equal(uploads.length,1);
 assert.equal(uploads[0].path,'/api/orders/'+historia.id+'/publish');
 assert.equal(uploads[0].headers.Authorization,'Bearer '+historia.accessKey);
 assert.equal(uploads[0].headers['X-Gift-Format'],'livro');
 assert.equal(progress.length,1);
 assert.equal(calls.some(c=>c.path.startsWith('/api/orders/'+mimo.id)),false);
});

await test('Mimo alone cannot publish a book or send its bytes',async t=>{
 const {client,calls}=await fixture(t,[mimo],{draftId:mimo.draftId,format:'livro'});
 await assert.rejects(client.publish({draftId:mimo.draftId,format:'livro'},new Blob(['fixture'])),/Confirme a compra/);
 assert.equal(calls.some(c=>c.method==='PUT'),false);
});

const failedConfigs=[
 ['network rejection',()=>Promise.reject(new TypeError('Fixture network unavailable'))],
 ['HTTP 500',()=>Response.json({error:'Fixture unavailable'},{status:500})],
 ['non-JSON HTML',()=>new Response('<html>Fixture error</html>',{headers:{'Content-Type':'text/html'}})],
 ['invalid JSON',()=>new Response('{broken',{headers:{'Content-Type':'application/json'}})]
];
for(const [failure,configResponse] of failedConfigs)await test('public host fails closed on billing config '+failure,async t=>{
 const {client,calls,events}=await fixture(t,[],{draftId:'fixture-unavailable',format:'cartao'},{configResponse});
 assert.equal(client.config.mode,'unavailable');
 assert.equal(await client.requirePurchase('cartao'),false);
 assert.ok(events.some(event=>event.type==='billing:unavailable'));
 await assert.rejects(client.checkout('mimo'),/checkout.*configura/i);
 assert.equal(calls.some(call=>call.path==='/api/checkout'),false);
 assert.equal(calls.some(call=>call.path.startsWith('/api/orders/')),false);
});

for(const hostname of ['localhost','127.0.0.1','[::1]'])await test('loopback '+hostname+' keeps offline demo when config fails',async t=>{
 const {client,events}=await fixture(t,[],{draftId:'fixture-demo',format:'cartao'},{hostname,configResponse:failedConfigs[0][1]});
 assert.equal(client.config.mode,'offline');
 assert.equal(await client.requirePurchase('cartao'),true);
 assert.equal(events.some(event=>event.type==='billing:unavailable'),false);
});

await test('backup excludes admin grants and checkout attempts without an order',async t=>{
 const {client}=await fixture(t,[historia,{...mimo,isAdmin:true},{...mimo,id:undefined}],{draftId:historia.draftId,format:'livro'});
 const data=JSON.parse(await client.backup().text());assert.deepEqual(data.orders.map(r=>r.id),[historia.id]);
});
await test('mixed backup recovers valid paid order after inaccessible and malformed entries',async t=>{
 const paid={...historia,id:'a'.repeat(32),accessKey:'b'.repeat(64),requestedFormat:null};
 const {client,storage}=await fixture(t,[paid],{draftId:paid.draftId,format:'cartao'});
 const orders=[null,{id:'c'.repeat(32),accessKey:'d'.repeat(64)}, {...paid,requestedFormat:'cartao'}, {...paid,requestedFormat:'cartao'}];
 const restored=await client.restore(new Blob([JSON.stringify({type:'capimimo-purchase-access',orders})]));
 assert.equal(restored.length,1);assert.equal(restored.skipped,2);assert.equal(restored[0].requestedFormat,'cartao');assert.equal(JSON.parse(storage.get(storeKey)).length,1);
});
await test('restore accepts a legitimate multi-invitation backup larger than 256KB',async t=>{
 const paid={...historia,id:'a'.repeat(32),accessKey:'b'.repeat(64),guestLinks:Object.fromEntries(Array.from({length:100},(_,i)=>['guest-'+i,'https://capimimo.test/g/'+('a'.repeat(3000))]))};
 const {client}=await fixture(t,[paid],{draftId:paid.draftId,format:'livro'});const file=client.backup();assert.ok(file.size>256*1024);assert.equal((await client.restore(file)).length,1);
});
await test('malformed local entries do not break valid purchase lookup',async t=>{
 const {client}=await fixture(t,[null,42,{},historia],{draftId:historia.draftId,format:'livro'});assert.equal(client.find().id,historia.id);
});
await test('failed restore leaves existing valid purchase unchanged',async t=>{
 const {client,storage}=await fixture(t,[historia],{draftId:historia.draftId,format:'livro'});const before=storage.get(storeKey);
 await assert.rejects(client.restore(new Blob(['null'])),/inválido/);assert.equal(storage.get(storeKey),before);
 await assert.rejects(client.restore(new Blob([JSON.stringify({type:'capimimo-purchase-access',orders:[{id:'c'.repeat(32),accessKey:'d'.repeat(64)}]})])),/Não foi possível recuperar/);assert.equal(storage.get(storeKey),before);
});
