const readData=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
export const mediaSize=bytes=>bytes<1024*1024?Math.round(bytes/1024)+' KB':(bytes/1024/1024).toFixed(1)+' MB';
export async function compressPhoto(blob,{maxEdge=1600,targetBytes=220*1024}={}){
 const bitmap=await createImageBitmap(blob),canvas=document.createElement('canvas');
 try{let scale=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height)),quality=.84,encoded;
  for(let attempt=0;attempt<5;attempt++){canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);encoded=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Não foi possível preparar a foto.')),'image/webp',quality));if(encoded.size<=targetBytes||Math.max(canvas.width,canvas.height)<=900)break;if(quality>.67)quality-=.1;else scale*=.84;}
  return{blob:encoded,src:await readData(encoded),originalBytes:blob.size,bytes:encoded.size,width:canvas.width,height:canvas.height,type:encoded.type};
 }finally{bitmap.close();canvas.width=canvas.height=1;}
}
const photoCache=new Map();
async function optimizedSource(src){if(!src||/^data:image\/webp[;,]/.test(src)||/\.webp(?:[?#]|$)/i.test(src))return src;if(!photoCache.has(src)){const promise=(async()=>{const response=await fetch(src);if(!response.ok)throw Error('Foto indisponível.');return(await compressPhoto(await response.blob())).src;})();photoCache.set(src,promise);if(photoCache.size>30)photoCache.delete(photoCache.keys().next().value);}try{return await photoCache.get(src);}catch(e){photoCache.delete(src);throw e;}}
export async function compressGiftPhotos(data){return{...data,photo:await optimizedSource(data.photo),coverPhoto:await optimizedSource(data.coverPhoto),photos:await Promise.all((data.photos||[]).map(async p=>({...p,src:await optimizedSource(p.src)}))),pages:await Promise.all((data.pages||[]).map(async p=>({...p,photo:await optimizedSource(p.photo)})))};}
export async function compressAudio(blob,kind='music',{onProgress=()=>{}}={}){
 if(!blob||blob.size<48000)return{blob,changed:false};let input,output;
 try{const {Input,BlobSource,ALL_FORMATS,Output,Mp4OutputFormat,WebMOutputFormat,BufferTarget,Conversion,Quality,canEncodeAudio}=await import('./assets/vendor/mediabunny.min.mjs');
  const channels=kind==='voice'?1:2,quality=new Quality({bitrate:kind==='voice'?64000:96000}),aac=await canEncodeAudio('aac',{numberOfChannels:channels,sampleRate:48000,quality}),opus=!aac&&await canEncodeAudio('opus',{numberOfChannels:channels,sampleRate:48000,quality});if(!aac&&!opus)return{blob,changed:false,reason:'encoder-unavailable'};
  input=new Input({source:new BlobSource(blob),formats:ALL_FORMATS});output=new Output({format:aac?new Mp4OutputFormat({fastStart:'in-memory'}):new WebMOutputFormat(),target:new BufferTarget()});const conversion=await Conversion.init({input,output,video:{discard:true},audio:{codec:aac?'aac':'opus',quality,numberOfChannels:channels,sampleRate:48000,forceTranscode:true}});
  if(!conversion.isValid||conversion.discardedTracks.some(t=>t.track?.type==='audio'))return{blob,changed:false,reason:'conversion-unavailable: '+conversion.discardedTracks.map(t=>t.reason).join(',')};conversion.onProgress=onProgress;await conversion.execute();const compressed=new Blob([output.target.buffer],{type:aac?'audio/mp4':'audio/webm'});return compressed.size&&compressed.size<blob.size*.9?{blob:compressed,changed:true,originalBytes:blob.size,bytes:compressed.size}:{blob,changed:false,reason:'already-small'};
 }catch(error){return{blob,changed:false,reason:String(error?.message||'conversion-error')};}finally{input?.dispose();}
}
