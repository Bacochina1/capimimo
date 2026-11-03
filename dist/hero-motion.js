// A real 60-frame atlas. Motion stops off-screen and when the visitor pauses it.
export function initHeroMotion(){
 const image=document.querySelector('.hero-image'),mount=image.parentElement;
 const canvas=document.createElement('canvas');canvas.width=1152;canvas.height=768;canvas.className='hero-motion';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;image.after(canvas);
 const ctx=canvas.getContext('2d'),atlas=new Image(),environment=new Image(),envelope=new Image(),petal=new Image();let loaded=false,loading=false,visible=false,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,raf=0,start=null,last=-1;
 const metrics={frames:60,fps:30,frame:0,state:'poster',draws:0};window.__heroAnimation=metrics;
 const button=document.createElement('button');button.className='hero-motion-toggle';mount.append(button);
 function label(){button.textContent=paused?'Reproduzir animação':'Pausar animação';button.setAttribute('aria-pressed',String(paused));}
 function draw(frame){if(frame===last)return;ctx.clearRect(0,0,1152,768);ctx.save();ctx.scale(1.5,1.5);ctx.drawImage(environment,0,0,768,512);const phase=frame/60*Math.PI*2;
  function part(img,x,y,w,h,rotation){ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(rotation);ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();}
  part(envelope,498,209+Math.sin(phase+.6)*5,250,200,Math.sin(phase)*.022);
  ctx.drawImage(atlas,frame%10*320,Math.floor(frame/10)*320,320,320,270,115,320,320);
  for(let n=0;n<3;n++){const a=phase+n*2.1;ctx.globalAlpha=.55+.2*Math.sin(a);part(petal,210+n*75+Math.sin(a)*8,124+n*53+Math.cos(a)*13,18+n*3,18+n*3,Math.sin(a)*.5);}ctx.globalAlpha=1;
  ctx.strokeStyle='#824126';ctx.lineWidth=7;ctx.lineCap='round';ctx.globalAlpha=.65+.3*Math.sin(phase)**2;for(const [x,y,dx,dy] of [[519,142,6,-17],[538,154,13,-13],[548,171,17,-4]]){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y+dy);ctx.stroke();}ctx.restore();
  last=frame;metrics.frame=frame;metrics.draws++;canvas.dataset.frame=String(frame);}
 function stop(){cancelAnimationFrame(raf);raf=0;start=null;metrics.state=paused?'paused':'offscreen';}
 const covered=()=>!!document.querySelector('dialog[open]');
 function tick(t){raf=0;if(!visible||paused||document.hidden||covered())return stop();if(start===null)start=t-last*1000/30;draw(Math.floor((t-start)*30/1000)%60);metrics.state='playing';raf=requestAnimationFrame(tick);}
 async function play(){label();if(!visible||paused||document.hidden||covered())return stop();if(!loaded){if(loading)return;loading=true;try{atlas.src='assets/hero-motion-60.webp';environment.src='assets/hero-motion-environment.webp';envelope.src='assets/hero-motion-envelope.webp';petal.src='assets/hero-motion-petal.webp';await Promise.all([atlas,environment,envelope,petal].map(i=>i.decode()));loaded=true;canvas.hidden=false;image.classList.add('motion-ready');draw(0);}catch{metrics.state='fallback';button.hidden=true;return;}finally{loading=false;}}
  if(!raf&&visible&&!paused&&!document.hidden&&!covered())raf=requestAnimationFrame(tick);
 }
 function setPaused(value){paused=value;label();if(paused)stop();else play();}
 button.addEventListener('click',()=>setPaused(!paused));label();
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;play();},{threshold:.08});observer.observe(mount);
 document.addEventListener('visibilitychange',play);
 new MutationObserver(play).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>setPaused(e.matches));
 return {pause:setPaused};
}
