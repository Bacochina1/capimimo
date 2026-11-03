import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import worker from '../server/worker.mjs';
import {publicPages} from '../server/seo-routes.mjs';
const root=new URL('../dist/',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const sitemap=read('sitemap.xml'),urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]));
assert.equal(urls.length,publicPages.size);
const origin=urls[0].origin;
for(const url of urls){
 assert.equal(url.origin,origin);assert.ok(publicPages.has(url.pathname));assert.equal(url.search,'');
 const html=read(url.pathname==='/'?'index.html':url.pathname.slice(1)+'index.html');
 assert.equal([...html.matchAll(/<title>/g)].length,1);
 assert.equal([...html.matchAll(/rel="canonical"/g)].length,1);
 assert.ok(html.includes('href="'+url.href+'"'));
 assert.ok(html.includes('content="index,follow,max-image-preview:large"'));
 assert.equal([...html.matchAll(/<h1[ >]/g)].length,1);
 assert.ok(html.includes('property="og:image"'));assert.ok(html.includes('name="twitter:card"'));
 const graphs=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
 assert.ok(graphs.length);for(const block of graphs){const data=JSON.parse(block[1]);assert.equal(data['@context'],'https://schema.org');assert.ok(data['@graph'].every(n=>n['@type']));assert.ok(!block[1].includes('aggregateRating'));}
 for(const m of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+|\/[^"?#]*\.css)"/g))assert.ok(existsSync(new URL(m[1].slice(1),root)),url.pathname+' missing '+m[1]);
 if(url.pathname!=='/'){assert.ok(html.includes('/?ocasiao='));assert.ok(html.includes('Fotografia ilustrativa'));}
}
assert.ok(read('robots.txt').includes('Sitemap: '+origin+'/sitemap.xml'));
assert.ok(read('present.html').includes('noindex,nofollow'));
// Emulate Cloudflare's SPA fallback to verify real 404s and private-route headers.
const env={ASSETS:{fetch:async request=>{const path=new URL(request.url).pathname;if(path==='/present.html')return Response.redirect(origin+'/present',301);const type=/\.(css|js|webp)$/.test(path)?'application/octet-stream':'text/html';return new Response('fixture',{headers:{'Content-Type':type}});}}};
for(const path of publicPages)assert.equal((await worker.fetch(new Request(origin+path),env)).status,200);
for(const path of ['/does-not-exist','/ocasioes/missing/','/g/not-a-gift','/missing.js.html'])assert.equal((await worker.fetch(new Request(origin+path),env)).status,404);
for(const path of ['/g/'+'a'.repeat(32),'/present.html','/?compra=private','/?painel=visual']){const response=await worker.fetch(new Request(origin+path),env);assert.match(response.headers.get('X-Robots-Tag'),/noindex/);assert.equal(response.headers.get('Cache-Control'),'no-store');}
assert.equal((await worker.fetch(new Request(origin+'/g/'+'a'.repeat(32)),env)).status,200,'Recipient shell must not redirect away from its gift ID');
for(const [from,to] of [['/index.html','/'],['/ocasioes/natal','/ocasioes/natal/'],['/ocasioes/natal/index.html','/ocasioes/natal/']]){const response=await worker.fetch(new Request(origin+from),env);assert.equal(response.status,301);assert.equal(response.headers.get('Location'),origin+to);}
console.log(`${urls.length} public pages: metadata, local assets, JSON-LD, sitemap, redirects, 404s and private exclusion. VERDICT: PASS`);
