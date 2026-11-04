import test from 'node:test';
import assert from 'node:assert/strict';
import {initAudioStudio} from '../dist/audio-studio.js';

function fixture(t){
 const names=['document','indexedDB','window','MediaRecorder','navigator','addEventListener'];
 const old=new Map(names.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 t.after(()=>{for(const [key,value]of old)value?Object.defineProperty(globalThis,key,value):delete globalThis[key];});
 const nodes=new Map(),events=new Map(),requests=[],recorders=[],streams=[];
 class Element{constructor(){this.listeners={};this.value='';this.textContent='';}setAttribute(){}append(){}after(){}closest(){return this;}querySelector(selector){if(!nodes.has(selector))nodes.set(selector,new Element());return nodes.get(selector);}querySelectorAll(){return [];}addEventListener(name,fn){this.listeners[name]=fn;}}
 const root=new Element();
 class Recorder{static isTypeSupported(){return true;}constructor(stream){this.stream=stream;this.state='inactive';this.mimeType='audio/webm';recorders.push(this);}start(){this.state='recording';}stop(){this.state='inactive';setTimeout(()=>{this.ondataavailable({data:new Blob(['final audio'],{type:'audio/webm'})});this.onstop();},15);}}
 const set=(key,value)=>Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
 set('document',{createElement:()=>new Element(),querySelector:selector=>root.querySelector(selector),activeElement:null});
 set('indexedDB',{open(){throw Error('Storage not needed by this recording fixture');}});set('window',{MediaRecorder:Recorder});set('MediaRecorder',Recorder);
 set('addEventListener',(name,fn)=>events.set(name,fn));set('navigator',{mediaDevices:{getUserMedia:()=>new Promise((resolve,reject)=>requests.push({resolve,reject}))}});
 let experience={sound:'file',audioKind:'voice',audioVolume:.6};
 const studio=initAudioStudio({getExperience:()=>experience,onChange:patch=>Object.assign(experience,patch),isIncoming:()=>false});
 const grant=index=>{const stream={stopped:false,getTracks(){return[{stop:()=>{stream.stopped=true;}}];}};streams.push(stream);requests[index].resolve(stream);return stream;};
 return{studio,nodes,events,requests,recorders,streams,grant,experience,start:()=>nodes.get('.record-voice').listeners.click(),stop:()=>nodes.get('.stop-recording').listeners.click(),mode:sound=>nodes.get('.audio-modes').listeners.click({target:{closest:()=>({dataset:{sound}})}})};
}

await test('double record click while permission is pending opens one microphone and stops it',async t=>{
 const f=fixture(t);await f.studio.flush();const pending=f.start();await f.start();assert.equal(f.requests.length,1);assert.equal(f.nodes.get('.record-voice').disabled,true);const stream=f.grant(0);await pending;assert.equal(f.recorders.length,1);f.stop();await f.studio.flush();assert.equal(stream.stopped,true);assert.equal(f.recorders[0].state,'inactive');assert.equal(await f.studio.exportMedia().blob.text(),'final audio');
});
for(const action of ['reset','pagehide','cancel'])await test('late microphone permission after '+action+' never starts recording',async t=>{
 const f=fixture(t);await f.studio.flush();const pending=f.start();if(action==='reset')f.studio.reset();else if(action==='pagehide')f.events.get('pagehide')();else f.stop();const stream=f.grant(0);await pending;await f.studio.flush();assert.equal(stream.stopped,true);assert.equal(f.recorders.length,0);assert.equal(f.studio.exportMedia().blob,null);assert.equal(f.nodes.get('.stop-recording').hidden,true);
});
await test('another recording cannot start while final audio chunks are being saved',async t=>{
 const f=fixture(t);await f.studio.flush();const pending=f.start();f.grant(0);await pending;f.stop();await f.start();assert.equal(f.requests.length,1);await f.studio.flush();assert.equal(f.nodes.get('.record-voice').disabled,false);
});
await test('denied permission leaves controls ready for a deliberate retry',async t=>{
 const f=fixture(t);await f.studio.flush();const pending=f.start();f.requests[0].reject(Error('denied'));await pending;assert.match(f.nodes.get('.audio-status').textContent,/não foi liberado/);assert.equal(f.nodes.get('.record-voice').disabled,false);assert.equal(f.nodes.get('.stop-recording').hidden,true);const retry=f.start();assert.equal(f.requests.length,2);f.stop();f.grant(1);await retry;
});
await test('changing sound mode cannot hide the stop control while recording or awaiting permission',async t=>{
 const f=fixture(t);await f.studio.flush();const pending=f.start();f.mode('off');assert.equal(f.experience.sound,'file');assert.equal(f.nodes.get('.audio-upload').hidden,false);assert.equal(f.nodes.get('.stop-recording').hidden,false);const stream=f.grant(0);await pending;f.mode('musicbox');assert.equal(f.experience.sound,'file');assert.equal(f.nodes.get('.audio-upload').hidden,false);assert.equal(f.nodes.get('.stop-recording').hidden,false);f.stop();await f.studio.flush();assert.equal(stream.stopped,true);f.mode('off');assert.equal(f.experience.sound,'off');
});
await test('importing another draft cancels pending microphone permission',async t=>{
 const f=fixture(t);await f.studio.flush();const pending=f.start();await f.studio.importMedia({blob:new Blob(['other draft'],{type:'audio/webm'}),name:'Other voice',kind:'voice'});const stream=f.grant(0);await pending;await f.studio.flush();assert.equal(stream.stopped,true);assert.equal(f.recorders.length,0);assert.equal(await f.studio.exportMedia().blob.text(),'other draft');
});
await test('importing another draft stops recording and rejects its final chunk',async t=>{
 const f=fixture(t);await f.studio.flush();const pending=f.start(),stream=f.grant(0);await pending;await f.studio.importMedia({blob:new Blob(['other draft'],{type:'audio/webm'}),name:'Other voice',kind:'voice'});await f.studio.flush();assert.equal(stream.stopped,true);assert.equal(f.recorders[0].state,'inactive');assert.equal(await f.studio.exportMedia().blob.text(),'other draft');
});
await test('export flush cancels pending permission so recording cannot start afterward',async t=>{
 const f=fixture(t);await f.studio.flush();const pending=f.start();await f.studio.flush();const stream=f.grant(0);await pending;assert.equal(stream.stopped,true);assert.equal(f.recorders.length,0);assert.equal(f.studio.exportMedia().blob,null);
});
