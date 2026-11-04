import {createWritingAPI} from './ai-writing-api.mjs';
import {generateWriting} from './writing-cloudflare.mjs';
import {createHelpAPI} from './help.mjs';
import {createSupportAPI} from './support.mjs';
import {createCustomerAPI} from './customer.mjs';
import {createAdminAPI} from './admin.mjs';
import {createBillingAPI} from './billing.mjs';
import {publicPages} from './seo-routes.mjs';
const notFound=()=>new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Página não encontrada | Capimimo</title><h1>Esta página não foi encontrada.</h1><p><a href="/">Voltar ao Capimimo</a></p></html>',{status:404,headers:{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex','Cache-Control':'no-store'}});
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 const primary=env.SITE_ORIGIN?new URL(env.SITE_ORIGIN):null;
 if(primary&&url.hostname==='www.'+primary.hostname)return Response.redirect(primary.origin+url.pathname+url.search,308);
 // Preserve purchases and browser drafts on the explicitly configured legacy host.
 // Arbitrary Host/Origin headers cannot choose the provider return address.
 const billingEnv=env.SITE_LEGACY_ORIGIN&&url.origin===env.SITE_LEGACY_ORIGIN?{...env,SITE_ORIGIN:env.SITE_LEGACY_ORIGIN,SITE_CANONICAL_ORIGIN:env.SITE_ORIGIN}:env;
 if(path.startsWith('/api/writing/'))return createWritingAPI(env,{generate:env.NVIDIA_API_KEY?data=>generateWriting(env,data):null})(request);
 if(path.startsWith('/api/help/'))return createHelpAPI(env)(request);
 if(path.startsWith('/api/support/'))return createSupportAPI(env)(request);
 if(path.startsWith('/api/customer/'))return createCustomerAPI(env)(request);
 if(path.startsWith('/api/admin/'))return createAdminAPI(env)(request);
 if(['/admin','/admin/','/admin.html'].includes(path)){if(primary&&url.origin!==primary.origin)return Response.redirect(primary.origin+'/admin',308);url.pathname='/admin';const asset=await env.ASSETS.fetch(new Request(url,request));const response=new Response(asset.body,asset);response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");return response;}
 if(path.startsWith('/api/'))return createBillingAPI(billingEnv)(request);
 if(path==='/index.html'||path.endsWith('/index.html')&&publicPages.has(path.slice(0,-10)))return Response.redirect(url.origin+(path==='/index.html'?'/':path.slice(0,-10))+url.search,301);
 if(publicPages.has(path+'/'))return Response.redirect(url.origin+path+'/'+url.search,301);
 const privateGift=/^\/g\/[a-f0-9]{32}$/.test(path);
 if(path.startsWith('/g/')&&!privateGift)return notFound();
 // Static Assets serves HTML at its extensionless canonical path. Using
 // present.html here would leak its redirect and discard the gift's URL.
 if(privateGift)url.pathname='/present';
 const response=await env.ASSETS.fetch(new Request(url,request));
 const isHTML=(response.headers.get('Content-Type')||'').includes('text/html');
 // Assets are configured as an SPA. Do not return its homepage for missing URLs.
 if(isHTML&&!publicPages.has(path)&&!privateGift&&!['/present','/present.html'].includes(path))return notFound();
 const result=new Response(response.body,response);
 if(privateGift||['/present','/present.html'].includes(path)||url.searchParams.has('compra')||url.searchParams.has('painel')){
  result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  result.headers.set('Cache-Control','no-store');
  result.headers.set('Referrer-Policy','no-referrer');
 }
 return result;
},async scheduled(event,env,ctx){ctx.waitUntil(createBillingAPI(env).reconcileBatch());}};
