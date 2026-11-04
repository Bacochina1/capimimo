const storeKey='capimimo-purchases-v1';
const secret=bytes=>Array.from(crypto.getRandomValues(new Uint8Array(bytes)),n=>n.toString(16).padStart(2,'0')).join('');
export function initBillingClient({getState,beforeCheckout=async()=>{}}){
 let config={mode:['localhost','127.0.0.1','[::1]'].includes(globalThis.location?.hostname)?'offline':'unavailable',checkoutReady:false},records=[];try{records=JSON.parse(localStorage.getItem(storeKey)||'[]');if(!Array.isArray(records))records=[];records=records.filter(r=>r&&typeof r==='object'&&typeof r.draftId==='string'&&typeof r.planId==='string'&&typeof r.accessKey==='string');}catch{}
 let accountRecords=[],accountIds=new Set(),accountGuestLinks=new Map(),guestLinkRevisions=new Map(),accountSync=null,accountEpoch=0,logoutEpoch=0,account={authenticated:false};
 const allRecords=()=>[...records,...accountRecords.filter(r=>!records.some(local=>local.id===r.id))];
 const save=()=>{localStorage.setItem(storeKey,JSON.stringify(records));};
 const notify=()=>document.dispatchEvent(new CustomEvent('billing:change'));
 const ready=fetch('/api/billing/config',{cache:'no-store'}).then(async response=>{if(response.ok&&response.headers.get('content-type')?.includes('application/json'))config=await response.json();notify();return config;}).catch(()=>config);
 async function request(path,record,{method='GET',body,headers={}}={}){const response=await fetch(path,{method,headers:{...(record?.accessKey?{Authorization:'Bearer '+record.accessKey}:{}),...(body&&!(body instanceof Blob)?{'Content-Type':'application/json'}:{}),...headers},body:body instanceof Blob?body:body?JSON.stringify(body):undefined,cache:'no-store'});const result=await response.json().catch(()=>({error:'Resposta indisponível.'}));if(!response.ok){if(record?.sessionAuth&&!record.accessKey&&[401,403].includes(response.status))clearAccount();const error=Error(result.error||'Não foi possível concluir agora.');error.status=response.status;throw error;}return result;}
 const mergeOrder=(record,result)=>{const requestedFormat=result.requestedFormat||record.requestedFormat;Object.assign(record,result);if(['stories','cartao','livro','convite'].includes(requestedFormat))record.requestedFormat=requestedFormat;return record;};
 const expired=record=>record.expired===true||(Number.isFinite(record.expiresAt)&&record.expiresAt*1000<=Date.now());
 const includes=(record,format)=>record.isAdmin?!!config.admin?.authenticated&&['stories','livro','cartao','convite'].includes(format):config.plans?.[record.planId]?.formats.includes(format);
 function find(draftId=getState().draftId,format=getState().format){return allRecords().filter(r=>r.draftId===draftId&&r.mode===config.mode&&!expired(r)&&includes(r,format)&&(!r.isAdmin||config.admin?.authenticated)).sort((a,b)=>(b.status==='approved')-(a.status==='approved')||b.createdAt-a.createdAt)[0];}
 async function refresh(record=find(),sync=false){if(!record?.id)return null;const result=await request('/api/orders/'+record.id+(sync?'/sync':''),record,sync?{method:'POST',body:{}}:{});mergeOrder(record,result);save();notify();return record;}
 async function checkout(planId,email=''){
  await ready;if(config.admin?.authenticated){await beforeCheckout();return adminGrant(getState().draftId,getState().checkoutPlan===planId?getState().checkoutFormat:({mimo:'stories',historia:'livro',celebrar:'convite'})[planId]);}if(!config.checkoutReady)throw Error('O checkout ainda está em configuração.');await beforeCheckout();const state=getState(),target=state.checkoutPlan===planId?state.checkoutFormat:({mimo:'stories',historia:'livro',celebrar:'convite'})[planId];
  const paid=allRecords().filter(r=>r.draftId===state.draftId&&r.mode===config.mode&&r.status==='approved'&&!expired(r)&&includes(r,target)&&(!r.isAdmin||config.admin?.authenticated)).sort((a,b)=>(b.planId===planId)-(a.planId===planId)||b.createdAt-a.createdAt);
  for(const approved of paid){await refresh(approved);if(approved.status==='approved'&&!expired(approved))return approved;}
  const recoveryEpoch=logoutEpoch;await recoverAccountBeforePurchase();if(recoveryEpoch!==logoutEpoch)throw Error('Sua sessão foi encerrada. Entre novamente para continuar.');
  for(const recovered of allRecords().filter(r=>r.draftId===state.draftId&&r.mode===config.mode&&r.status==='approved'&&!expired(r)&&includes(r,target)&&(!r.isAdmin||config.admin?.authenticated))){await refresh(recovered);if(recovered.status==='approved'&&!expired(recovered))return recovered;}
  let record=allRecords().find(r=>r.draftId===state.draftId&&r.planId===planId&&r.mode===config.mode&&['pending','preparing'].includes(r.status));
  if(record?.sessionAuth&&!record.accessKey){await refresh(record,true);if(record.status==='approved'||record.checkoutUrl)return record;throw Error('Este pagamento está sendo preparado. Verifique novamente em Minha conta antes de iniciar outra compra.');}
  if(!record){record={draftId:state.draftId,planId,mode:config.mode,accessKey:secret(32),idempotencyKey:secret(16),createdAt:Date.now(),status:'pending',requestedFormat:state.checkoutPlan===planId?state.checkoutFormat:state.planId?state.format:undefined};records.push(record);save();}
  const checkoutEpoch=logoutEpoch;const result=await request('/api/checkout',record,{method:'POST',body:{planId,draftId:record.draftId,idempotencyKey:record.idempotencyKey,requestedFormat:target,email}});if(result.sessionAuth===true&&checkoutEpoch!==logoutEpoch){records=records.filter(r=>r!==record);save();notify();throw Error('Sua sessão foi encerrada. Entre novamente para continuar.');}mergeOrder(record,result);if(result.sessionAuth===true)record.accountBound=true;save();notify();return record;
 }
 async function requirePurchase(format=getState().format,draftId=getState().draftId){
  await ready;if(config.admin?.authenticated){await adminGrant(draftId,format);return true;}if(config.mode==='unavailable'){document.dispatchEvent(new CustomEvent('billing:unavailable'));return false;}if(!config.checkoutReady&&config.mode==='offline')return true;
  const required=()=>{const ended=allRecords().some(r=>r.draftId===draftId&&r.mode===config.mode&&r.status==='approved'&&includes(r,format)&&expired(r));document.dispatchEvent(new CustomEvent('billing:required',{detail:{format,expired:ended,...(ended?{message:'O período de 12 meses desta compra terminou. Sua cópia baixada continua com você. Para publicar novamente, escolha um novo plano; nenhuma cobrança foi feita.'}:{})}}));return false;};
  const tried=new Set();for(let pass=0;pass<2;pass++){let record=find(draftId,format);while(record?.id&&!tried.has(record.id)){tried.add(record.id);await refresh(record);if(record.status==='approved'&&!expired(record)&&includes(record,format))return true;record=find(draftId,format);}if(pass===0){const recoveryEpoch=logoutEpoch;await recoverAccountBeforePurchase();if(recoveryEpoch!==logoutEpoch)throw Error('Sua sessão foi encerrada. Entre novamente para continuar.');}}return required();
 }
 async function publish(data,blob,onProgress=()=>{}){await ready;if(!await requirePurchase(data.format,data.draftId))throw Error('Confirme a compra deste presente antes de publicar.');const record=find(data.draftId,data.format);if(!record?.id)throw Error('Confirme a compra deste presente antes de publicar.');if(blob.size>config.maxArchiveBytes)throw Error('O presente passou de '+Math.round(config.maxArchiveBytes/1024/1024)+' MB. Reduza fotos ou áudio.');let upload=blob,encoding='identity';if(typeof CompressionStream==='function'){const zipped=await new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob();if(zipped.size<blob.size){upload=zipped;encoding='gzip';}}
  onProgress({stage:'upload',bytes:upload.size,original:blob.size});const result=await request('/api/orders/'+record.id+'/publish',record,{method:'PUT',body:upload,headers:{'Content-Type':encoding==='gzip'?'application/gzip':'text/html; charset=utf-8','X-Gift-Encoding':encoding,'X-Gift-Format':data.format,'X-Gift-Recipient':encodeURIComponent(data.recipient||''),'X-Draft-Id':data.draftId,'X-Gift-Revision':String(record.delivery?.revision||0)}});mergeOrder(record,result);save();notify();return record.delivery;
 }
 async function adminGrant(draftId=getState().draftId,format=getState().format){await ready;try{const record=await request('/api/admin/grants',null,{method:'POST',body:{draftId,format}});const previous=records.find(r=>r.id===record.id);if(previous)Object.assign(previous,record);else records.push(record);save();notify();return previous||record;}catch(error){if(/administrador|Entre|Origem/.test(error.message)){config.admin=null;document.dispatchEvent(new CustomEvent('admin:expired'));}throw error;}}
 async function guests(record=find()){
  if(!record?.id)return[];const owner=account.email,epoch=logoutEpoch,revision=guestLinkRevisions.get(record.id)||0;const result=await request('/api/orders/'+record.id+'/guests',record);
  if(epoch!==logoutEpoch||owner!==account.email||!allRecords().some(r=>r.id===record.id)||(record.sessionAuth&&!record.accessKey&&(!account.authenticated||!accountIds.has(record.id))))throw Error('Sua sessão mudou. Abra sua conta novamente.');
  if(revision!==(guestLinkRevisions.get(record.id)||0))throw Error('Os convites mudaram. Atualize a lista para copiar o link atual.');
  const rows=Array.isArray(result.guests)?result.guests:[];for(const guest of rows){if(typeof guest.url==='string'&&guest.url)rememberGuestLink(record,guest,owner,epoch);else if(guest.linkRecovery==='unavailable'){delete record.guestLinks?.[guest.id];delete accountGuestLinks.get(record.id)?.[guest.id];const current=accountRecords.find(r=>r.id===record.id);if(current)delete current.guestLinks?.[guest.id];}}save();return rows;
 }
 function advanceGuestLinks(record){guestLinkRevisions.set(record.id,(guestLinkRevisions.get(record.id)||0)+1);}
 function rememberGuestLink(record,result,owner,epoch){record.guestLinks??={};record.guestLinks[result.id]=result.url;if(owner&&account.authenticated&&account.email===owner&&epoch===logoutEpoch&&accountIds.has(record.id)){const links=accountGuestLinks.get(record.id)||{};links[result.id]=result.url;accountGuestLinks.set(record.id,links);const current=accountRecords.find(r=>r.id===record.id);if(current)current.guestLinks=links;}save();}
 async function regenerateGuestLink(guestId,record=find()){if(!record?.id)throw Error('Compra não encontrada.');const owner=account.email,epoch=logoutEpoch;const result=await request('/api/orders/'+record.id+'/guests/'+guestId+'/link',record,{method:'POST'});advanceGuestLinks(record);rememberGuestLink(record,result,owner,epoch);return result;}
 async function addGuest(name,allowedCount,record=find()){if(!record?.id)throw Error('Compra não encontrada.');const owner=account.email,epoch=logoutEpoch;const result=await request('/api/orders/'+record.id+'/guests',record,{method:'POST',body:{name,allowedCount}});rememberGuestLink(record,result,owner,epoch);return result;}
 function backup(){return new Blob([JSON.stringify({type:'capimimo-purchase-access',version:1,orders:records.filter(r=>r.id&&!r.isAdmin)},null,2)],{type:'application/json'});}
 async function restore(file){
  if(file.size>10*1024*1024)throw Error('Arquivo de acesso inválido.');let payload;try{payload=JSON.parse(await file.text());}catch{throw Error('Arquivo de acesso inválido.');}
  if(!payload||payload.type!=='capimimo-purchase-access'||!Array.isArray(payload.orders)||payload.orders.length>1000)throw Error('Arquivo de acesso inválido.');
  const restored=[],seen=new Set();let skipped=0;
  for(const value of payload.orders){
   if(!value||value.isAdmin||!/^[a-f0-9]{32}$/.test(value.id||'')||!/^[a-f0-9]{64}$/.test(value.accessKey||'')){skipped++;continue;}
   if(seen.has(value.id))continue;
   const record={id:value.id,accessKey:value.accessKey,guestLinks:value.guestLinks&&typeof value.guestLinks==='object'&&!Array.isArray(value.guestLinks)?value.guestLinks:{},createdAt:Date.now(),requestedFormat:['stories','cartao','livro','convite'].includes(value.requestedFormat)?value.requestedFormat:undefined};
   try{const result=await request('/api/orders/'+record.id,record);mergeOrder(record,result);if(record.isAdmin){skipped++;continue;}}catch{skipped++;continue;}
   seen.add(record.id);const old=records.findIndex(r=>r.id===record.id);if(old>=0)records[old]=record;else records.push(record);restored.push(record);
  }
  if(!restored.length)throw Error('Não foi possível recuperar as compras. Confira a conexão e o arquivo de acesso. Testes administrativos são abertos pelo painel do administrador.');
  save();notify();restored.skipped=skipped;return restored;
 }
 async function readPublished(record){await refresh(record);if(expired(record))throw Error('O período de 12 meses desta compra terminou. Use a cópia que você baixou para guardar o presente.');if(!record.delivery||record.status!=='approved')throw Error('Este presente ainda não foi publicado.');const response=await fetch('/api/presents/'+record.delivery.id+'/download',{cache:'no-store'});if(!response.ok)throw Error('Não foi possível recuperar o presente.');const document=new DOMParser().parseFromString(await response.text(),'text/html'),script=document.querySelector('#capimimo-payload');if(!script)throw Error('Este arquivo pode ser visualizado, mas não tem dados de edição.');return JSON.parse(script.textContent);}
 function clearAccount({forgetLinked=false}={}){accountEpoch++;accountSync=null;if(forgetLinked){logoutEpoch++;records=records.filter(r=>!accountIds.has(r.id)&&!r.accountBound);save();try{localStorage.setItem('capimimo-account-logout',String(Date.now()));}catch{}}accountRecords=[];accountIds=new Set();accountGuestLinks=new Map();account={authenticated:false};notify();}
 async function recoverAccountBeforePurchase(){if(config.customerAccountOrigin&&globalThis.location?.origin&&config.customerAccountOrigin!==globalThis.location.origin)return;await syncAccount();}
 async function syncAccount(){await ready;if(accountSync)return accountSync;const pending=loadAccountSnapshot();accountSync=pending;try{return await pending;}finally{if(accountSync===pending)accountSync=null;}}
 async function loadAccountSnapshot(){
  const epoch=++accountEpoch;
  try{const session=await request('/api/customer/session',null);if(epoch!==accountEpoch)return account;if(!session.authenticated){clearAccount();return account;}
   const response=await request('/api/customer/orders',null);if(epoch!==accountEpoch)return account;
   if(!Array.isArray(response.orders))throw Error('Não foi possível carregar suas compras.');
   if(account.email!==session.email)accountGuestLinks=new Map();
   accountRecords=response.orders.filter(r=>r&&typeof r.id==='string'&&typeof r.draftId==='string'&&!r.isAdmin).map(r=>{const record={...r,sessionAuth:true,createdAt:r.createdAt||0,guestLinks:accountGuestLinks.get(r.id)||records.find(local=>local.id===r.id)?.guestLinks||{}};delete record.accessKey;delete record.idempotencyKey;return record;});accountIds=new Set(accountRecords.map(r=>r.id));for(const id of accountGuestLinks.keys())if(!accountIds.has(id))accountGuestLinks.delete(id);
   for(const record of accountRecords){const local=records.find(r=>r.id===record.id);if(local){mergeOrder(local,record);local.accountBound=true;}}
   account={authenticated:true,email:session.email};save();notify();return account;
  }catch(error){if(epoch===accountEpoch)clearAccount();throw error;}
 }
 async function claimLocalPurchases(){
  if(!account.authenticated)throw Error('Entre na sua conta para vincular compras.');let claimed=0,failed=0;const epoch=logoutEpoch;
  for(const record of records.filter(r=>r.id&&r.accessKey&&!r.isAdmin&&r.mode===config.mode&&!accountIds.has(r.id))){
   if(epoch!==logoutEpoch)throw Error('Sua sessão foi encerrada. Entre novamente para continuar.');
   try{await request('/api/customer/orders/'+record.id+'/claim',record,{method:'POST',body:{}});record.accountBound=true;claimed++;if(epoch!==logoutEpoch)records=records.filter(r=>r!==record);save();}catch(error){if(epoch!==logoutEpoch)throw error;failed++;}
  }
  if(epoch!==logoutEpoch){notify();throw Error('Sua sessão foi encerrada. Entre novamente para continuar.');}
  await syncAccount();return {claimed,failed};
 }
 globalThis.addEventListener?.('storage',event=>{if(event.key==='capimimo-account-logout'){accountEpoch++;accountSync=null;logoutEpoch++;records=records.filter(r=>!accountIds.has(r.id)&&!r.accountBound);accountRecords=[];accountIds=new Set();accountGuestLinks=new Map();account={authenticated:false};notify();}});
 return{syncAccount,clearAccount,claimLocalPurchases,get account(){return account;},ready,get config(){return config;},find,get:id=>allRecords().find(r=>r.id===id),list:()=>allRecords().map(r=>({id:r.id,draftId:r.draftId,planId:r.planId,status:r.status,delivery:r.delivery,mode:r.mode,sessionAuth:accountIds.has(r.id),expiresAt:r.expiresAt,expired:expired(r)})),refresh,checkout,requirePurchase,adminGrant,publish,guests,addGuest,regenerateGuestLink,backup,restore,readPublished,guestLink:(id,record=find())=>record?.guestLinks?.[id]};
}
