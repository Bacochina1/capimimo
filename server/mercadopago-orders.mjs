import {WebhookSignatureValidator} from 'mercadopago';

export const BILLING_PLANS=Object.freeze({
 mimo:{title:'Capimimo · Um Mimo',cents:1490,formats:['stories','cartao']},
 historia:{title:'Capimimo · Uma História',cents:2490,formats:['stories','cartao','livro']},
 celebrar:{title:'Capimimo · Celebrar Juntos',cents:3990,formats:['convite'],guests:100}
});
export const mpOrderId=value=>typeof value==='string'&&/^ORD(?:TST)?[A-Z0-9]{20,50}$/.test(value);
export function moneyCents(value){const s=String(value??'');if(!/^\d{1,10}(?:\.\d{1,2})?$/.test(s))return null;const [whole,part='']=s.split('.');const n=Number(whole)*100+Number(part.padEnd(2,'0'));return Number.isSafeInteger(n)?n:null;}

export function createOrdersAdapter({token,origin,mode,applicationId,fetchImpl=fetch}){
 if(!token||!['test','live'].includes(mode))throw Error('Payment credentials unavailable');
 const base=new URL(origin);if(base.protocol!=='https:')throw Error('HTTPS required');
 async function request(path,options={}){const response=await fetchImpl('https://api.mercadopago.com'+path,{...options,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Payment provider returned '+response.status);return response.json();}
 return{
  async create({id,planId,email}){
   const plan=Object.hasOwn(BILLING_PLANS,planId)?BILLING_PLANS[planId]:null;if(!plan||!/^[a-f0-9]{32}$/.test(id))throw Error('Invalid order');
   const amount=(plan.cents/100).toFixed(2),back=base.origin+'/?compra='+id;
   const data=await request('/v1/orders',{method:'POST',headers:{'X-Idempotency-Key':id},body:JSON.stringify({type:'online',processing_mode:'manual',total_amount:amount,external_reference:id,description:plan.title,expiration_time:'P1D',...(email?{payer:{email}}:{}),items:[{title:plan.title,unit_price:amount,quantity:1}],config:{online:{success_url:back+'&resultado=retorno',pending_url:back+'&resultado=pendente',failure_url:back+'&resultado=erro',auto_return:'all'}}})});
   const url=new URL(data.checkout_url);if(url.protocol!=='https:'||!['mercadopago.com.br','mercadopago.com'].some(host=>url.hostname===host||url.hostname.endsWith('.'+host)))throw Error('Unexpected checkout destination');
   if(!mpOrderId(data.id)||String(data.external_reference)!==id||data.currency!=='BRL'||moneyCents(data.total_amount)!==plan.cents||!/^\d+$/.test(String(data.user_id))||(applicationId&&String(data.integration_data?.application_id)!==applicationId))throw Error('Unexpected provider order');
   if((mode==='test')!==data.id.startsWith('ORDTST'))throw Error('Payment environment mismatch');
   return{id:data.id,url:url.href,userId:String(data.user_id)};
  },
  read(id){if(!mpOrderId(id))throw Error('Invalid provider order');return request('/v1/orders/'+id);},
  assess(data,row){
   const matches=data.id===row.mp_id&&data.external_reference===row.id&&data.currency==='BRL'&&moneyCents(data.total_amount)===row.amount_cents&&String(data.user_id)===row.mp_user_id&&((row.mode==='test')===data.id.startsWith('ORDTST'))&&(!applicationId||String(data.integration_data?.application_id)===applicationId);
   return{matches,approved:matches&&data.status==='processed'&&data.status_detail==='accredited'&&moneyCents(data.total_paid_amount)===row.amount_cents,revoked:matches&&['refunded','canceled','charged_back'].includes(data.status),failed:matches&&data.status==='failed',updated:Date.parse(data.last_updated_date||'')||0};
  }
 };
}

export function verifyOrderSignature(request,secret,id){
 if(!secret||!mpOrderId(id))throw Error('Invalid signature');
 WebhookSignatureValidator.validate({xSignature:request.headers.get('x-signature'),xRequestId:request.headers.get('x-request-id'),dataId:id,secret});
}
