// One atlas: 10 columns × 6 rows, 320px cells. 60 unique frames, 30 FPS.
export function initHeroMotion(){
 const poster=document.querySelector('.capy-hero-scene'),mount=poster.parentElement,photos=[...mount.querySelectorAll('.hero-polaroid')];
 const canvas=document.createElement('canvas');canvas.width=1152;canvas.height=768;canvas.className='capy-hero-scene hero-sprite-canvas';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;poster.after(canvas);
 const ctx=canvas.getContext('2d'),atlas=new Image(),environment=new Image(),envelope=new Image(),petal=new Image();
 let loaded=false,visible=false,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,raf=0,elapsed=0,anchor=null,last=-1;
 const metrics={frames:60,fps:30,frame:0,state:'poster',draws:0,timestamps:[],atlas:{columns:10,rows:6,cell:320}};window.__heroAnimation=metrics;
 const button=document.createElement('button');button.type='button';button.className='hero-sprite-toggle';mount.append(button);
 function label(){button.textContent=paused?'Reproduzir animação':'Pausar animação';button.setAttribute('aria-pressed',String(paused));}
 function paint(frame,time=0){ctx.clearRect(0,0,1152,768);ctx.save();ctx.scale(1.5,1.5);ctx.drawImage(environment,0,0,768,512);const phase=frame/60*Math.PI*2;
  function part(img,x,y,w,h,rotation){ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(rotation);ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();}
  part(envelope,498,209+Math.sin(phase+.6)*5,250,200,Math.sin(phase)*.022);
  ctx.drawImage(atlas,(frame%10)*320,Math.floor(frame/10)*320,320,320,270,115,320,320);
  for(let n=0;n<3;n++){const a=phase+n*2.1;ctx.globalAlpha=.55+.2*Math.sin(a);part(petal,210+n*75+Math.sin(a)*8,124+n*53+Math.cos(a)*13,18+n*3,18+n*3,Math.sin(a)*.5);}ctx.globalAlpha=1;
  ctx.strokeStyle='#824126';ctx.lineWidth=7;ctx.lineCap='round';ctx.globalAlpha=.65+.3*Math.sin(phase)**2;for(const [x,y,dx,dy] of [[519,142,6,-17],[538,154,13,-13],[548,171,17,-4]]){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y+dy);ctx.stroke();}ctx.restore();
  photos.forEach((photo,i)=>{const p=paused?1:Math.max(0,Math.min(1,(time-220-i*190)/550)),ease=1-(1-p)**3,bob=paused?0:Math.sin(time/1600+i*2)*3;photo.style.opacity=String(ease);photo.style.transform=`translateY(${(1-ease)*22+bob}px) rotate(${[-11,9,-7][i]}deg) scale(${.94+ease*.06})`;});
  last=frame;metrics.frame=frame;metrics.draws++;canvas.dataset.frame=String(frame);
 }
 const covered=()=>!!document.querySelector('dialog[open]');
 function stop(){cancelAnimationFrame(raf);raf=0;anchor=null;metrics.state=paused?'paused':'offscreen';}
 function tick(time){raf=0;if(!visible||paused||document.hidden||covered())return stop();if(anchor===null)anchor=time;elapsed+=Math.min(100,time-anchor);anchor=time;const frame=Math.floor(elapsed*30/1000)%60;if(frame!==last){paint(frame,elapsed);metrics.timestamps.push(time);if(metrics.timestamps.length>120)metrics.timestamps.shift();}metrics.state='playing';raf=requestAnimationFrame(tick);}
 function play(){label();if(!loaded)return;if(!visible||paused||document.hidden||covered()){if(paused)photos.forEach(photo=>{photo.style.opacity='1';});stop();return;}if(!raf)raf=requestAnimationFrame(tick);}
 function pause(value){paused=!!value;play();}
 button.addEventListener('click',()=>pause(!paused));label();
 atlas.src='assets/hero-motion-60.webp';environment.src='assets/hero-motion-environment.webp';envelope.src='assets/hero-motion-envelope.webp';petal.src='assets/hero-motion-petal.webp';
 Promise.all([atlas,environment,envelope,petal].map(item=>item.decode())).then(()=>{if(atlas.naturalWidth!==3200||atlas.naturalHeight!==1920)throw Error('Unexpected sprite geometry');loaded=true;paint(0);canvas.hidden=false;poster.hidden=true;play();}).catch(()=>{metrics.state='fallback';button.hidden=true;photos.forEach(photo=>{photo.style.opacity='1';});});
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;play();},{threshold:.08}).observe(mount);document.addEventListener('visibilitychange',play);new MutationObserver(play).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>pause(event.matches));
 return {pause};
}
