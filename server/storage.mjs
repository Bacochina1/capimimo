// Prepared statements only; supports a Cloudflare D1 binding and the local
// SQLite compatibility adapter used by integration tests.
export function createRepository(db){
 if(!db?.prepare)throw new Error('Database binding is required.');
 return {
  first:(sql,params=[])=>db.prepare(sql).bind(...params).first(),
  all:async(sql,params=[])=>{const result=await db.prepare(sql).bind(...params).all();return result.results;},
  run:async(sql,params=[])=>{const result=await db.prepare(sql).bind(...params).run();return Number(result.meta?.changes??result.changes??0);},
  batch:statements=>db.batch(statements.map(({sql,params=[]})=>db.prepare(sql).bind(...params)))
 };
}
export function createObjectStore(bucket){
 if(!bucket?.put||!bucket?.get||!bucket?.delete)throw new Error('Object storage binding is required.');
 return {
  put:(key,bytes,mime)=>bucket.put(key,bytes,{httpMetadata:{contentType:mime}}),
  get:key=>bucket.get(key),
  delete:key=>bucket.delete(key)
 };
}
