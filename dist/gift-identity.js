// The same paper, rounded outlines and small keepsake details used by the storefront.
export const mimoIdentity={paper:'#fff9f1',white:'#fffdf8',ink:'#3a1e14',coral:'#e8473a',gold:'#f1c870',blue:'#b9d5e9',rose:'#f6d5d5'};
export function mimoHeart(ctx,x,y,size,color=mimoIdentity.coral){ctx.save();ctx.translate(x,y);ctx.scale(size/20,size/20);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,8);ctx.bezierCurveTo(-3,5,-11,-1,-9,-6);ctx.bezierCurveTo(-7,-11,-1,-10,0,-5);ctx.bezierCurveTo(2,-11,8,-11,10,-6);ctx.bezierCurveTo(12,0,4,6,0,8);ctx.fill();ctx.restore();}
export function mimoPaperEdge(ctx,w,h,palette={},a={}){if(a.borderStyle&&a.borderStyle!=='theme'&&a.borderStyle!=='none')paintCustomBorder(ctx,w,h,palette,a);}
export function mimoPhotoTabs(ctx,x,y,w,h,{ink=mimoIdentity.ink,color=mimoIdentity.gold,scale=1}={}){ctx.save();ctx.translate(x+w*.18,y);ctx.rotate(-.09);ctx.globalAlpha=.88;ctx.fillStyle=color;ctx.strokeStyle=ink;ctx.lineWidth=.6*scale;ctx.beginPath();ctx.moveTo(-22*scale,-7*scale);ctx.lineTo(22*scale,-7*scale);ctx.lineTo(20*scale,7*scale);ctx.lineTo(-20*scale,7*scale);ctx.closePath();ctx.fill();ctx.globalAlpha=.25;ctx.stroke();ctx.restore();}
export function mimoLabel(ctx,label,x,y,w,h,{paper=mimoIdentity.gold,ink=mimoIdentity.ink,heart=true}={}){ctx.save();ctx.fillStyle=ink;ctx.beginPath();ctx.roundRect(x+1.6,y+2.4,w,h,h*.4);ctx.fill();ctx.fillStyle=paper;ctx.strokeStyle=ink;ctx.lineWidth=1.3;ctx.beginPath();ctx.roundRect(x,y,w,h,h*.4);ctx.fill();ctx.stroke();ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 '+Math.round(h*.35)+'px Nunito,Arial';ctx.fillText(label,x+w/2-(heart?7:0),y+h*.51,w-22);if(heart)mimoHeart(ctx,x+w-16,y+h*.53,h*.25,mimoIdentity.coral);ctx.restore();}
export function mimoSeal(ctx,sprite,theme,x,y,size,{paper=mimoIdentity.white,ink=mimoIdentity.ink,accent=mimoIdentity.coral}={}){if(!sprite)return;ctx.save();ctx.translate(x,y);ctx.fillStyle=ink;ctx.beginPath();for(let i=0;i<64;i++){const angle=i/64*Math.PI*2,r=size*(i%4<2?.59:.63),px=Math.cos(angle)*r,py=Math.sin(angle)*r;i?ctx.lineTo(px+1.5,py+2):ctx.moveTo(px+1.5,py+2);}ctx.closePath();ctx.fill();ctx.fillStyle=paper;ctx.strokeStyle=ink;ctx.lineWidth=Math.max(1,size*.027);ctx.beginPath();for(let i=0;i<64;i++){const angle=i/64*Math.PI*2,r=size*(i%4<2?.59:.63),px=Math.cos(angle)*r,py=Math.sin(angle)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();ctx.stroke();const cell=sprite.width/4;ctx.drawImage(sprite,(theme?.col||0)*cell,(theme?.row||0)*cell,cell,cell,-size*.43,-size*.43,size*.86,size*.86);mimoHeart(ctx,size*.44,-size*.43,size*.23,accent);ctx.restore();}

// Occasion ornamentation stays outside the reading and photography area.
export const occasionTreatments=['Cantos ilustrados','Dueto no alto','Dois pequenos gestos','Presentes no rodapé','Estrelas de papel','Ramos em diagonal','Um detalhe especial','Laço e lembrança','Quatro cantos','Pequena celebração','Postal de afeto','Dueto discreto','Símbolos em diagonal','Assinatura ilustrada','Quatro estrelas','Lembranças nas laterais','Jardim de papel','Trio de celebração','Dueto no rodapé','Essencial com carinho'];
export function occasionMotifs(data={}){if(Array.isArray(data.appearance?.ornaments)&&data.appearance.ornaments.length){const chosen=data.appearance.ornaments.filter(id=>Object.hasOwn(ornamentChoices,id));if(chosen.length)return Array.from({length:4},(_,i)=>chosen[i%chosen.length]);}const key=data.occasion||data.theme?.material;return ({natal:['tree','ornament','gift','star'],pascoa:['egg','bunny','flower','egg'],aniversario:['cake','balloon','gift','star'],mesversario:['balloon','star','cake','heart'],casamento:['rings','flower','bow','heart'],bodas:['rings','heart','flower','star'],namorados:['heart','letter','bow','flower'],aniversario_namoro:['heart','star','letter','flower'],pedido_namoro:['letter','heart','rings','star'],desculpas:['branch','letter','heart','flower'],maes:['flower','heart','branch','bow'],pais:['letter','star','branch','heart'],avos:['flower','letter','heart','branch'],formatura:['cap','star','branch','gift'],anonovo:['star','ornament','gift','star'],pet:['paw','heart','gift','paw'],amizade:['letter','flower','heart','star'],outro:['gift','heart','flower','star']})[key]||['gift','heart','flower','star'];}
// Illustrated paper accents: no connecting paths, rings or automatic frames.
// All coordinates reserve the centre for names, messages and photographs.
export function paintOccasionOrnaments(ctx,w,h,data={},palette={}){
 const a=data.appearance||{};if(a.occasionDecor===false)return;
 const style=Math.max(0,Math.min(19,Math.floor(Number(a.themeStyle)||0))),motifs=occasionMotifs(data),u=Math.min(w,h),size=u*.074*(a.ornamentScale||1);
 const arrangements=[
  [[.085,.1,0,1.2,-.12],[.91,.9,1,1.1,.1]],
  [[.085,.11,0,1.2,-.1],[.915,.11,1,1.2,.1]],
  [[.085,.1,0,1],[.915,.9,1,1]],
  [[.085,.9,0,1.3,-.1],[.915,.9,2,1.1,.1]],
  [[.085,.11,3,.85],[.915,.11,3,.6],[.085,.89,1,.65],[.915,.89,3,.9]],
  [[.085,.14,2,1.3,-.2],[.915,.86,2,1.3,2.9]],
  [[.915,.87,0,1.4,.08]],
  [[.085,.11,2,1.4,-.12],[.915,.9,0,.9,.1]],
  [[.085,.11,0,1],[.915,.11,1,1],[.085,.89,2,1],[.915,.89,3,1]],
  [[.085,.12,0,.8,-.1],[.915,.12,1,.8,.1],[.085,.88,2,.8],[.915,.88,3,.8]],
  [[.915,.12,1,1.3,.12],[.085,.89,0,1.1,-.12]],
  [[.085,.18,0,.85,-.1],[.915,.82,1,.85,.1]],
  [[.085,.11,0,1.25,-.08],[.915,.89,1,1.25,.08]],
  [[.085,.12,0,1.4,-.08]],
  [[.085,.1,3,.7],[.915,.1,3,.9],[.085,.9,3,.9],[.915,.9,3,.7]],
  [[.085,.17,2,1.15,-.2],[.915,.83,0,1.15,.15]],
  [[.085,.12,2,1.3,-.2],[.915,.88,1,1.3,.2]],
  [[.085,.12,0,1.2,-.12],[.915,.12,1,1.2,.12],[.915,.9,2,.75]],
  [[.085,.89,0,.9,-.1],[.915,.89,1,.9,.1]],
  [[.915,.11,0,1.05,.08]]
 ];
 let spots=arrangements[style];
 if(a.ornamentPosition==='corners')spots=arrangements[8];
 if(a.ornamentPosition==='topbottom')spots=[[.16,.065,0,1],[.84,.935,1,1]];
 if(a.ornamentPosition==='sides')spots=[[.075,.32,0,1],[.925,.68,1,1]];
 if(a.ornamentDensity==='sparse')spots=spots.slice(0,1);
 if(a.ornamentDensity==='rich'&&spots.length<4)spots=[...spots,[.085,.89,2,.7],[.915,.11,3,.7]];
 const avoid=Array.isArray(data.ornamentAvoid)?data.ornamentAvoid:[],placements=[];
 const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 const place=(kind,x,y,z,angle=0)=>{
  const art=ornamentImages.get(kind);if(!art)return;const ratio=art.width/art.height,margin=Math.max(3,u*.008),blocked=[...avoid,...placements.map(p=>p.bounds)];
  for(const fit of [1,.85,.7,.55,.4]){const actual=z*fit,box=actual*1.2,dw=ratio>1?box:box*ratio,dh=ratio>1?box/ratio:box,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle)),rx=(dw*c+dh*s)/2,ry=(dw*s+dh*c)/2;
   const clamp=(px,py)=>({x:Math.max(rx+margin,Math.min(w-rx-margin,px)),y:Math.max(ry+margin,Math.min(h-ry-margin,py))});
   const candidates=[clamp(x,y),clamp(rx+margin,y),clamp(w-rx-margin,y),clamp(x,ry+margin),clamp(x,h-ry-margin)];for(const f of [.06,.16,.28,.4,.5,.6,.72,.84,.94]){candidates.push(clamp(rx+margin,h*f),clamp(w-rx-margin,h*f),clamp(w*f,ry+margin),clamp(w*f,h-ry-margin));}
   candidates.sort((a,b)=>(a.x-x)**2+(a.y-y)**2-((b.x-x)**2+(b.y-y)**2));
   for(const point of candidates){const bounds={x:point.x-rx,y:point.y-ry,w:rx*2,h:ry*2};if(blocked.some(rect=>intersects(bounds,rect)))continue;drawOccasionMotif(ctx,kind,point.x,point.y,actual,angle,{tint:a.decorColor});placements.push({kind,x:point.x,y:point.y,size:actual,angle,bounds});return;}
  }
 };
 ctx.save();ctx.globalAlpha=a.ornamentOpacity??1;
 for(const [fx,fy,index,scale=1,angle=0]of spots)place(motifs[index%4],w*fx,h*fy,size*scale,angle);
 // Background illustrations share the same content-safe foreground layer.
 if(['arches','ribbon'].includes(data.backgroundOrnaments)){ctx.globalAlpha=.16;const kind=data.backgroundOrnaments==='arches'?'flower':'bow';place(kind,w*.925,h*.1,u*.08,.12);place(kind,w*.075,h*.9,u*.08,-.12);ctx.globalAlpha=a.ornamentOpacity??1;}
 // Optional stars obey the same content and edge margins as the main illustrations.
 if(a.themeEffect==='sparkle'||a.themeEffect==='confetti')for(const [x,y]of[[.2,.045],[.8,.955]])place('star',w*x,h*y,size*.33);
 ctx.restore();return {drawn:placements.length,placements};
}

