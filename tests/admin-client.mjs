import assert from 'node:assert/strict';
import test from 'node:test';
import {initBillingClient} from '../dist/billing-client.js';
import {BILLING_PLANS} from '../server/mercadopago-orders.mjs';

for(const format of ['cartao','livro','stories','convite'])await test('admin client grants then publishes '+format+' without checkout',async t=>{
 const globals=new Map(['fetch','localStorage','document','location'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 t.after(()=>{for(const [key,descriptor] of globals)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
 const store=new Map(),calls=[],state={draftId:'fixture-admin-'+format,format};
 Object.defineProperty(globalThis,'location',{configurable:true,value:{hostname:'capimimo.test'}});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value))}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{dispatchEvent:()=>true}});
 globalThis.fetch=async(path,options={})=>{
  calls.push({path,...options});
  if(path==='/api/billing/config')return Response.json({mode:'test',checkoutReady:false,admin:{authenticated:true,username:'fictional-owner'},plans:BILLING_PLANS,maxArchiveBytes:1024*1024});
  if(path==='/api/admin/grants')return Response.json({id:'fixture-grant-'+format,isAdmin:true,status:'approved',planId:'celebrar',draftId:state.draftId,mode:'test',accessKey:'a'.repeat(64),amountCents:0});
  if(path==='/api/orders/fixture-grant-'+format+'/publish')return Response.json({delivery:{id:'fixture-public-'+format,revision:1}});
  throw Error('Unexpected request '+path);
 };
 const client=initBillingClient({getState:()=>state});await client.ready;
 // No pre-existing record: publish must request the admin grant before find().
 const delivery=await client.publish({...state,recipient:'Pessoa fictícia'},new Blob(['<!doctype html><html lang="pt-BR">Fixture</html>']));
 assert.equal(delivery.id,'fixture-public-'+format);
 assert.equal(calls.filter(c=>c.path==='/api/checkout').length,0);
 assert.equal(calls.filter(c=>c.path==='/api/admin/grants').length,1);
 const upload=calls.find(c=>c.method==='PUT');assert.ok(upload);
 assert.equal(upload.headers['X-Gift-Format'],format);
 assert.equal(client.find(state.draftId,format)?.isAdmin,true);
});
