import {runAiDemo} from './ai-demo.mjs';
import {brandedEmail} from './email-template.mjs';
import {emailAttachments} from './email-assets.mjs';
const COOKIE='__Host-capimimo_admin',LIFETIME=8*3600,ITERATIONS=100000;
const enc=new TextEncoder();
export const randomHex=(n=32)=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>b.toString(16).padStart(2,'0')).join('');
export async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
function bytes(hex){return Uint8Array.from(hex.match(/../g)||[],b=>parseInt(b,16));}
function equal(a,b){let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a[i]||0)^(b[i]||0);return diff===0;}
export async function hashAdminPassword(password,salt=randomHex(16)){
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 const value=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(salt),iterations:ITERATIONS},key,256));
 return ['pbkdf2-sha256',ITERATIONS,salt,Array.from(value,b=>b.toString(16).padStart(2,'0')).join('')].join('$');
}
async function verify(password,stored){
 const valid=/^pbkdf2-sha256\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(stored||'');
 const target=valid?stored:'pbkdf2-sha256$100000$'+'0'.repeat(32)+'$'+'0'.repeat(64);
 const actual=await hashAdminPassword(password,target.split('$')[2]);
 return equal(enc.encode(actual),enc.encode(target))&&valid;
}
const tokenOf=request=>(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
const cookie=(token,max=LIFETIME)=>`${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${max}`;
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer',...headers}});
export async function adminSession(request,env,now=Math.floor(Date.now()/1000)){
 const token=tokenOf(request);if(!/^[a-f0-9]{64}$/.test(token)||!env.BILLING_DB)return null;
 return await env.BILLING_DB.prepare('SELECT u.id,u.username FROM admin_sessions s JOIN admin_users u ON u.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').bind(await digest(token),now).first();
}
class AdminError extends Error{constructor(status,message){super(message);this.status=status;}}
async function input(request){if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AdminError(415,'Envie os dados do formulário.');const reader=request.body?.getReader();if(!reader)throw new AdminError(400,'Dados incompletos.');let size=0,parts=[];try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>4096){await reader.cancel();throw new AdminError(413,'Dados muito grandes.');}parts.push(item.value);}}finally{reader.releaseLock();}try{const buffer=new Uint8Array(size);let offset=0;for(const part of parts){buffer.set(part,offset);offset+=part.length;}const data=JSON.parse(new TextDecoder().decode(buffer));if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data;}catch{throw new AdminError(400,'Confira os dados do formulário.');}}
export function createAdminAPI(env,{now=()=>Math.floor(Date.now()/1000)}={}){
 const db=env.BILLING_DB,origin=new URL(env.SITE_ORIGIN).origin;
 const query=(sql,...args)=>db.prepare(sql).bind(...args),first=(sql,...args)=>query(sql,...args).first(),run=(sql,...args)=>query(sql,...args).run();
 async function limit(request,bucket,max,seconds=900){const key=await digest((request.headers.get('cf-connecting-ip')||'local')+':'+bucket+':'+Math.floor(now()/seconds));await run('INSERT INTO admin_rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',key,now()+seconds*2);if((await first('SELECT count FROM admin_rate_limits WHERE key=?',key)).count>max)throw new AdminError(429,'Muitas tentativas. Aguarde alguns minutos e tente novamente.');}
 async function session(user){const token=randomHex();await run('INSERT INTO admin_sessions(token_hash,admin_id,created_at,expires_at) VALUES(?,?,?,?)',await digest(token),user.id,now(),now()+LIFETIME);await run('DELETE FROM admin_sessions WHERE expires_at<=?',now());return token;}
 async function dispatch(request){
  const url=new URL(request.url),path=url.pathname,method=request.method;
  if(url.origin!==origin)throw new AdminError(403,'Entre pelo domínio principal do Capimimo.');
  if(method!=='GET'&&(request.headers.get('origin')!==origin||request.headers.get('sec-fetch-site')==='cross-site'))throw new AdminError(403,'Origem não autorizada.');
  if(!db)throw new AdminError(503,'O acesso administrativo ainda não está disponível.');
  if(path==='/api/admin/login'&&method==='POST'){
   await limit(request,'login',8);const data=await input(request),username=typeof data.username==='string'?data.username.trim().toLowerCase():'',password=typeof data.password==='string'?data.password:'';
   const user=/^[a-z0-9._-]{3,64}$/.test(username)?await first('SELECT * FROM admin_users WHERE username=? AND active=1',username):null;
   const correct=await verify(password.slice(0,128),user?.password_hash);if(!user||!correct||password.length>128)throw new AdminError(401,'Usuário ou senha incorretos.');
   const old=tokenOf(request);if(old)await run('DELETE FROM admin_sessions WHERE token_hash=?',await digest(old));
   return json({authenticated:true,username:user.username},200,{'Set-Cookie':cookie(await session(user))});
  }
  if(path==='/api/admin/logout'&&method==='POST'){const token=tokenOf(request);if(token)await run('DELETE FROM admin_sessions WHERE token_hash=?',await digest(token));return json({authenticated:false},200,{'Set-Cookie':cookie('',0)});}
  const user=await adminSession(request,env,now());
  if(path==='/api/admin/session'&&method==='GET')return json(user?{authenticated:true,username:user.username}:{authenticated:false});
  if(!user)throw new AdminError(401,'Entre na conta de administrador para continuar.');
  if(path==='/api/admin/ai-demo'&&method==='POST'){const data=await input(request);if(!['preco','acesso','aniversario','namoro','familia','texto_aniversario','texto_namoro','texto_familia','texto_casamento','texto_convite_casamento','texto_natal','texto_pascoa','texto_maes','texto_pais'].includes(data.selection))throw new AdminError(400,'Selecione um teste disponível.');await limit(request,'ai-demo',20,3600);try{return json({answer:await runAiDemo(data.selection,env.NVIDIA_API_KEY,fetch,{tone:data.tone,format:data.format,target:data.target})});}catch(error){const category=Number.isInteger(error.providerStatus)?'HTTP '+error.providerStatus:error.name==='AbortError'?'tempo esgotado':'falha de conexão';throw new AdminError(503,'IA de teste indisponível ('+category+'). Tente novamente mais tarde.');}}
  if(path==='/api/admin/email-test'&&method==='POST'){
   await limit(request,'email-test',3,3600);if(!env.EMAIL)throw new AdminError(503,'Envio de e-mail indisponível.');
   const result=await env.EMAIL.send({from:{email:'avisos@capimimo.com.br',name:'Capimimo'},to:'bacochinakawai2@gmail.com',replyTo:'bacochinakawai@gmail.com',subject:'Confirmação de envio do Capimimo',...brandedEmail({name:'Matheus',title:'Seu Capimimo está conectado.',message:'Este teste verifica o envio pelo próprio aplicativo, com a identidade visual do Capimimo.',note:'Mensagem de teste administrativo. Não representa compra, cobrança ou confirmação de pagamento.'}),attachments:emailAttachments});
   return json({ok:!!result?.messageId});
  }
  if(path==='/api/admin/password'&&method==='POST'){
   await limit(request,'password',8);const data=await input(request),password=data.newPassword;
   if(typeof password!=='string'||password.length<16||password.length>128)throw new AdminError(422,'Use uma senha ou frase de 16 a 128 caracteres.');
   const row=await first('SELECT password_hash FROM admin_users WHERE id=?',user.id);if(typeof data.currentPassword!=='string'||data.currentPassword.length>128||!await verify(data.currentPassword,row.password_hash))throw new AdminError(401,'A senha atual está incorreta.');
   await db.batch([query('UPDATE admin_users SET password_hash=?,password_changed_at=? WHERE id=?',await hashAdminPassword(password),now(),user.id),query('DELETE FROM admin_sessions WHERE admin_id=?',user.id)]);
   return json({ok:true},200,{'Set-Cookie':cookie(await session(user))});
  }
  if(path==='/api/admin/sales'&&method==='GET'){
   const pageText=url.searchParams.get('page')||'1',filter=url.searchParams.get('status')||'all';if(!/^[1-9]\d{0,3}$/.test(pageText)||!['all','approved','pending','failed','revoked'].includes(filter))throw new AdminError(422,'Filtro de vendas inválido.');
   const page=Number(pageText),size=50,where="p.mode='live' AND p.grant_source='payment'",statusFilter=filter==='all'?'':' AND p.status=?',args=filter==='all'?[]:[filter];
   const totals=await first("SELECT COUNT(*) AS orders,COALESCE(SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END),0) AS approved,COALESCE(SUM(CASE WHEN status='approved' THEN amount_cents ELSE 0 END),0) AS gross_cents,COALESCE(SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END),0) AS pending FROM purchases WHERE mode='live' AND grant_source='payment'");
   const count=await first('SELECT COUNT(*) AS n FROM purchases p WHERE '+where+statusFilter,...args);
   const rows=(await query("SELECT p.id,p.plan_id,p.status,p.amount_cents,p.created_at,p.approved_at,p.requested_format,COALESCE(u.email_normalized,NULLIF(p.email,''),'') AS buyer_email,CASE WHEN u.id IS NULL THEN 0 ELSE 1 END AS email_verified,CASE WHEN d.id IS NULL THEN 0 ELSE 1 END AS published FROM purchases p LEFT JOIN customer_users u ON u.id=p.customer_id LEFT JOIN deliveries d ON d.purchase_id=p.id WHERE "+where+statusFilter+' ORDER BY p.created_at DESC,p.id DESC LIMIT ? OFFSET ?',...args,size,(page-1)*size).all()).results;
   return json({summary:{orders:Number(totals.orders),approved:Number(totals.approved),grossCents:Number(totals.gross_cents),pending:Number(totals.pending)},page,pageSize:size,total:Number(count.n),sales:rows.map(r=>({id:r.id,planId:r.plan_id,status:r.status,amountCents:r.amount_cents,createdAt:r.created_at,approvedAt:r.approved_at,format:r.requested_format,buyerEmail:r.buyer_email,emailVerified:!!r.email_verified,published:!!r.published}))});
  }
  if(path==='/api/admin/gifts'&&method==='GET'){
   const rows=(await query("SELECT p.id,p.draft_id,p.mode,p.status,p.created_at,p.admin_format,d.public_id,d.recipient,d.format,d.updated_at FROM purchases p LEFT JOIN deliveries d ON d.purchase_id=p.id WHERE p.admin_id=? AND p.grant_source='admin' ORDER BY COALESCE(d.updated_at,p.created_at) DESC LIMIT 200",user.id).all()).results;
   return json({gifts:rows.map(r=>({id:r.id,draftId:r.draft_id,mode:r.mode,status:r.status,recipient:r.recipient||'',format:r.format||r.admin_format||'cartao',updatedAt:r.updated_at||r.created_at,url:r.public_id?origin+'/g/'+r.public_id:null}))});
  }
  if(path==='/api/admin/grants'&&method==='POST'){
   await limit(request,'grants',300,3600);const data=await input(request),draft=data.draftId;
   if(!/^[a-zA-Z0-9-]{8,64}$/.test(draft||'')||!['stories','livro','cartao','convite'].includes(data.format))throw new AdminError(422,'Escolha um formato válido para o teste.');
   const mode=env.PAYMENT_MODE==='live'?'live':'test',key=randomHex(),id=randomHex(16);
   await run("INSERT OR IGNORE INTO purchases(id,access_hash,idempotency_hash,draft_id,plan_id,amount_cents,mode,status,created_at,approved_at,grant_source,admin_id,admin_format) VALUES(?,?,?,?,?,0,?,'approved',?,?,'admin',?,?)",id,await digest(key),await digest('admin:'+user.id+':'+mode+':'+draft),draft,'celebrar',mode,now(),now(),user.id,data.format);
   const row=await first("SELECT * FROM purchases WHERE admin_id=? AND draft_id=? AND mode=? AND grant_source='admin'",user.id,draft,mode);
   if(row.status!=='approved')throw new AdminError(409,'Este teste foi encerrado. Crie um novo presente.');
   await run('UPDATE purchases SET access_hash=?,admin_format=? WHERE id=?',await digest(key),data.format,row.id);
   const delivery=await first('SELECT * FROM deliveries WHERE purchase_id=?',row.id);
   return json({id:row.id,draftId:row.draft_id,planId:'celebrar',mode,status:'approved',amountCents:0,isAdmin:true,accessKey:key,createdAt:row.created_at*1000,requestedFormat:data.format,delivery:delivery?{id:delivery.public_id,url:origin+'/g/'+delivery.public_id,revision:delivery.revision,expiresAt:delivery.expires_at}:null});
  }
  throw new AdminError(404,'Ação não encontrada.');
 }
 return async request=>{try{return await dispatch(request);}catch(error){return json({error:error instanceof AdminError?error.message:'Não foi possível concluir agora. Tente novamente.'},error instanceof AdminError?error.status:503);}};
}
