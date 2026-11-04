import {AI_DAILY_CALL_LIMIT} from './ai-limits.mjs';
import {customerSession,customerWriteAllowed} from './customer.mjs';
import {adminSession,digest} from './admin.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
class WritingError extends Error{constructor(status,message){super(message);this.status=status;}}
async function readInput(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new WritingError(415,'Confira os dados enviados.');const reader=request.body?.getReader();if(!reader)throw new WritingError(400,'Confira os dados enviados.');let size=0,parts=[];try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>4096){await reader.cancel();throw new WritingError(413,'Os dados enviados são muito grandes.');}parts.push(part.value);}}finally{reader.releaseLock();}try{const raw=new Uint8Array(size);let i=0;for(const part of parts){raw.set(part,i);i+=part.length;}const data=JSON.parse(new TextDecoder().decode(raw));if(!data||Array.isArray(data)||typeof data!=='object')throw Error();return data;}catch{throw new WritingError(400,'Confira os dados enviados.');}
}
// A rota exige acesso à compra e autorização explícita para enviar dados ao modelo.
export function createWritingAPI(env,{now=()=>Math.floor(Date.now()/1000),generate=null}={}){
 const db=env.BILLING_DB,origin=new URL(env.SITE_CANONICAL_ORIGIN||env.SITE_ORIGIN).origin;
 const q=(sql,...args)=>db.prepare(sql).bind(...args),first=(sql,...args)=>q(sql,...args).first();
 async function limit(identity,bucket,max,seconds){const key=await digest('ai-writing:'+bucket+':'+identity+':'+Math.floor(now()/seconds));const row=await first('INSERT INTO billing_rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',key,now()+seconds*2);if(row.count>max)throw new WritingError(429,'Limite de sugestões atingido. Tente novamente mais tarde.');}
 async function dispatch(request){
  const url=new URL(request.url);if(url.origin!==origin||!customerWriteAllowed(request,env))throw new WritingError(403,'Origem não autorizada.');
  if(request.method!=='POST'||url.pathname!=='/api/writing/suggest')throw new WritingError(404,'Ação não encontrada.');
  if(env.AI_WRITING_ENABLED!=='true'||typeof generate!=='function'||!db)throw new WritingError(503,'Sugestões com IA ainda não estão disponíveis.');
  const data=await readInput(request);if(typeof data.purchaseId!=='string'||!/^[a-f0-9]{32}$/.test(data.purchaseId)||typeof data.draftId!=='string'||data.draftId.length>64||data.consent!==true)throw new WritingError(422,'Confira a compra e autorize o envio para gerar a sugestão.');
  const purchase=await first('SELECT id,draft_id,customer_id,access_hash,approved_at,status,grant_source,admin_id FROM purchases WHERE id=?',data.purchaseId),customer=await customerSession(request,env,now()),admin=await adminSession(request,env,now());
  const bearer=request.headers.get('authorization')?.replace(/^Bearer /i,'')||'',keyValid=/^[a-f0-9]{64}$/.test(bearer)&&purchase?.access_hash===await digest(bearer);const owned=purchase&&(purchase.grant_source==='admin'?admin&&admin.id===purchase.admin_id:(customer&&customer.id===purchase.customer_id)||keyValid);
  if(!owned||purchase.draft_id!==data.draftId)throw new WritingError(404,'Compra não encontrada neste acesso.');
  if(purchase.status!=='approved'||!purchase.approved_at||purchase.approved_at+365*86400<=now())throw new WritingError(403,'Esta compra não está disponível para criar sugestões.');
  await limit(purchase.id,'purchase',30,86400);await limit(request.headers.get('cf-connecting-ip')||'local','ip',60,3600);
  const globalKey=await digest('public-help:global:all:'+Math.floor(now()/86400));const quota=await first('INSERT INTO billing_rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',globalKey,now()+172800);if(quota.count>AI_DAILY_CALL_LIMIT)throw new WritingError(429,'O limite diário de IA foi atingido. Tente novamente amanhã.');
  let text;try{text=await generate({consent:data.consent,theme:data.theme,tone:data.tone,format:data.format,target:data.target,nickname:data.nickname,detail:data.detail});}catch{throw new WritingError(503,'Não foi possível gerar agora. Confira as opções e tente novamente.');}
  return json({suggestion:text});
 }
 return async request=>{try{return await dispatch(request);}catch(error){return json({error:error instanceof WritingError?error.message:'Sugestões indisponíveis. Tente novamente.'},error instanceof WritingError?error.status:503);}};
}
