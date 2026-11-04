import test from 'node:test';
import assert from 'node:assert/strict';
import {initCloudDelivery} from '../dist/cloud-delivery.js';

function fixture(t){
 class El{constructor(){this.listeners={};this.children=[];this.queries=new Map();this.textContent='';this.value='';this.hidden=false;this.disabled=false;}setAttribute(){}querySelector(s){if(!this.queries.has(s))this.queries.set(s,new El());return this.queries.get(s);}addEventListener(n,f){this.listeners[n]=f;}append(...items){this.children.push(...items);}after(item){this.afterElement=item;}replaceChildren(...items){this.children=items;}showModal(){}close(){}async fire(type,event={}){return this.listeners[type]?.({target:this,preventDefault(){},...event});}}
 class Reader{readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{this.result='data:'+blob.type+';base64,'+Buffer.from(bytes).toString('base64');this.onload();});}}
 const root=new El(),body=new El(),globals={document:{querySelector:s=>root.querySelector(s),createElement:()=>new El(),body,addEventListener(){}},window:{},Option:class{constructor(label,value){this.text=label;this.value=value;}},FileReader:Reader,fetch:async()=>new Response('')};
 const previous=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));for(const[k,v]of Object.entries(globals))Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});t.after(()=>{for(const[k,d]of previous)d?Object.defineProperty(globalThis,k,d):delete globalThis[k];});
 let state={draftId:'draft-a',format:'stories',recipient:'Ana',occasion:'natal',theme:{sheet:'seasonal'},photos:[]},failure=null;const records=[],published=[],requested=[];
 const billing={ready:Promise.resolve(),config:{mode:'live',plans:{mimo:{title:'Um mimo'}}},get:id=>records.find(r=>r.id===id),find:(id=state.draftId)=>records.find(r=>r.draftId===id),list:()=>records,
 async requirePurchase(format,draftId){requested.push({format,draftId});if(failure)throw Error(failure);if(!this.find(draftId))records.push({id:'order-'+draftId,draftId,mode:'live',planId:'mimo',status:'approved'});return true;},
 async publish(data,file){assert.equal(file.type,'text/html;charset=utf-8');published.push(data.draftId);const r=this.find(data.draftId);r.delivery={url:'https://capimimo.test/g/'+data.draftId,expiresAt:1900000000};return r.delivery;}};
 const api=initCloudDelivery({billing,getData:()=>structuredClone(state),getAudio:()=>null,getState:()=>state,onRestore:()=>{},toast:()=>{}}),panel=root.querySelector('.digital-delivery').afterElement;
 return {api,panel,records,published,requested,setState:patch=>state={...state,...patch},fail:value=>failure=value,$:s=>panel.querySelector(s)};
}
await test('publishing A then switching to B clears A selection and lets B publish',async t=>{
 const f=fixture(t);await Promise.resolve();await f.$('.cloud-publish').fire('click');assert.deepEqual(f.published,['draft-a']);assert.equal(f.$('.cloud-link').value,'https://capimimo.test/g/draft-a');
 f.setState({draftId:'draft-b',recipient:'Bia'});f.api.render();assert.equal(f.$('.cloud-result').hidden,true,'old gift is not displayed for the new draft');assert.equal(f.$('.cloud-publish').disabled,false);assert.equal(f.$('.cloud-publish').textContent,'Publicar e criar meu link');
 await f.$('.cloud-publish').fire('click');assert.deepEqual(f.published,['draft-a','draft-b']);assert.equal(f.$('.cloud-link').value,'https://capimimo.test/g/draft-b');assert.equal(f.$('.cloud-publish').disabled,false);
});
await test('network rejection during purchase validation is visible and publication can be retried',async t=>{
 const f=fixture(t);await Promise.resolve();f.fail('Sem conexão. Tente novamente.');await assert.doesNotReject(()=>f.$('.cloud-publish').fire('click'));assert.equal(f.$('.cloud-status').textContent,'Sem conexão. Tente novamente.');assert.equal(f.$('.cloud-publish').disabled,false);assert.deepEqual(f.published,[]);
 f.fail(null);await f.$('.cloud-publish').fire('click');assert.deepEqual(f.published,['draft-a']);assert.match(f.$('.cloud-status').textContent,/Seu mimo está publicado/);assert.equal(f.$('.cloud-publish').disabled,false);
});

await test('session-only purchases direct recovery to account and never export an empty backup',async t=>{
 const f=fixture(t);await Promise.resolve();f.records.push({id:'account-order',draftId:'draft-a',mode:'live',planId:'mimo',status:'approved',sessionAuth:true});f.api.render();
 assert.equal(f.$('.cloud-save-access').hidden,true);assert.match(f.$('.cloud-access-description').textContent,/Minha conta/);
 await assert.doesNotReject(()=>f.$('.cloud-save-access').fire('click'));assert.match(f.$('.cloud-status').textContent,/Minha conta/);
 f.records[0].accessKey='a'.repeat(64);f.api.render();assert.equal(f.$('.cloud-save-access').hidden,true,'account-linked local bearer also uses account recovery');
 f.records[0].sessionAuth=false;f.api.render();assert.equal(f.$('.cloud-save-access').hidden,false);assert.match(f.$('.cloud-access-description').textContent,/arquivo de acesso/);
 f.records[0].isAdmin=true;f.api.render();assert.equal(f.$('.cloud-save-access').hidden,true);
});
