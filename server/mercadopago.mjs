// Server-side adapter. Not imported by the browser and never contains credentials.
export const PAYMENT_PLANS=Object.freeze({mimo:{title:'Capimimo · Um Mimo',cents:1490},historia:{title:'Capimimo · Uma História',cents:2490},celebrar:{title:'Capimimo · Celebrar Juntos',cents:3990}});
export function createMercadoPagoAdapter({accessToken,baseUrl,fetchImpl=fetch}){
 if(!accessToken)throw new Error('MERCADOPAGO_ACCESS_TOKEN is required on the server.');
 const origin=new URL(baseUrl);if(origin.protocol!=='https:')throw new Error('A public HTTPS origin is required.');
 const request=async(path,options={})=>{const response=await fetchImpl('https://api.mercadopago.com'+path,{...options,headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json',...options.headers}});if(!response.ok)throw new Error('Mercado Pago request failed ('+response.status+').');return response.json();};
 const readPayment=async paymentId=>{if(!/^\d{1,30}$/.test(String(paymentId)))throw new Error('Invalid payment identifier.');return request('/v1/payments/'+encodeURIComponent(paymentId));};
 const assessPayment=(data,{orderId,planId,collectorId})=>{const plan=PAYMENT_PLANS[planId];if(!plan)throw new Error('Unknown plan.');const matches=data.external_reference===orderId&&data.currency_id==='BRL'&&Number.isFinite(Number(data.transaction_amount))&&Math.round(Number(data.transaction_amount)*100)===plan.cents&&(!collectorId||String(data.collector_id)===String(collectorId));return {approved:matches&&data.status==='approved',matches,status:data.status,paymentId:String(data.id)};};
 return {
  readPayment,assessPayment,
  async createPreference({planId,orderId,email}){
   const plan=PAYMENT_PLANS[planId];if(!plan)throw new Error('Unknown plan.');if(!/^[a-zA-Z0-9_-]{16,100}$/.test(orderId))throw new Error('Use a server-generated order identifier.');if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Invalid email.');
   const data=await request('/checkout/preferences',{method:'POST',headers:{'X-Idempotency-Key':orderId},body:JSON.stringify({items:[{id:planId,title:plan.title,currency_id:'BRL',quantity:1,unit_price:plan.cents/100}],external_reference:orderId,...(email?{payer:{email}}:{}),back_urls:{success:origin.origin+'/?checkout=retorno',pending:origin.origin+'/?checkout=pendente',failure:origin.origin+'/?checkout=erro'},auto_return:'approved',notification_url:origin.origin+'/api/payments/mercadopago/webhook',statement_descriptor:'CAPIMIMO'})});
   const destination=new URL(data.init_point);if(destination.protocol!=='https:'||!/(^|\.)mercadopago\.com(?:\.br)?$/.test(destination.hostname))throw new Error('Unexpected checkout destination.');return {preferenceId:data.id,checkoutUrl:destination.href};
  },
  async verifyPayment({paymentId,orderId,planId,collectorId}){
   return assessPayment(await readPayment(paymentId),{orderId,planId,collectorId});
  }
 };
}

// Plug the official Mercado Pago SDK's WebhookSignatureValidator here, then use
// this verifier. Persist order state atomically in D1; never trust return URLs.
export async function processVerifiedWebhook({request,verifySignature,adapter,orders,secret}){
 if(!secret)throw new Error('MERCADOPAGO_WEBHOOK_SECRET is required.');
 const url=new URL(request.url),id=url.searchParams.get('data.id');if(!id||!/^\d{1,30}$/.test(id))return new Response('Invalid payment identifier',{status:400});
 try{await verifySignature({xSignature:request.headers.get('x-signature'),xRequestId:request.headers.get('x-request-id'),dataId:id,secret});}catch{return new Response('Invalid signature',{status:401});}
 const payment=await adapter.readPayment(id);const mapping=await orders.findByOrderId(payment.external_reference);if(!mapping)return new Response('Notification received',{status:200});
 const result=adapter.assessPayment(payment,{orderId:mapping.orderId,planId:mapping.planId,collectorId:mapping.collectorId});
 if(result.approved)await orders.approveOnce(mapping.orderId,result.paymentId);else if(result.matches&&['refunded','charged_back','cancelled'].includes(result.status))await orders.revokeOnce(mapping.orderId,result.paymentId);
 return new Response('Notification received',{status:200});
}
