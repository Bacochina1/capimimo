const enc=new TextEncoder(),dec=new TextDecoder();
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const bytes=value=>Uint8Array.from(value.match(/.{2}/g)||[],part=>parseInt(part,16));
export const guestLinkVaultReady=secret=>typeof secret==='string'&&secret.length>=32;
const aad=(deliveryId,guestId)=>enc.encode(JSON.stringify(['capimimo-guest-link-v1',deliveryId,guestId]));
async function key(secret){if(!guestLinkVaultReady(secret))throw Error('Guest link vault unavailable');const raw=await crypto.subtle.digest('SHA-256',enc.encode('capimimo-guest-link-key-v1:'+secret));return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function sealGuestToken(secret,token,deliveryId,guestId){if(!/^[a-f0-9]{64}$/.test(token))throw Error('Invalid guest token');const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(deliveryId,guestId),tagLength:128},await key(secret),enc.encode(token));return 'v1:'+hex(iv)+':'+hex(new Uint8Array(cipher));}
export async function openGuestToken(secret,value,deliveryId,guestId){if(!guestLinkVaultReady(secret)||typeof value!=='string'||!/^v1:[a-f0-9]{24}:[a-f0-9]{160}$/.test(value))return null;try{const[,iv,cipher]=value.split(':'),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv),additionalData:aad(deliveryId,guestId),tagLength:128},await key(secret),bytes(cipher)),token=dec.decode(plain);return /^[a-f0-9]{64}$/.test(token)?token:null;}catch{return null;}}
