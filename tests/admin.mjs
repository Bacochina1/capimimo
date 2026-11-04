import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createAdminAPI,hashAdminPassword,digest} from '../server/admin.mjs';
import {createBillingAPI} from '../server/billing.mjs';
const sql=new DatabaseSync(':memory:');for(const f of ['0001_billing.sql','0002_reconciliation.sql','0003_admin.sql'])sql.exec(readFileSync('server/billing-migrations/'+f,'utf8'));
const db={prepare(text){const q=sql.prepare(text);let args=[];return{bind(...v){args=v;return this;},async first(){return q.get(...args)||null;},async all(){return{results:q.all(...args)};},async run(){return{meta:{changes:q.run(...args).changes}};}};},async batch(statements){sql.exec('BEGIN');try{const out=[];for(const q of statements)out.push(await q.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
let time=1793740000;const origin='https://admin-fixture.capimimo.test',objects=new Map(),env={SITE_ORIGIN:origin,BILLING_DB:db,PAYMENT_MODE:'test',SALES_ENABLED:'false',GIFTS_BUCKET:{async put(key,bytes,meta){objects.set(key,{body:new Uint8Array(bytes),httpMetadata:meta.httpMetadata});},async get(key){return objects.get(key)||null;},async delete(key){objects.delete(key);}}};
const now=()=>time,api=createAdminAPI(env,{now}),billing=createBillingAPI(env,{now,fetchImpl:async()=>{throw Error('Network is forbidden in this audit');}}),checks=[];
const password='Fixture-Only-Strong-Passphrase';
for(const [id,name]of[['fixture-a','owner-a'],['fixture-b','owner-b']])sql.prepare('INSERT INTO admin_users VALUES(?,?,?,?,?,?)').run(id,name,await hashAdminPassword(password),1,time,time);
function check(name,pass,detail){checks.push({name,pass:!!pass,...(detail?{detail}:{})});console.log(pass?'PASS':'FAIL',name);}
async function call(handler,path,{method='GET',body,cookie='',token='',siteOrigin=origin,headers={},urlOrigin=origin}={}){const r=await handler(new Request(urlOrigin+path,{method,headers:{...(method==='GET'?{}:{Origin:siteOrigin}),...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body?{body:typeof body==='string'?body:JSON.stringify(body)}:{})}));let data;try{data=await r.clone().json();}catch{data=await r.text();}return{status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0],headers:r.headers};}
let pass=false;
try{
 check('Unauthenticated admin grant is denied',(await call(api,'/api/admin/grants',{method:'POST',body:{draftId:'fixture-draft-a',format:'cartao'}})).status===401);
 check('Unknown and wrong-password logins are generic401',(await call(api,'/api/admin/login',{method:'POST',body:{username:'not-a-user',password}})).status===401&&(await call(api,'/api/admin/login',{method:'POST',body:{username:'owner-a',password:'wrong'}})).status===401);
 const loginA=await call(api,'/api/admin/login',{method:'POST',body:{username:'owner-a',password}}),cookieA=loginA.cookie;
 check('Login returns only public identity and secure host cookie',loginA.status===200&&loginA.data.authenticated&&!loginA.data.accessKey&&/^__Host-capimimo_admin=/.test(cookieA)&&/HttpOnly/.test(loginA.headers.get('set-cookie'))&&/Secure/.test(loginA.headers.get('set-cookie'))&&/SameSite=Strict/.test(loginA.headers.get('set-cookie')));
 check('Only session hash is stored',sql.prepare('SELECT token_hash FROM admin_sessions').get().token_hash===await digest(cookieA.split('=')[1]));
 const cookieB=(await call(api,'/api/admin/login',{method:'POST',body:{username:'owner-b',password}})).cookie;
 for(const opts of [{siteOrigin:'https://evil.example'},{headers:{'sec-fetch-site':'cross-site'}},{headers:{Origin:''}},{urlOrigin:'https://spoof.example'}])check('CSRF/origin variant rejected '+JSON.stringify(opts),(await call(api,'/api/admin/grants',{method:'POST',cookie:cookieA,body:{draftId:'fixture-csrf-test',format:'cartao'},...opts})).status===403);
 check('NonJSON credentials rejected',(await call(api,'/api/admin/login',{method:'POST',body:'username=owner-a',headers:{'Content-Type':'application/x-www-form-urlencoded'}})).status===415);
 check('Oversized body rejected',(await call(api,'/api/admin/login',{method:'POST',body:{username:'owner-a',password:'x'.repeat(5000)}})).status===413);
 const input={draftId:'fixture-draft-a',format:'cartao'},grant=await call(api,'/api/admin/grants',{method:'POST',cookie:cookieA,body:input}),id=grant.data.id,token=grant.data.accessKey;
 check('Authenticated owner receives free admin grant',grant.status===200&&grant.data.isAdmin&&grant.data.amountCents===0&&grant.data.status==='approved');
 const [r1,r2]=await Promise.all([call(api,'/api/admin/grants',{method:'POST',cookie:cookieA,body:input}),call(api,'/api/admin/grants',{method:'POST',cookie:cookieA,body:input})]);
 check('Concurrent grants keep one purchase',r1.status===200&&r2.status===200&&r1.data.id===id&&r2.data.id===id&&sql.prepare("SELECT COUNT(*) AS n FROM purchases WHERE grant_source='admin'").get().n===1);
 const ownerRead=await call(billing,'/api/orders/'+id,{cookie:cookieA,token});check('Original grant remains usable after another tab renews it',ownerRead.status===200&&ownerRead.data.isAdmin);
 check('Grant bearer alone does not confer admin rights',(await call(billing,'/api/orders/'+id,{token})).status===403);
 check('Second admin cannot access another admin gift',(await call(billing,'/api/orders/'+id,{cookie:cookieB,token})).status===403);
 check('Forged cookie denied',(await call(billing,'/api/orders/'+id,{cookie:'__Host-capimimo_admin='+'a'.repeat(64),token})).status===403);
 const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Fixture only</title><p>'+('A fictional test gift. '.repeat(10))+'</p></html>',publishHeaders={'Content-Type':'text/html; charset=utf-8','X-Gift-Format':'cartao','X-Draft-Id':input.draftId,'X-Gift-Revision':'0','X-Gift-Recipient':'Pessoa ficticia'};
 check('Bearer-only upload is denied',(await call(billing,'/api/orders/'+id+'/publish',{method:'PUT',token,body:html,headers:publishHeaders})).status===403);
 check('Other admin upload is denied',(await call(billing,'/api/orders/'+id+'/publish',{method:'PUT',cookie:cookieB,token,body:html,headers:publishHeaders})).status===403);
 const published=await call(billing,'/api/orders/'+id+'/publish',{method:'PUT',cookie:cookieA,token,body:html,headers:publishHeaders});check('Admin owner can publish without payment',published.status===201&&objects.size===1,{status:published.status,error:published.data.error});
 const publicId=published.data.delivery?.id;check('Recipient opens test gift without admin cookie',(await call(billing,'/api/presents/'+publicId)).data.test===true&&(await call(billing,'/api/presents/'+publicId+'/content')).status===200);
 for(const format of ['cartao','livro','stories','convite']){
  const draftId='fixture-format-'+format;
  const g=await call(api,'/api/admin/grants',{method:'POST',cookie:cookieA,body:{draftId,format}});
  const pub=await call(billing,'/api/orders/'+g.data.id+'/publish',{method:'PUT',cookie:cookieA,token:g.data.accessKey,body:html,headers:{...publishHeaders,'X-Gift-Format':format,'X-Draft-Id':draftId}});
  check('Admin publishes '+format+' without changing paid plans',g.status===200&&pub.status===201,{status:pub.status,error:pub.data.error});
  const present=await call(billing,'/api/presents/'+pub.data.delivery?.id);
  check('Public '+format+' has correct invitation and test flags',present.status===200&&present.data.test===true&&present.data.rsvp===(format==='convite'));
  const guests=await call(billing,'/api/orders/'+g.data.id+'/guests',{cookie:cookieA,token:g.data.accessKey});
  check('Guest management matches '+format,guests.status===(format==='convite'?200:403));
 }
 const listA=await call(api,'/api/admin/gifts',{cookie:cookieA}),listB=await call(api,'/api/admin/gifts',{cookie:cookieB});
 check('Admin gift list is isolated and omits bearer secrets',listA.status===200&&listA.data.gifts.length===5&&listB.data.gifts.length===0&&!JSON.stringify(listA.data).includes('accessKey')&&!JSON.stringify(listA.data).includes('access_hash'));
 check('Admin checkout does not create a charge',(await call(billing,'/api/checkout',{method:'POST',cookie:cookieA,token,body:{planId:'mimo',draftId:'fixture-charge-denied',idempotencyKey:'a'.repeat(32),email:'fixture@example.test'}})).status===409);
 const sessionRow=sql.prepare('SELECT * FROM admin_sessions WHERE token_hash=?').get(await digest(cookieA.split('=')[1]));time=sessionRow.expires_at+1;check('Expired session denies grant and gift edit',(await call(api,'/api/admin/grants',{method:'POST',cookie:cookieA,body:input})).status===401&&(await call(billing,'/api/orders/'+id,{cookie:cookieA,token})).status===403);time=1793740000;
 sql.prepare('UPDATE admin_users SET active=0 WHERE id=?').run('fixture-a');check('Deactivated owner immediately loses editing access',(await call(billing,'/api/orders/'+id,{cookie:cookieA,token})).status===403);sql.prepare('UPDATE admin_users SET active=1 WHERE id=?').run('fixture-a');
 const nextPassword='Fixture-Only-New-Strong-Passphrase',changed=await call(api,'/api/admin/password',{method:'POST',cookie:cookieA,body:{currentPassword:password,newPassword:nextPassword}});check('Password change rotates session and invalidates old cookie',changed.status===200&&changed.cookie!==cookieA&&(await call(billing,'/api/orders/'+id,{cookie:cookieA,token})).status===403&&(await call(billing,'/api/orders/'+id,{cookie:changed.cookie,token})).status===200);
 const ended=await call(api,'/api/admin/logout',{method:'POST',cookie:changed.cookie,body:{}});check('Logout revokes role and expires cookie',ended.status===200&&/Max-Age=0/.test(ended.headers.get('set-cookie'))&&(await call(api,'/api/admin/session',{cookie:changed.cookie})).data.authenticated===false&&(await call(billing,'/api/orders/'+id,{cookie:changed.cookie,token})).status===403);
 check('Admin endpoints are never cached',/no-store/.test(loginA.headers.get('cache-control'))&&/noindex/.test(loginA.headers.get('x-robots-tag'))&&!loginA.headers.has('access-control-allow-origin'));
 pass=checks.every(c=>c.pass);
}catch(e){checks.push({name:'Unhandled audit error',pass:false,detail:String(e)});console.error(e);}finally{sql.close();}
console.log('VERDICT:',pass?'PASS':'FAIL',checks.filter(c=>c.pass).length+'/'+checks.length);process.exit(pass?0:1);
