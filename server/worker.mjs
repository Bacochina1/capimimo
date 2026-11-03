import {createBillingAPI} from './billing.mjs';
import {publicPages} from './seo-routes.mjs';
const notFound=()=>new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Página não encontrada | Capimimo</title><h1>Esta página não foi encontrada.</h1><p><a href="/">Voltar ao Capimimo</a></p></html>',{status:404,headers:{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex','Cache-Control':'no-store'}});
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path.startsWith('/api/'))return createBillingAPI(env)(request);
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
}};
