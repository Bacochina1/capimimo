import {initReceiving} from './receiving.js';
import {renderCollection} from './collection.js';
import {createPaper} from './paper.js';
import {createMaterials,themeGroup} from './materials.js';
import {createQRControls,readReceipt} from './qr.js';
import {initCommerce} from './commerce.js';
const $ = (selector,root=document)=>root.querySelector(selector);
const $$ = (selector,root=document)=>[...root.querySelectorAll(selector)];
const themes={amizade:{sheet:'classic',row:0,label:'Só porque sim'},casamento:{sheet:'seasonal',row:0,label:'Casamento'},natal:{sheet:'classic',row:1,label:'Natal'},maes:{sheet:'classic',row:2,label:'Dia das Mães'},namorados:{sheet:'classic',row:3,label:'Namorados'},aniversario:{sheet:'seasonal',row:3,label:'Aniversário'},pascoa:{sheet:'seasonal',row:1,label:'Páscoa'},pais:{sheet:'seasonal',row:2,label:'Dia dos Pais'}};
const initial={occasion:'amizade',format:'livro',recipient:'',message:'',color:'#B94162',wedding:'gift',eventDate:'',eventPlace:'',character:'capy',person:0,model:'memorias',texture:'algodao',pattern:'aniversario-0',qrStyle:'carta'};
let state={...initial},photo=null,isOpen=false,book=null,paper=null,materialUI=null,qrUI=null,advanced=false,zoom=1,toastTimer,saveTimer;
let motionPaused=matchMedia('(prefers-reduced-motion: reduce)').matches;
const storageKey='capimimo-draft-v1';
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&typeof saved==='object'){state={...initial,...saved};if(!themes[state.occasion])state.occasion='amizade';if(!['livro','cartao','convite'].includes(state.format))state.format='livro';if(!['gift','invite'].includes(state.wedding))state.wedding='gift';if(!['#B94162','#4A7294','#835A38','#5B486D'].includes(state.color))state.color=initial.color;for(const [key,max] of [['recipient',34],['message',180],['eventPlace',60],['eventDate',10]])state[key]=String(state[key]||'').slice(0,max);}}catch{state={...initial};}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
let incoming=readReceipt();if(incoming)Object.assign(state,incoming);
function save(){if(incoming)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(storageKey,JSON.stringify(state));$('#draft-status').textContent='Rascunho salvo neste navegador.';}catch{$('#draft-status').textContent='Prévia ativa. Este navegador não permitiu salvar.';}},300);}
function applySprite(element,theme){element.classList.remove('classic','seasonal','people','row0','row1','row2','row3');element.classList.add(theme.sheet,'row'+theme.row);element.style.setProperty('--frame-x',(theme.col||0)*100/3+'%');}
function activeTheme(){return state.character==='people'?{sheet:'people',row:Math.floor((state.person||0)/4),col:(state.person||0)%4,label:themes[state.occasion].label}:themes[state.occasion];}
function bookData(){return {...state,theme:activeTheme(),photo};}
function render(saveChange=true){
 if(!['algodao','linho','kraft'].includes(state.texture))state.texture='algodao';const group=themeGroup(state.occasion);if(!new RegExp('^'+group+'-[0-3]$').test(state.pattern))state.pattern=group+'-0';
 $('#occasion-select').value=state.occasion;$('#recipient').value=state.recipient;$('#message').value=state.message;$('#event-date').value=state.eventDate;$('#event-place').value=state.eventPlace;
 $('#message-count').textContent=state.message.length+'/180';
 $$('[data-occasion]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.occasion===state.occasion)));
 $$('[data-format]').forEach(b=>{const active=b.dataset.format===state.format;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
 $$('.swatch').forEach(b=>{const active=b.dataset.color===state.color;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
 const wedding=state.occasion==='casamento',invite=state.format==='convite';
 $('#wedding-path').hidden=!wedding;$('#invite-fields').hidden=!invite;
 $$('[name=wedding]').forEach(r=>r.checked=r.value===state.wedding);
 $('#recipient-label').textContent=invite?'Nomes de quem vai celebrar':wedding?'Nome do casal':'Para quem é?';
 $('#recipient').placeholder=wedding||invite?'Ex.: Lia & Rafa':'Nome de alguém especial';
 document.documentElement.style.setProperty('--cover',state.color);
 $('#people-options').hidden=state.character!=='people';
 $$('[data-character]').forEach(b=>{const selected=b.dataset.character===state.character;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
 $$('[data-person]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.person)===state.person)));
 $$('[data-model]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.model===state.model)));
 $('#step-2').classList.toggle('active',!!state.recipient||!!state.message||!!photo);
 $('#step-3').classList.toggle('active',isOpen);
 book?.set(bookData());paper?.set(bookData());materialUI?.render();qrUI?.render();if(saveChange)save();
}
function scrollAtelier(focus=false){$('#atelier').scrollIntoView({behavior:motionPaused?'instant':'smooth'});if(focus)setTimeout(()=>$('#recipient').focus({preventScroll:true}),motionPaused?0:500);}
function setOccasion(occasion,scroll=true){state.occasion=occasion;if(state.format==='convite'&&occasion!=='casamento'){state.format='livro';state.wedding='gift';}render();if(scroll)scrollAtelier();toast('Capivara de '+themes[occasion].label.toLowerCase()+' escolhida.');}
$$('[data-create]').forEach(b=>b.addEventListener('click',()=>{if(incoming){incoming=null;state={...initial};photo=null;history.replaceState(null,'',location.pathname);render();}scrollAtelier(true);}));
$$('[data-occasion]').forEach(b=>b.addEventListener('click',()=>setOccasion(b.dataset.occasion)));
$('#occasion-select').addEventListener('change',e=>setOccasion(e.target.value,false));
$$('[data-format]').forEach(b=>b.addEventListener('click',()=>{state.format=b.dataset.format;if(state.format==='convite'){state.occasion='casamento';state.wedding='invite';}else if(state.wedding==='invite')state.wedding='gift';render();}));
for(const field of ['recipient','message'])$('#'+field).addEventListener('input',e=>{state[field]=e.target.value;render();});
$('#event-date').addEventListener('change',e=>{state.eventDate=e.target.value;render();});
$('#event-place').addEventListener('input',e=>{state.eventPlace=e.target.value;render();});
$$('.swatch').forEach(b=>b.addEventListener('click',()=>{state.color=b.dataset.color;render();}));
$$('[name=wedding]').forEach(r=>r.addEventListener('change',()=>{state.wedding=r.value;state.format=r.value==='invite'?'convite':'livro';render();}));
$$('[data-wedding]').forEach(b=>b.addEventListener('click',()=>{state.occasion='casamento';state.wedding=b.dataset.wedding;state.format=state.wedding==='invite'?'convite':'livro';render();scrollAtelier(true);}));
$$('[data-product]').forEach(b=>b.addEventListener('click',()=>{state.format=b.dataset.product;if(state.format==='convite'){state.occasion='casamento';state.wedding='invite';}else state.wedding='gift';render();scrollAtelier();}));
$('#open-book').addEventListener('click',()=>{isOpen=!isOpen;book?.open(isOpen);paper?.open(isOpen);$('#open-book').firstChild.textContent=isOpen?'Ver capa ':'Ver conteúdo ';$('#open-book').setAttribute('aria-expanded',String(isOpen));$('#book-hint').textContent=isOpen?'Um pouquinho de você, aqui dentro.':'Uma prévia para conferir cada detalhe.';$('#step-3').classList.toggle('active',isOpen);});
function setMotion(){document.body.classList.toggle('no-motion',motionPaused);$('#motion-toggle').setAttribute('aria-pressed',String(motionPaused));$('#motion-toggle').textContent=motionPaused?'Ativar movimentos':'Pausar movimentos';book?.motion(motionPaused);}
$('#motion-toggle').addEventListener('click',()=>{motionPaused=!motionPaused;setMotion();});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');reduced.addEventListener('change',()=>{motionPaused=reduced.matches;setMotion();});
$('#hero-surprise').addEventListener('click',()=>{$('#hero-response').textContent='Que bom que você veio. Vamos fazer um mimo?';toast('Tem alguém que vai adorar receber isso.');});
$('#my-draft').addEventListener('click',()=>{render(false);scrollAtelier(true);toast('Seu rascunho está aqui.');});
$('#reset-draft').addEventListener('click',()=>{if(!confirm('Apagar o rascunho salvo neste navegador?'))return;clearTimeout(saveTimer);state={...initial};photo=null;photoRequest++;$('#photo').value='';$('#upload-status').textContent='';isOpen=false;book?.open(false);paper?.open(false);$('#open-book').firstChild.textContent='Ver conteúdo ';$('#book-hint').textContent='Uma prévia para conferir cada detalhe.';$('#open-book').setAttribute('aria-expanded','false');try{localStorage.removeItem(storageKey);}catch{}render(false);$('#draft-status').textContent='Seu rascunho fica com você.';toast('Rascunho apagado. Um novo começo.');});
let photoRequest=0;
$('#photo').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;const request=++photoRequest;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('Escolha uma imagem JPG, PNG ou WebP.');e.target.value='';return;}if(file.size>10*1024*1024){toast('Use uma foto de até 10 MB.');e.target.value='';return;}try{const bitmap=await createImageBitmap(file);if(request!==photoRequest){bitmap.close();return;}const canvas=document.createElement('canvas');const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();photo=canvas.toDataURL('image/jpeg',.85);$('#upload-status').textContent='Foto adicionada à prévia. Ela permanece neste navegador.';render();toast('Uma lembrança entrou no seu mimo.');}catch{toast('Não foi possível abrir esta foto. Tente outra.');e.target.value='';}});
if(!['capy','people'].includes(state.character))state.character='capy';
if(!Number.isInteger(state.person)||state.person<0||state.person>11)state.person=0;
const peopleLabels=['Casal com véu e gravata','Duas noivas','Dois noivos','Um abraço de amigos','Mãe e filho','Pai e filho','Avó e neto','Aniversariante','Pessoa recebendo um presente','Pessoa de óculos recebendo um presente','Formanda','Grupo de amigos'];
peopleLabels.forEach((label,i)=>{const b=document.createElement('button');b.dataset.person=String(i);b.className='person-choice';b.setAttribute('aria-label',label);b.setAttribute('aria-pressed','false');const art=document.createElement('span');art.className='sprite people row'+Math.floor(i/4);art.style.setProperty('--frame-x',(i%4)*100/3+'%');art.setAttribute('aria-hidden','true');b.append(art);b.addEventListener('click',()=>{state.person=i;state.character='people';render();});$('#people-options').append(b);});
$$('[data-character]').forEach(b=>b.addEventListener('click',()=>{state.character=b.dataset.character;if(state.character==='people'){state.person=({casamento:0,maes:4,pais:5,aniversario:7,namorados:3})[state.occasion]??3;}render();}));
renderCollection(model=>{Object.assign(state,{model:model.id,format:model.format,occasion:model.occasion,color:model.color,character:model.character,person:model.person,message:model.message,wedding:model.format==='convite'?'invite':'gift'});render();scrollAtelier();toast('Modelo “'+model.title+'” pronto para personalizar.');});
materialUI=createMaterials(()=>state,patch=>{Object.assign(state,patch);render();});qrUI=createQRControls(bookData,patch=>{Object.assign(state,patch);render();});
paper=createPaper($('#paper-mount'),bookData());$('#book-viewport').classList.add('has-paper');
const receiving=initReceiving({getData:()=>({...bookData(),motionPaused})});
initCommerce({getState:()=>state,onSelectPlan:plan=>{state.planId=plan.id;state.format=plan.format;if(plan.format==='convite'){state.occasion='casamento';state.wedding='invite';}render();scrollAtelier();},onGuideFinish:()=>receiving.show()});
render(false);setMotion();
const revealObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('reveal');revealObserver.unobserve(entry.target);}},{threshold:.08});
$$('.section-heading,.occasion,.journey-grid article,.wedding-copy,.product-card,.final-inner').forEach(el=>revealObserver.observe(el));
const spriteObserver=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('playing',e.isIntersecting&&!motionPaused)),{threshold:.3});
$$('.journey-sprite,.caption-character,.final-capi').forEach(s=>spriteObserver.observe(s));
$('#advanced-mode').addEventListener('click',async()=>{advanced=!advanced;$('#advanced-mode').setAttribute('aria-pressed',String(advanced));$('#paper-mount').hidden=advanced;$('#book-mount').hidden=!advanced;$('#advanced-mode').textContent=advanced?'Voltar à prévia simples':'Explorar em 3D · opcional';if(advanced&&!book){$('#advanced-mode').disabled=true;try{const {createBook}=await import('./book.js');book=await createBook($('#book-mount'),bookData());book.set(bookData());book.open(isOpen);book.motion(motionPaused);$('#book-viewport').classList.add('has-webgl');}catch{advanced=false;$('#paper-mount').hidden=false;$('#book-mount').hidden=true;$('#advanced-mode').textContent='3D indisponível · prévia simples ativa';$('#advanced-mode').setAttribute('aria-pressed','false');toast('A prévia simples continua disponível neste aparelho.');}finally{$('#advanced-mode').disabled=false;}}});
function applyZoom(value){zoom=Math.max(1,Math.min(2.2,value));paper.zoom(zoom);book?.zoom(zoom);$('#zoom-level').textContent=Math.round(zoom*100)+'%';$('#zoom-out').disabled=zoom<=1;$('#zoom-in').disabled=zoom>=2.2;}
$('#zoom-out').addEventListener('click',()=>applyZoom(zoom-.2));$('#zoom-in').addEventListener('click',()=>applyZoom(zoom+.2));$('#zoom-reset').addEventListener('click',()=>applyZoom(1));applyZoom(1);
if(incoming)setTimeout(()=>receiving.show(),400);
window.__capimimo={getState:()=>({...state,photo:!!photo,isOpen,motionPaused}),getRenderer:()=>advanced&&book?'three':'2d',getBook:()=>book?.snapshot(),getPaper:()=>paper.snapshot()};
