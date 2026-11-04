import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {Browser} from 'file:///C:/Users/Admin/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
const root=resolve('dist');
const html='<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/digital.css"><script type="module">import{createStoriesViewer}from"/stories.js";window.viewer=createStoriesViewer();viewer.show({recipient:"Ana",format:"stories",photos:[],message:"Uma memória especial",experience:{sound:"off",reply:false,counter:false}});window.ready=true;</script>';
const server=createServer(async(req,res)=>{try{if(req.url==='/fixture'){res.setHeader('Content-Type','text/html');return res.end(html);}const f=resolve(root,'.'+new URL(req.url,'http://local').pathname);assert.ok(f.startsWith(root));res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2'})[extname(f)]||'application/octet-stream');res.end(await readFile(f));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await Browser.launch();const pause=()=>new Promise(r=>setTimeout(r,60));
try{for(const width of [320,360,390,1024]){const p=await browser.newPage({width,height:width===1024?900:568});await p.goto('http://127.0.0.1:'+server.address().port+'/fixture');for(let i=0;i<100&&!await p.eval(()=>window.ready);i++)await pause();
 for(const state of ['initial','paused','sound','continued','large-text']){
 await p.eval(state=>{if(state==='paused'||state==='continued')document.querySelector('.stories-pause').click();if(state==='sound')document.querySelector('.stories-sound').click();if(state==='large-text'){document.querySelector('.stories-pause').click();document.querySelector('.stories-sound').click();for(const e of document.querySelectorAll('.stories-top button,.stories-top strong,.stories-controls button,.stories-position'))e.style.fontSize=parseFloat(getComputedStyle(e).fontSize)*2+'px';}},state);
 const layout=await p.eval(()=>({width:innerWidth,height:innerHeight,buttons:[...document.querySelectorAll('.stories-top button,.stories-controls button')].map(e=>({text:e.textContent,...e.getBoundingClientRect().toJSON(),scroll:e.scrollWidth,client:e.clientWidth})),stage:document.querySelector('.stories-stage').getBoundingClientRect().toJSON(),progress:document.querySelector('.stories-progress').getBoundingClientRect().toJSON()}));
 for(const button of layout.buttons){assert.ok(button.width>=44&&button.height>=44,`${width} ${state} target ${JSON.stringify(button)}`);assert.ok(button.left>=0&&button.right<=width+.5&&button.top>=0&&button.bottom<=layout.height,`${width} ${state} clipped ${JSON.stringify(button)}`);assert.ok(button.scroll<=button.client+1,`${width} ${state} overflowing text`);}
 assert.ok(layout.stage.height>=150,`${width} ${state} usable stage ${layout.stage.height}`);assert.ok(layout.progress.height>0&&layout.progress.bottom<=layout.stage.top+.5);
 if(width===320&&state==='large-text'){await mkdir('work/stories-mobile-header',{recursive:true});const shot=await p.send('Page.captureScreenshot',{format:'png'});await writeFile('work/stories-mobile-header/320-large-text.png',Buffer.from(shot.data,'base64'));}
 }
 assert.equal(p.consoleErrors.length,0);console.log('PASS '+width+'px initial/paused/sound/continued/200% text: controls visible and 44px, readable text, stage and progress usable');}
}finally{await browser.close();server.closeAllConnections();server.close();}process.exit(0);