export const occasionArtDirections={"amizade": {"name": "Cartas entre amigos", "paper": "#fff7e8", "ink": "#423328", "accent": "#866039", "soft": "#efd7a2", "background": "postal", "material": "paper", "collections": ["Carta de domingo", "Encontros", "Pequenas histórias", "Por perto"], "border": 0}, "aniversario": {"name": "Festa de papel", "paper": "#fff4df", "ink": "#402c42", "accent": "#ad3c51", "soft": "#f4cc70", "background": "confetti", "material": "clay", "collections": ["Velas & desejos", "Volta ao sol", "Confete de papel", "Hoje é seu dia"], "border": 1}, "aniversario_namoro": {"name": "Nosso calendário", "paper": "#fff0ed", "ink": "#512a37", "accent": "#ad3e59", "soft": "#f2bdbe", "background": "ribbon", "material": "plum", "collections": ["Mais um capítulo", "Datas nossas", "Bilhetes de nós", "Tempo de amar"], "border": 2}, "mesversario": {"name": "Primeiros capítulos", "paper": "#f3f5ff", "ink": "#373859", "accent": "#66609a", "soft": "#ded8f1", "background": "dots", "material": "ivory", "collections": ["Pequenos começos", "Um mês de nós", "Nuvens de papel", "Dias de descoberta"], "border": 3}, "casamento": {"name": "Ateliê do sim", "paper": "#fffaf0", "ink": "#45362e", "accent": "#8d6347", "soft": "#ead6bd", "background": "frame", "material": "ivory", "collections": ["Jardim do sim", "Laços de seda", "Pérolas de papel", "Encontro marcado"], "border": 4}, "bodas": {"name": "Anos em dourado", "paper": "#fff7e5", "ink": "#4c3726", "accent": "#8e612a", "soft": "#e8cc8c", "background": "linen", "material": "cocoa", "collections": ["Alianças do tempo", "Promessas renovadas", "Raízes de nós", "Anos de ouro"], "border": 5}, "namorados": {"name": "Bilhetes de cereja", "paper": "#fff1ee", "ink": "#502637", "accent": "#a5354c", "soft": "#efbbc7", "background": "ribbon", "material": "plum", "collections": ["Cereja & afeto", "Correio do amor", "Meu lugar", "Laços de nós"], "border": 6}, "maes": {"name": "Herbário de carinho", "paper": "#fff5ee", "ink": "#512e39", "accent": "#a33e61", "soft": "#efc5d4", "background": "cotton", "material": "plum", "collections": ["Flores para você", "Abraço de casa", "Jardim de mãe", "Afeto em pétalas"], "border": 7}, "pais": {"name": "Oficina de memórias", "paper": "#f0f5f9", "ink": "#2c4050", "accent": "#356481", "soft": "#bfd5df", "background": "linen", "material": "midnight", "collections": ["Histórias de pai", "Linhas de afeto", "Nosso caminho", "Companheiro de vida"], "border": 8}, "avos": {"name": "Renda de histórias", "paper": "#fff7ea", "ink": "#4c3933", "accent": "#925843", "soft": "#e4c9a3", "background": "cotton", "material": "paper", "collections": ["Renda de lembranças", "Receitas de carinho", "Raízes da família", "Tempo de abraço"], "border": 9}, "natal": {"name": "Correio de dezembro", "paper": "#fff4e8", "ink": "#4d2925", "accent": "#b93635", "soft": "#f0c88b", "background": "stars", "material": "cocoa", "collections": ["Noite de presentes", "Cartas de dezembro", "Laços de Natal", "Estrelas em casa"], "border": 10}, "anonovo": {"name": "Meia-noite em papel", "paper": "#f7f5ff", "ink": "#34304d", "accent": "#655087", "soft": "#e4d1aa", "background": "stars", "material": "midnight", "collections": ["Brinde ao amanhã", "Céu de desejos", "Novos começos", "À meia-noite"], "border": 11}, "pascoa": {"name": "Jardim de doçuras", "paper": "#fff7e9", "ink": "#4b3549", "accent": "#85608d", "soft": "#ead4ab", "background": "dots", "material": "ivory", "collections": ["Ovos pintados", "Coelhos de papel", "Jardim doce", "Laços de chocolate"], "border": 12}, "formatura": {"name": "Arquivo de conquistas", "paper": "#f0f5fc", "ink": "#263b58", "accent": "#3d608d", "soft": "#ccd9eb", "background": "postal", "material": "midnight", "collections": ["O próximo capítulo", "Diploma de sonhos", "Horizontes", "Conquista em papel"], "border": 13}, "pedido_namoro": {"name": "Um convite para nós", "paper": "#fff0f4", "ink": "#4b2942", "accent": "#a0386d", "soft": "#e9bfd5", "background": "arches", "material": "plum", "collections": ["Quer escrever comigo?", "Primeiro sim", "Carta de intenção", "Começo de nós"], "border": 14}, "desculpas": {"name": "Uma nova página", "paper": "#f7f3ed", "ink": "#4a4035", "accent": "#79634f", "soft": "#dfd3bd", "background": "plain", "material": "paper", "collections": ["Palavras sinceras", "Ramo de paz", "Recomeço de papel", "Escuta & carinho"], "border": 15}, "pet": {"name": "Clube das patinhas", "paper": "#fff4e7", "ink": "#4c342b", "accent": "#995239", "soft": "#edc9a0", "background": "speckle", "material": "clay", "collections": ["Patinhas em casa", "Meu companheiro", "Pequenas aventuras", "Amor de quatro patas"], "border": 16}, "outro": {"name": "Ateliê de pequenos gestos", "paper": "#f2f7fa", "ink": "#33444d", "accent": "#4a6a7b", "soft": "#cbdfe5", "background": "frame", "material": "paper", "collections": ["Um gesto seu", "Papel de carinho", "Surpresas boas", "Só para você"], "border": 17}};
export function occasionDirection(data={}){return occasionArtDirections[typeof data==='string'?data:data.occasion]||occasionArtDirections.amizade;}
export function occasionTreatmentName(occasion,index){const p=occasionDirection(occasion);return p.collections[index%4]+' · '+['Cantos de papel','Dueto ilustrado','Postal','Coleção','Essencial'][Math.floor(index/4)%5];}
// Kept for existing portable runtime imports; themed paper uses illustration rather than an automatic border.
export function paintOccasionBorder(){}

