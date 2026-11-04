import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {Browser} from 'file:///C:/Users/Admin/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname;if(path==='/'){res.setHeader('Content-Type','text/html');return res.end('<meta charset="utf-8"><div class="character-field"></div>');}res.setHeader('Content-Type',({'.js':'text/javascript','.webp':'image/webp'})[extname(path)]||'application/octet-stream');res.end(await readFile(resolve('dist','.'+path)));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await Browser.launch();
try{
 const page=await browser.newPage({width:390,height:844,reducedMotion:true});await page.goto('http://127.0.0.1:'+server.address().port);
 await page.eval(async()=>{const{initAppearanceEditor}=await import('/appearance.js');window.state={occasion:'natal',format:'livro',appearance:{},storyDesign:{title:'Meu texto'},bookFinish:{material:'linen'}};window.editor=initAppearanceEditor({getState:()=>state,onChange:patch=>{Object.assign(state,patch);editor.render();}});});
 const invalid=()=>page.eval(()=>{const input=document.querySelector('[data-color-key=paper] input[type=text]');input.focus();input.value='#NOPE';input.dispatchEvent(new Event('change'));return{valid:input.checkValidity(),message:input.validationMessage};});
 for(const action of ['palette','swatch','restore']){
  assert.equal((await invalid()).valid,false);
  const result=await page.eval(action=>{const hex=document.querySelector('[data-color-key=paper] input[type=text]');if(action==='swatch'){const swatch=hex.previousElementSibling;swatch.focus();swatch.value='#125abc';swatch.dispatchEvent(new Event('input'));}else{const button=document.querySelector(action==='palette'?'[data-gift-palette=azul]':'.restore-theme-colors');for(let parent=button.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;button.focus();button.click();}return{value:hex.value,valid:hex.checkValidity(),message:hex.validationMessage,storyTitle:state.storyDesign.title,storyPaper:state.storyDesign.paper};},action);
  assert.match(result.value,/^#[0-9a-f]{6}$/i);assert.equal(result.valid,true,action+' must clear stale validation after replacing HEX');assert.equal(result.message,'');assert.equal(result.storyTitle,'Meu texto');if(action==='swatch')assert.equal(result.storyPaper,'#125abc');console.log('PASS invalid HEX recovers via '+action);
 }
 assert.equal((await invalid()).valid,false);
 const editing=await page.eval(()=>{editor.render();const hex=document.activeElement;return{value:hex.value,valid:hex.checkValidity()};});assert.equal(editing.value,'#NOPE');assert.equal(editing.valid,false);console.log('PASS render preserves active invalid draft and validation');
 const fixed=await page.eval(()=>{const hex=document.activeElement;hex.value='#234567';hex.dispatchEvent(new Event('change'));return{valid:hex.checkValidity(),paper:state.appearance.paper,story:state.storyDesign.paper};});assert.deepEqual(fixed,{valid:true,paper:'#234567',story:'#234567'});console.log('PASS direct HEX correction applies to editor and stories');
 const ornaments=await page.eval(()=>{const buttons=[...document.querySelectorAll('[data-ornament]')];for(const button of buttons.slice(0,5))button.click();const capped=state.appearance.ornaments.length;buttons[0].click();buttons[4].click();return{capped,selected:[...state.appearance.ornaments],expected:buttons.slice(1,5).map(b=>b.dataset.ornament)};});assert.equal(ornaments.capped,4);assert.deepEqual(ornaments.selected,ornaments.expected);console.log('PASS ornament limit and replacing a selected ornament');
 assert.equal(page.consoleErrors.length,0);
}finally{await browser.close();server.closeAllConnections();server.close();}
process.exit(0);
