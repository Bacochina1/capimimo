export class ApiError extends Error{constructor(status,message){super(message);this.status=status;}}
export const PLAN_LIMITS={mimo:{photos:3,pages:1,formats:['cartao'],guests:0},historia:{photos:12,pages:8,formats:['livro','cartao'],guests:0},celebrar:{photos:3,pages:1,formats:['convite'],guests:100}};
const occasions=['amizade','casamento','natal','maes','pais','aniversario','pascoa','namorados'];
const text=(value,max,name)=>{if(typeof value!=='string'||value.length>max)throw new ApiError(422,'Confira o campo '+name+'.');return value.trim();};
export function validateGift(value,planId,{publishing=false}={}){
 const limits=PLAN_LIMITS[planId];if(!limits||!value||typeof value!=='object'||Array.isArray(value))throw new ApiError(422,'Presente inválido.');
 if(!limits.formats.includes(value.format))throw new ApiError(422,'Este formato não está incluído no plano.');
 if(!occasions.includes(value.occasion))throw new ApiError(422,'Escolha uma ocasião válida.');
 if(!['capy','people'].includes(value.character))throw new ApiError(422,'Escolha um personagem válido.');
 if(!Number.isInteger(value.person)||value.person<0||value.person>11)throw new ApiError(422,'Escolha uma ilustração válida.');
 if(!/^#[0-9a-f]{6}$/i.test(value.color))throw new ApiError(422,'Cor inválida.');
 if(!['algodao','linho','kraft'].includes(value.texture)||!/^(natal|aniversario|casamento)-[0-3]$/.test(value.pattern))throw new ApiError(422,'Escolha um acabamento válido.');
 const recipient=text(value.recipient,60,'destinatário');if(!recipient&&publishing)throw new ApiError(422,'Escreva para quem é o presente.');
 const message=text(value.message??'',1200,'mensagem');
 const photoIds=value.photoIds??[];if(!Array.isArray(photoIds)||photoIds.length>limits.photos||new Set(photoIds).size!==photoIds.length||photoIds.some(id=>typeof id!=='string'||!/^[a-f0-9]{32}$/.test(id)))throw new ApiError(422,'Confira as fotos deste presente.');
 const pages=value.pages??[];if(!Array.isArray(pages)||pages.length>limits.pages)throw new ApiError(422,'Número de páginas acima do plano.');
 const cleanPages=pages.map(page=>{if(!page||typeof page!=='object')throw new ApiError(422,'Página inválida.');const photos=page.photoIds??[];if(!Array.isArray(photos)||photos.some(id=>!photoIds.includes(id)))throw new ApiError(422,'Foto da página não pertence ao presente.');return {title:text(page.title??'',80,'título'),message:text(page.message??'',1200,'mensagem da página'),photoIds:[...new Set(photos)]};});
 const eventDate=text(value.eventDate??'',10,'data'),eventPlace=text(value.eventPlace??'',160,'local');
 if(eventDate&&!/^\d{4}-\d{2}-\d{2}$/.test(eventDate))throw new ApiError(422,'Data inválida.');
 if(eventDate){const date=new Date(eventDate+'T12:00:00Z');if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==eventDate)throw new ApiError(422,'Data inválida.');}
 return {recipient,message,format:value.format,occasion:value.occasion,character:value.character,person:value.person,color:value.color,texture:value.texture,pattern:value.pattern,qrStyle:['carta','retrato','selo'].includes(value.qrStyle)?value.qrStyle:'carta',photoIds:[...photoIds],pages:cleanPages,eventDate,eventPlace};
}
export function sniffImage(bytes,claimed){
 const b=new Uint8Array(bytes);let mime;
 if(b.length>=12&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)mime='image/jpeg';
 if(b.length>=24&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v))mime='image/png';
 if(b.length>=30&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')mime='image/webp';
 if(!mime||mime!==claimed)throw new ApiError(415,'Envie uma foto JPG, PNG ou WebP válida.');return mime;
}
