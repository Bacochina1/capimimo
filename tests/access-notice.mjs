import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Exercise the actual render fragment against the same notice node across draft changes.
const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const start=source.indexOf("const accessNotice=document.querySelector('.creator-access-notice');"),end=source.indexOf('if(saveChange)save();',start);assert.ok(start>=0&&end>start);
const renderNotice=new Function('document','billing','state',source.slice(start,end)),title={textContent:''},text={textContent:''},node={querySelector:s=>s==='strong'?title:text},document={querySelector:()=>node};let purchase={status:'approved'};const billing={find:()=>purchase};
renderNotice(document,billing,{draftId:'paid'});assert.match(text.textContent,/Compra confirmada/);
purchase=null;renderNotice(document,billing,{draftId:'new-copy'});assert.doesNotMatch(text.textContent,/Compra confirmada/);assert.match(text.textContent,/ainda não tem uma compra confirmada/);
purchase={status:'pending'};renderNotice(document,billing,{draftId:'pending'});assert.match(text.textContent,/ainda não foi confirmado/);
purchase={status:'approved',isAdmin:true};renderNotice(document,billing,{draftId:'admin'});assert.match(title.textContent,/sem cobrança/);assert.match(text.textContent,/gratuitamente/);
console.log('VERDICT: PASS paid -> unpaid duplicate -> pending -> admin notice transitions');
