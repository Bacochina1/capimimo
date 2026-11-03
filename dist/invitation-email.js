// Produces a draft. No message is transmitted from this local application.
export function validGuestEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||''))&&String(value).length<=254;}
export async function invitationEmail(data,guest,invitation){
 if(!validGuestEmail(guest.email))throw Error('Confira o e-mail do convidado.');
 const bytes=new Uint8Array(await invitation.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
 const encode=value=>{const utf8=new TextEncoder().encode(value);return btoa(String.fromCharCode(...utf8));},fold=value=>value.match(/.{1,76}/g)?.join('\r\n')||'',boundary='capimimo_'+crypto.randomUUID().replaceAll('-','');
 const subject='Um convite de '+(data.recipient||'quem gosta de você'),message='Olá, '+guest.name+'!\n\n'+(data.recipient||'Nós')+' convidam você para celebrar.\n'+[data.eventDate,data.eventPlace].filter(Boolean).join(' · ')+'\n\nO seu convite personalizado está no arquivo HTML em anexo. Salve e abra no navegador para ver as fotos, ampliar o convite e guardar a data.\n\nPara responder, use a confirmação do convite e nos devolva o arquivo gerado.\n\nCom carinho!';
 const lines=['X-Unsent: 1','To: '+guest.email,'Subject: =?UTF-8?B?'+encode(subject)+'?=','MIME-Version: 1.0','Content-Type: multipart/mixed; boundary="'+boundary+'"','','--'+boundary,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',fold(encode(message)),'--'+boundary,'Content-Type: text/html; name="convite-capimimo.html"','Content-Disposition: attachment; filename="convite-capimimo.html"','Content-Transfer-Encoding: base64','',fold(btoa(binary)),'--'+boundary+'--',''];
 return new Blob([lines.join('\r\n')],{type:'message/rfc822'});
}
