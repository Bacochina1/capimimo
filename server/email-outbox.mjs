import {brandedEmail} from './email-template.mjs';
import {emailAttachments} from './email-assets.mjs';
const validEmail=value=>typeof value==='string'&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export async function enqueuePurchaseEmail(env,row,now){
 if(!env.EMAIL||!row.email_notifications||row.mode!=='live'||row.status!=='approved'||row.grant_source==='admin'||!validEmail(row.email))return false;
 await env.BILLING_DB.prepare("INSERT OR IGNORE INTO email_outbox(id,purchase_id,kind,created_at,next_attempt_at) VALUES(?,?,'purchase-approved',?,?)").bind('purchase-approved:'+row.id,row.id,now,now).run();return true;
}
export async function drainPurchaseEmails(env,{now=Math.floor(Date.now()/1000),limit=5}={}){
 if(!env.EMAIL)return {sent:0,failed:0};
 const db=env.BILLING_DB,q=(sql,...args)=>db.prepare(sql).bind(...args);
 const rows=(await q('SELECT * FROM email_outbox WHERE sent_at IS NULL AND attempts<8 AND next_attempt_at<=? AND lease_until<=? ORDER BY created_at LIMIT ?',now,now,Math.min(10,Math.max(1,limit))).all()).results;
 let sent=0,failed=0;
 for(const job of rows){
  const token=crypto.randomUUID();const claim=await q('UPDATE email_outbox SET lease_token=?,lease_until=?,attempts=attempts+1 WHERE id=? AND sent_at IS NULL AND lease_until<=? AND attempts<8 AND next_attempt_at<=?',token,now+300,job.id,now,now).run();if(!claim.meta?.changes)continue;
  try{
   const row=await q('SELECT * FROM purchases WHERE id=?',job.purchase_id).first();
   if(!row||!row.email_notifications||row.status!=='approved'||row.mode!=='live'||row.grant_source==='admin'||!validEmail(row.email)){await q("UPDATE email_outbox SET attempts=8,lease_until=0,last_error='purchase-not-eligible' WHERE id=? AND lease_token=?",job.id,token).run();continue;}
   const price=(row.amount_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
   const content=brandedEmail({name:'',title:'Seu pagamento foi confirmado.',message:row.customer_id?`Recebemos seu pagamento de ${price}. Entre em Minha conta com o mesmo e-mail para encontrar sua compra e continuar criando.`:`Recebemos seu pagamento de ${price}. Volte ao Capimimo no mesmo navegador em que comprou e escolha Recuperar compra para continuar criando seu presente.`,note:row.customer_id?'Seu rascunho ainda não publicado fica neste navegador. Publique seu presente para recuperar o conteúdo em outro aparelho. Para ajuda, acesse o atendimento no site.':'Guarde o arquivo de acesso da compra. Este e-mail é uma confirmação e não substitui a chave de edição. Para ajuda, acesse o atendimento no site.',button:'Voltar ao Capimimo',url:'https://capimimo.com.br/'});
   const result=await env.EMAIL.send({from:{email:'avisos@capimimo.com.br',name:'Capimimo'},to:row.email,subject:'Seu pagamento foi confirmado · Capimimo',...content,attachments:emailAttachments});
   if(!result?.messageId)throw Error('missing-message-id');
   await q('UPDATE email_outbox SET sent_at=?,message_id=?,lease_until=0,last_error=NULL WHERE id=? AND lease_token=?',now,result.messageId,job.id,token).run();sent++;
  }catch{
   failed++;await q("UPDATE email_outbox SET next_attempt_at=?,lease_until=0,last_error='send-failed' WHERE id=? AND lease_token=?",now+Math.min(86400,60*2**job.attempts),job.id,token).run();
  }
 }
 return {sent,failed};
}
