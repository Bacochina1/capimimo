// One layout contract for paper and WebGL textures: preserve all text and aspect.
export function drawWrapped(ctx,text,x,y,width,lineHeight,maxLines=10){
 const original=ctx.font,match=original.match(/(\d+(?:\.\d+)?)px/),base=match?Number(match[1]):32;let size=base,rows=[];
 const layout=()=>{const result=[];for(const paragraph of String(text).split('\n')){if(!paragraph){result.push('');continue;}let line='';for(const word of paragraph.split(/\s+/)){const pieces=[];if(ctx.measureText(word).width>width){let part='';for(const char of Array.from(word)){if(ctx.measureText(part+char).width>width&&part){pieces.push(part);part=char;}else part+=char;}if(part)pieces.push(part);}else pieces.push(word);for(const piece of pieces){const next=line?line+' '+piece:piece;if(ctx.measureText(next).width>width&&line){result.push(line);line=piece;}else line=next;}}if(line)result.push(line);}return result;};
 rows=layout();while(rows.length>maxLines&&size>12){size--;ctx.font=original.replace(/\d+(?:\.\d+)?px/,size+'px');rows=layout();}
 const leading=Math.min(lineHeight,Math.max(size*1.2,lineHeight*size/base));rows.forEach((row,i)=>ctx.fillText(row,x,y+i*leading));ctx.font=original;return {lines:rows.length,fontSize:size};
}