// Real transparent illustrations, shared by the selector, canvas textures and offline gifts.
export const ornamentArtwork=Object.fromEntries('heart tree egg bunny ornament gift star flower rings bow letter balloon cake cap paw branch'.split(' ').map(id=>[id,'assets/ornaments/'+id+'.webp']));
const ornamentImages=new Map(),ornamentLoads=new Map();
export function ensureOrnamentArtwork(data={}){
 return Promise.all(Object.entries(ornamentArtwork).map(([id,path])=>{
  const src=data.storyAssets?.ornaments?.[path]||globalThis.__capimimoAssets?.[path]||path;
  if(!ornamentLoads.has(src))ornamentLoads.set(src,new Promise((resolve,reject)=>{const illustration=new Image();illustration.onload=()=>{ornamentImages.set(id,illustration);resolve(illustration);};illustration.onerror=()=>{ornamentLoads.delete(src);reject(Error('Ilustração indisponível: '+id));};illustration.src=src;}));
  return ornamentLoads.get(src);
 }));
}
function ornamentHue(hex){const [r,g,b]=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255),hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;if(!d)return 8;return ((hi===r?(g-b)/d:hi===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360;}
export function drawOccasionMotif(ctx,kind,x,y,size,angle=0,{tint}={}){
 const illustration=ornamentImages.get(kind);if(!illustration)return;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);
 // Keep the original painted shading; an explicitly chosen tone rotates color rather than replacing it with a flat fill.
 if(/^#[0-9a-f]{6}$/i.test(tint||''))ctx.filter='hue-rotate('+(ornamentHue(tint)-8)+'deg)';
 const ratio=illustration.width/illustration.height,box=size*1.2,dw=ratio>1?box:box*ratio,dh=ratio>1?box/ratio:box;
 ctx.drawImage(illustration,-dw/2,-dh/2,dw,dh);ctx.restore();
}

export const ornamentChoices={heart:'Coração',tree:'Árvore de Natal',egg:'Ovo pintado',bunny:'Coelhinho',ornament:'Bola de Natal',gift:'Presente',star:'Estrela',flower:'Flor',rings:'Alianças',bow:'Laço',letter:'Cartinha',balloon:'Balão',cake:'Bolo',cap:'Capelo',paw:'Patinha',branch:'Raminho'};

export function paintCustomBorder(ctx,w,h,palette={},a={}){if(a.borderStyle==='none')return;ctx.save();ctx.strokeStyle=a.borderColor||palette.accent||'#3a1e14';ctx.lineWidth=a.borderWidth||1.5;const m=18,r=a.borderStyle==='round'?Math.min(w,h)*.08:12;if(a.borderStyle==='dashed')ctx.setLineDash([8,6]);ctx.beginPath();ctx.roundRect(m,m,w-2*m,h-2*m,r);ctx.stroke();if(a.borderStyle==='double'){ctx.beginPath();ctx.roundRect(m+8,m+8,w-2*m-16,h-2*m-16,8);ctx.stroke();}if(a.borderStyle==='scallop'){ctx.setLineDash([]);for(const y of [m,h-m])for(let x=m+10;x<w-m;x+=20){ctx.beginPath();ctx.arc(x,y,7,0,Math.PI);ctx.stroke();}}ctx.restore();}

export function paintPhotoMount(ctx,x,y,w,h,data={},palette={}){const a=data.appearance||{},style=a.photoFrame||'paper',paper=style==='film'?'#29242a':a.matColor||'#fffdf8',ink=a.matBorder||palette.ink||'#3a1e14',radius=style==='round'?Math.min(w,h)*.1:style==='ink'?2:12;ctx.save();if(style!=='none'){ctx.fillStyle=palette.ink||'#3a1e14';ctx.globalAlpha=.12;ctx.beginPath();ctx.roundRect(x+3,y+4,w,h,radius);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle=paper;ctx.strokeStyle=ink;ctx.lineWidth=style==='ink'?3:1.4;ctx.beginPath();ctx.roundRect(x,y,w,h,radius);ctx.fill();ctx.stroke();if(style==='film'){ctx.fillStyle='#fff9f1';for(let px=x+8;px<x+w-6;px+=20)for(const py of [y+3,y+h-7])ctx.fillRect(px,py,7,4);}}ctx.restore();return{paper:style==='none'?palette.paper||'#fff9f1':paper,ink:readableDecorInk(style==='none'?palette.paper||'#fff9f1':paper),radius:style==='round'?Math.min(w,h)*.07:0};}

export function readableDecorInk(color){const light=hex=>{const v=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722;},l=light(color),ratio=ink=>(Math.max(l,light(ink))+.05)/(Math.min(l,light(ink))+.05);if(ratio('#3a1e14')>=4.5)return '#3a1e14';if(ratio('#fffdf8')>=4.5)return '#fffdf8';return '#000000';}
export function labelColors(data={},fallback='#fff0c5'){const paper=data.appearance?.labelColor||fallback;return{paper,ink:readableDecorInk(paper)};}
