import {customerSession,customerWriteAllowed} from './customer.mjs';
import {adminSession,digest,randomHex} from './admin.mjs';
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
class SupportError extends Error{constructor(status,message){super(message);this.status=status;}}
async function input(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new SupportError(415,'Envie os dados do formulário.');
 const reader=request.body?.getReader();if(!reader)throw new SupportError(400,'Escreva uma mensagem.');let size=0,parts=[];
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>8192){await reader.cancel();throw new SupportError(413,'Mensagem muito grande.');}parts.push(part.value);}}finally{reader.releaseLock();}
 try{const raw=new Uint8Array(size);let offset=0;for(const part of parts){raw.set(part,offset);offset+=part.length;}const data=JSON.parse(new TextDecoder().decode(raw));if(!data||Array.isArray(data)||typeof data!=='object')throw Error();return data;}catch{throw new SupportError(400,'Confira os dados do formulário.');}
}
export function createSupportAPI(env,{now=()=>Math.floor(Date.now()/1000)}={}){
 const db=env.BILLING_DB,origin=new URL(env.SITE_CANONICAL_ORIGIN||env.SITE_ORIGIN).origin;
 const q=(sql,...args)=>db.prepare(sql).bind(...args),first=(sql,...args)=>q(sql,...args).first(),run=(sql,...args)=>q(sql,...args).run();
 async function limit(id){const key=await digest('support:'+id+':'+Math.floor(now()/3600));await run('INSERT INTO customer_rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',key,now()+7200);if((await first('SELECT count FROM customer_rate_limits WHERE key=?',key)).count>30)throw new SupportError(429,'Muitas mensagens. Aguarde antes de tentar novamente.');}
 async function dispatch(request){
  const url=new URL(request.url),method=request.method;if(url.origin!==origin)throw new SupportError(403,'Entre pelo domínio principal do Capimimo.');
  if(method!=='GET'&&!customerWriteAllowed(request,env))throw new SupportError(403,'Origem não autorizada.');
  if(!db)throw new SupportError(503,'Atendimento temporariamente indisponível.');
  const admin=await adminSession(request,env,now()),customer=await customerSession(request,env,now());if(!admin&&!customer)throw new SupportError(401,'Entre na sua conta para continuar.');
  const adminRoute=url.pathname.startsWith('/api/support/admin/');if(adminRoute&&!admin)throw new SupportError(403,'Acesso restrito ao atendimento.');if(!adminRoute&&!customer)throw new SupportError(403,'Entre na conta de cliente.');
  if(method==='GET'&&url.pathname==='/api/support/conversations'){const rows=(await q('SELECT id,status,created_at,updated_at FROM support_conversations WHERE customer_id=? ORDER BY updated_at DESC LIMIT 100',customer.id).all()).results;return response({conversations:rows});}
  if(method==='GET'&&url.pathname==='/api/support/admin/conversations'){const rows=(await q('SELECT c.id,c.status,c.created_at,c.updated_at,u.email_normalized AS email FROM support_conversations c JOIN customer_users u ON u.id=c.customer_id ORDER BY c.updated_at DESC LIMIT 100').all()).results;return response({conversations:rows});}
  if(method==='POST'&&url.pathname==='/api/support/conversations'){await limit(customer.id);const data=await input(request),text=typeof data.message==='string'?data.message.trim():'';if(!text||text.length>2000)throw new SupportError(422,'Escreva uma mensagem de até 2.000 caracteres.');const id=randomHex(16),stamp=now();await db.batch([q('INSERT INTO support_conversations(id,customer_id,created_at,updated_at) VALUES(?,?,?,?)',id,customer.id,stamp,stamp),q("INSERT INTO support_messages(id,conversation_id,sender,body,created_at) VALUES(?,?,'customer',?,?)",randomHex(16),id,text,stamp)]);return response({id},201);}
  const match=url.pathname.match(/^\/api\/support\/(admin\/)?conversations\/([a-f0-9]{32})\/messages$/);if(!match)throw new SupportError(404,'Conversa não encontrada.');
  const [,adminPath,id]=match,conversation=await first('SELECT * FROM support_conversations WHERE id=?',id);if(!conversation||(!adminPath&&conversation.customer_id!==customer.id))throw new SupportError(404,'Conversa não encontrada.');
  if(method==='GET'){const rows=(await q('SELECT id,sender,body,created_at FROM support_messages WHERE conversation_id=? ORDER BY created_at ASC,rowid ASC LIMIT 500',id).all()).results;return response({status:conversation.status,messages:rows});}
  if(method==='POST'){await limit(adminPath?'admin:'+admin.id:customer.id);const data=await input(request),text=typeof data.message==='string'?data.message.trim():'';if(!text||text.length>2000)throw new SupportError(422,'Escreva uma mensagem de até 2.000 caracteres.');if(conversation.status!=='open')throw new SupportError(409,'Esta conversa está encerrada.');const stamp=now();await db.batch([q('INSERT INTO support_messages(id,conversation_id,sender,body,created_at) VALUES(?,?,?,?,?)',randomHex(16),id,adminPath?'admin':'customer',text,stamp),q('UPDATE support_conversations SET updated_at=? WHERE id=?',stamp,id)]);return response({ok:true},201);}
  throw new SupportError(404,'Ação não encontrada.');
 }
 return async request=>{try{return await dispatch(request);}catch(error){return response({error:error instanceof SupportError?error.message:'Atendimento temporariamente indisponível. Tente novamente.'},error instanceof SupportError?error.status:503);}};
}
