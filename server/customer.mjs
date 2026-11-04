import {brandedEmail} from './email-template.mjs';
import {emailAttachments} from './email-assets.mjs';
const COOKIE='__Host-capimimo_customer',SESSION_SECONDS=30*86400,CODE_SECONDS=600;
const enc=new TextEncoder(),hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const random=(bytes=32)=>hex(crypto.getRandomValues(new Uint8Array(bytes)));
const digest=async text=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(text))));
const canonical=env=>new URL(env.SITE_CANONICAL_ORIGIN||env.SITE_ORIGIN).origin;
const cookieToken=request=>(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
const cookie=(token,age=SESSION_SECONDS)=>`${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff',...headers}});
class CustomerError extends Error{constructor(status,message){super(message);this.status=status;}}
export function customerWriteAllowed(request,env){return new URL(request.url).origin===canonical(env)&&request.headers.get('origin')===canonical(env)&&request.headers.get('sec-fetch-site')!=='cross-site';}
export async function customerSession(request,env,now=Math.floor(Date.now()/1000)){
 if(new URL(request.url).origin!==canonical(env)||!env.BILLING_DB)return null;
 const token=cookieToken(request);if(!/^[a-f0-9]{64}$/.test(token))return null;
 return env.BILLING_DB.prepare('SELECT u.id,u.email_normalized AS email FROM customer_sessions s JOIN customer_users u ON u.id=s.customer_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').bind(await digest(token),now).first();
}
function emailOf(value){const email=typeof value==='string'?value.trim().toLowerCase():'';if(email.length>254||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new CustomerError(422,'Confira seu e-mail.');return email;}
async function codeHmac(secret,id,code){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(id+':'+code))));}
function code(){let n;do{n=crypto.getRandomValues(new Uint32Array(1))[0];}while(n>=4200000000);return String(n%100000000).padStart(8,'0');}
async function input(request){if(!request.headers.get('content-type')?.startsWith('application/json'))throw new CustomerError(415,'Envie os dados do formulário.');const reader=request.body?.getReader();if(!reader)throw new CustomerError(400,'Confira os dados.');let text='',size=0;const decoder=new TextDecoder();try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>4096){await reader.cancel();throw new CustomerError(413,'Dados muito grandes.');}text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}try{const data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data;}catch{throw new CustomerError(400,'Confira os dados.');}}
function orderView(row,origin,now){const expiresAt=row.approved_at?row.approved_at+365*86400:null;return{accountLinked:!!row.customer_id,id:row.id,draftId:row.draft_id,planId:row.plan_id,mode:row.mode,status:row.status,sessionAuth:true,isAdmin:false,requestedFormat:row.requested_format||null,amountCents:row.amount_cents,expiresAt,expired:expiresAt!==null&&expiresAt<=now,checkoutUrl:row.status==='pending'?row.checkout_url:null,createdAt:row.created_at*1000,delivery:row.delivery_public_id?{id:row.delivery_public_id,url:origin+'/g/'+row.delivery_public_id,revision:row.delivery_revision,expiresAt:row.delivery_expires_at}:null};}
export function createCustomerAPI(env,{now=()=>Math.floor(Date.now()/1000)}={}){
 const db=env.BILLING_DB,origin=canonical(env),q=(sql,...args)=>db.prepare(sql).bind(...args),first=(sql,...args)=>q(sql,...args).first(),run=(sql,...args)=>q(sql,...args).run();
 async function limit(identity,bucket,max,seconds){const key=await digest(bucket+':'+identity+':'+Math.floor(now()/seconds));await run('INSERT INTO customer_rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',key,now()+seconds*2);if((await first('SELECT count FROM customer_rate_limits WHERE key=?',key)).count>max)throw new CustomerError(429,'Muitas tentativas. Aguarde antes de tentar novamente.');}
 const joined='SELECT p.*,d.public_id AS delivery_public_id,d.revision AS delivery_revision,d.expires_at AS delivery_expires_at FROM purchases p LEFT JOIN deliveries d ON d.purchase_id=p.id';
 async function dispatch(request){
  const {pathname:path,origin:requestOrigin}=new URL(request.url),method=request.method;
  if(requestOrigin!==origin)throw new CustomerError(403,'Entre pelo domínio principal do Capimimo.');
  if(method!=='GET'&&!customerWriteAllowed(request,env))throw new CustomerError(403,'Origem não autorizada.');
  if(!db)throw new CustomerError(503,'A conta está temporariamente indisponível.');
  if(path==='/api/customer/request-code'&&method==='POST'){
   if(!env.EMAIL||typeof env.CUSTOMER_AUTH_SECRET!=='string'||env.CUSTOMER_AUTH_SECRET.length<32)throw new CustomerError(503,'O acesso por e-mail está temporariamente indisponível.');
   const email=emailOf((await input(request)).email),ip=request.headers.get('cf-connecting-ip')||'local';
   await limit(ip,'send-ip',20,3600);await limit(email,'send-email',5,3600);
   const challengeId=random(),otp=code(),inserted=await run('INSERT INTO customer_challenges(id,email_normalized,code_hmac,created_at,expires_at) SELECT ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM customer_challenges WHERE email_normalized=? AND created_at>?)',challengeId,email,await codeHmac(env.CUSTOMER_AUTH_SECRET,challengeId,otp),now(),now()+CODE_SECONDS,email,now()-60);if(!inserted.meta?.changes)throw new CustomerError(429,'Aguarde um minuto antes de pedir outro código.');
   try{const result=await env.EMAIL.send({from:{email:'avisos@capimimo.com.br',name:'Capimimo'},to:email,subject:'Seu código para entrar no Capimimo',...brandedEmail({name:'',title:'Seu código de acesso.',message:`Seu código é ${otp}. Ele vale por 10 minutos. Digite no Capimimo para entrar na sua conta.`,note:'Não compartilhe este código. Se você não pediu acesso, ignore esta mensagem.',button:'Abrir o Capimimo',url:'https://capimimo.com.br/'}),attachments:emailAttachments});if(!result?.messageId)throw Error();}catch{await run('UPDATE customer_challenges SET consumed_at=? WHERE id=?',now(),challengeId);throw new CustomerError(503,'Não foi possível enviar o código agora. Tente novamente em um minuto.');}
   await run('DELETE FROM customer_challenges WHERE expires_at<?',now()-86400);await run('DELETE FROM customer_rate_limits WHERE expires_at<?',now());
   return json({challengeId,expiresIn:CODE_SECONDS},202);
  }
  if(path==='/api/customer/verify-code'&&method==='POST'){
   if(typeof env.CUSTOMER_AUTH_SECRET!=='string'||env.CUSTOMER_AUTH_SECRET.length<32)throw new CustomerError(503,'O acesso por e-mail está temporariamente indisponível.');
   await limit(request.headers.get('cf-connecting-ip')||'local','verify-ip',50,900);const data=await input(request),id=data.challengeId;
   if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id)||typeof data.code!=='string'||!/^\d{8}$/.test(data.code))throw new CustomerError(400,'Código inválido ou expirado. Peça um novo código.');
   const row=await q('UPDATE customer_challenges SET attempts=attempts+1 WHERE id=? AND consumed_at IS NULL AND expires_at>? AND attempts<5 RETURNING *',id,now()).first();
   if(!row||row.code_hmac!==await codeHmac(env.CUSTOMER_AUTH_SECRET,id,data.code))throw new CustomerError(400,'Código inválido ou expirado. Peça um novo código.');
   const used=await run('UPDATE customer_challenges SET consumed_at=? WHERE id=? AND consumed_at IS NULL AND expires_at>?',now(),id,now());if(!used.meta?.changes)throw new CustomerError(400,'Código inválido ou expirado. Peça um novo código.');
   await run('INSERT OR IGNORE INTO customer_users(id,email_normalized,verified_at,created_at) VALUES(?,?,?,?)',random(16),row.email_normalized,now(),now());const user=await first('SELECT * FROM customer_users WHERE email_normalized=?',row.email_normalized);if(!user?.active)throw new CustomerError(403,'Esta conta está indisponível. Fale com o atendimento.');
   const old=cookieToken(request);if(/^[a-f0-9]{64}$/.test(old))await run('DELETE FROM customer_sessions WHERE token_hash=?',await digest(old));
   const token=random();await run('INSERT INTO customer_sessions(token_hash,customer_id,created_at,expires_at) VALUES(?,?,?,?)',await digest(token),user.id,now(),now()+SESSION_SECONDS);await run('DELETE FROM customer_sessions WHERE expires_at<=?',now());
   return json({authenticated:true,email:user.email_normalized},200,{'Set-Cookie':cookie(token)});
  }
  if(path==='/api/customer/logout'&&method==='POST'){const token=cookieToken(request);if(/^[a-f0-9]{64}$/.test(token))await run('DELETE FROM customer_sessions WHERE token_hash=?',await digest(token));return json({authenticated:false},200,{'Set-Cookie':cookie('',0)});}
  const user=await customerSession(request,env,now());
  if(path==='/api/customer/session'&&method==='GET')return json(user?{authenticated:true,email:user.email}:{authenticated:false});
  if(!user)throw new CustomerError(401,'Entre na sua conta para continuar.');
  if(path==='/api/customer/orders'&&method==='GET'){const rows=(await q(joined+" WHERE p.customer_id=? AND p.grant_source<>'admin' ORDER BY p.created_at DESC LIMIT 200",user.id).all()).results;return json({orders:rows.map(row=>orderView(row,origin,now()))});}
  const match=path.match(/^\/api\/customer\/orders\/([a-f0-9]{32})\/claim$/);
  if(match&&method==='POST'){
   await limit(user.id,'claim',60,3600);const token=request.headers.get('authorization')?.replace(/^Bearer /i,'');if(!/^[a-f0-9]{64}$/.test(token||''))throw new CustomerError(401,'O arquivo de acesso desta compra é necessário.');
   const hash=await digest(token),row=await first('SELECT * FROM purchases WHERE id=? AND access_hash=?',match[1],hash);if(!row||row.grant_source==='admin')throw new CustomerError(404,'Compra não encontrada neste acesso.');
   const result=await run("UPDATE purchases SET customer_id=? WHERE id=? AND access_hash=? AND grant_source<>'admin' AND (customer_id IS NULL OR customer_id=?)",user.id,row.id,hash,user.id);if(!result.meta?.changes)throw new CustomerError(409,'Esta compra já está vinculada a outra conta.');
   return json({order:orderView(await first(joined+' WHERE p.id=?',row.id),origin,now())});
  }
  throw new CustomerError(404,'Ação não encontrada.');
 }
 return async request=>{try{return await dispatch(request);}catch(e){return json({error:e instanceof CustomerError?e.message:'Não foi possível concluir agora. Tente novamente.'},e instanceof CustomerError?e.status:503);}};
}
