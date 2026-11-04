import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../dist/digital-export.js',import.meta.url),'utf8');
function fixture(){
 const listeners=new Map(),button={disabled:false,addEventListener:(name,fn)=>listeners.set(name,fn)},status={textContent:''};
 const panel={innerHTML:'',querySelector:s=>s==='button'?button:status};
 let calls=0,downloads=0,exports=0,release,reject,mode='pending';
 const gate=new Promise((yes,no)=>{release=yes;reject=no;});
 const context=vm.createContext({node:()=>panel,document:{querySelector:()=>({before(){}})},makeDigitalGift:async()=>{exports++;return new Blob(['gift']);},downloadFile:()=>downloads++,Blob});
 vm.runInContext(source.slice(source.indexOf('export function initDigitalExport')).replace('export function','function')+'\nthis.init=initDigitalExport;',context);
 context.init({getData:()=>({message:'Minha mensagem',format:'stories'}),getAudio:()=>({}),toast:()=>{},authorize:async()=>{calls++;return mode==='pending'?gate:mode==='allow';}});
 return {button,status,click:()=>listeners.get('click')(),release,reject,setMode:value=>mode=value,get calls(){return calls;},get downloads(){return downloads;},get exports(){return exports;}};
}
const a=fixture(),first=a.click(),second=a.click();assert.equal(a.calls,1,'only one authorization while it is pending');assert.equal(a.button.disabled,true);a.release(true);await Promise.all([first,second]);assert.equal(a.downloads,1);assert.equal(a.exports,1);assert.equal(a.button.disabled,false);console.log('PASS pending authorization locks duplicate clicks and downloads once');
for(const fails of [false,true]){const f=fixture(),pending=f.click();fails?f.reject(Error('offline')):f.release(false);await pending;assert.equal(f.downloads,0);assert.equal(f.button.disabled,false);assert.ok(f.status.textContent.length>0);f.setMode('allow');await f.click();assert.equal(f.downloads,1);assert.equal(f.calls,2);console.log('PASS '+(fails?'authorization error':'denied authorization')+' reports outcome and allows retry');}
console.log('VERDICT: PASS 3');
