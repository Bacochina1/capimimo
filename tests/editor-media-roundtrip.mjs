import test from 'node:test';
import assert from 'node:assert/strict';
import {makeDigitalGift} from '../dist/digital-export.js';
import {initAudioStudio} from '../dist/audio-studio.js';

function globals(t,values){const saved=new Map(Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));for(const [k,v] of Object.entries(values))Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});t.after(()=>{for(const [k,d]of saved)d?Object.defineProperty(globalThis,k,d):delete globalThis[k];});}
await test('Stories archive preserves custom cover fields used when recovering the published gift',async t=>{
 class Reader{readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{this.result='data:'+blob.type+';base64,'+Buffer.from(bytes).toString('base64');this.onload();});}}
 globals(t,{FileReader:Reader,fetch:async()=>new Response('')});
 const data={format:'stories',occasion:'natal',theme:{sheet:'seasonal'},recipient:'Ana',message:'Para você',draftId:'fixture',color:'#123456',texture:'linho',pattern:'winter-2',coverArt:'winter',openingStyle:'stars',eventDate:'2026-12-25',eventPlace:'Nossa casa',appearance:{accent:'#abcdef'},storyDesign:{nickname:'Aninha'},photos:[]};
 const file=await makeDigitalGift(data,null),html=await file.text();const payload=JSON.parse(html.match(/id="capimimo-payload">([\s\S]*?)<\/script>/)[1]);
 for(const field of ['color','texture','pattern','coverArt','openingStyle','eventDate','eventPlace','appearance','storyDesign'])assert.deepEqual(payload[field],data[field],field+' survives publish/recover');
});
await test('flush stops an active voice recording and awaits its final audio chunk',async t=>{
 const nodes=new Map();
 class El{constructor(){this.listeners={};this.value='';this.textContent='';}setAttribute(){}append(){}after(){}closest(){return this;}querySelector(s){if(!nodes.has(s))nodes.set(s,new El());return nodes.get(s);}querySelectorAll(){return [];}addEventListener(n,f){this.listeners[n]=f;}}
 const root=new El();let stopped=false,recording;
 class Recorder{static isTypeSupported(){return true;}constructor(){recording=this;this.state='inactive';this.mimeType='audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';setTimeout(()=>{this.ondataavailable({data:new Blob(['final voice chunk'],{type:'audio/webm'})});this.onstop();},20);}}
 globals(t,{document:{createElement:()=>new El(),querySelector:s=>root.querySelector(s),activeElement:null},indexedDB:{open(){throw Error('fixture storage unavailable');}},window:{MediaRecorder:Recorder},MediaRecorder:Recorder,navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped=true;}}]})}},addEventListener:()=>{}});
 let experience={sound:'file',audioKind:'voice',audioVolume:.6};const studio=initAudioStudio({getExperience:()=>experience,onChange:patch=>Object.assign(experience,patch),isIncoming:()=>false});
 await studio.flush();await nodes.get('.record-voice').listeners.click();assert.equal(recording.state,'recording');
 try{await studio.flush();assert.equal(recording.state,'inactive');assert.equal(stopped,true);assert.equal(await studio.exportMedia().blob?.text(),'final voice chunk');assert.equal(experience.sound,'file');}finally{nodes.get('.stop-recording').listeners.click();await new Promise(r=>setTimeout(r,30));}
});
