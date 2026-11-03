// Local development only. Hosted runtime uses D1/R2 through storage.mjs.
import {DatabaseSync} from 'node:sqlite';
import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
export async function openLocalDatabase(filename){
 await mkdir(dirname(resolve(filename)),{recursive:true});
 const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
 const version=db.prepare('PRAGMA user_version').get().user_version;
 const migrations=['0001_product.sql','0002_photo_integrity.sql','0003_pending_deletions.sql'];
 if(version>migrations.length){db.close();throw new Error('Unsupported database version.');}
 for(let index=version;index<migrations.length;index++){
  const schema=await readFile(fileURLToPath(new URL('./migrations/'+migrations[index],import.meta.url)),'utf8');
  db.exec('BEGIN IMMEDIATE');try{db.exec(schema);db.exec('PRAGMA user_version='+(index+1)+'; COMMIT;');}catch(error){db.exec('ROLLBACK');db.close();throw error;}
 }
 function prepare(sql){let params=[];const statement=db.prepare(sql);return {bind(...values){params=values;return this;},async first(){return statement.get(...params)??null;},async all(){return {results:statement.all(...params)};},async run(){const result=statement.run(...params);return {meta:{changes:Number(result.changes)}};}};}
 return {prepare,async batch(statements){db.exec('BEGIN IMMEDIATE');try{const results=[];for(const statement of statements)results.push(await statement.run());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}},close(){db.close();}};
}
export async function openLocalBucket(directory){
 const root=resolve(directory);await mkdir(root,{recursive:true});
 function path(key){if(typeof key!=='string'||!/^([a-f0-9]{32})\/([a-f0-9]{32})$/.test(key))throw new Error('Invalid object key.');const target=resolve(root,key);if(!target.startsWith(root+sep))throw new Error('Invalid object path.');return target;}
 return {
  async put(key,bytes){const target=path(key);await mkdir(dirname(target),{recursive:true});const temporary=target+'.'+crypto.randomUUID()+'.tmp';try{await writeFile(temporary,new Uint8Array(bytes),{flag:'wx'});await rename(temporary,target);}finally{await unlink(temporary).catch(error=>{if(error.code!=='ENOENT')throw error;});}},
  async get(key){try{const bytes=await readFile(path(key));return {body:bytes,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};}catch(error){if(error.code==='ENOENT')return null;throw error;}},
  async delete(key){try{await unlink(path(key));}catch(error){if(error.code!=='ENOENT')throw error;}}
 };
}
