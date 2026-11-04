import test from 'node:test';
import assert from 'node:assert/strict';
import {plans} from '../dist/commerce.js';
import {BILLING_PLANS} from '../server/mercadopago-orders.mjs';

test('public prices and formats match the amounts used for payment',()=>{
 assert.deepEqual(plans.map(p=>p.id).sort(),Object.keys(BILLING_PLANS).sort());
 for(const plan of plans){
  const server=BILLING_PLANS[plan.id];
  assert.equal(plan.price,(server.cents/100).toFixed(2).replace('.',','),plan.id);
  assert.ok(server.formats.includes(plan.format),plan.id);
 }
});
test('QR card offers identify the deliverable as digital without physical shipment',()=>{
 for(const plan of plans.filter(p=>p.items.some(item=>/QR/i.test(item)))){
  const qr=plan.items.find(item=>/QR/i.test(item));
  assert.match(qr,/digital/i,plan.id);
  assert.match(qr,/sem envio físico/i,plan.id);
 }
});
