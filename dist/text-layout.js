// Shared typography for Canvas, Three.js textures and portable exports.
// Fit whole words before allowing character breaks; never discard a line.
export function drawWrapped(ctx,text,x,y,width,lineHeight,maxLines=10,options={}){
 const original=ctx.font,match=original.match(/(\d+(?:\.\d+)?)px/),base=match?Number(match[1]):32;
 const source=String(text??'').replace(/\r\n?/g,'\n').trim(),available=Math.max(1,Number(width)||1),limit=Math.max(1,maxLines),height=Number.isFinite(options.maxHeight)?Math.max(1,options.maxHeight):lineHeight*limit,minimum=Math.min(base,options.minSize||Math.max(8,base*.32));
 const paragraphs=source.split('\n'),words=source.split(/\s+/).filter(Boolean);let size=base,rows=[],brokenWords=false,leading=lineHeight;
 function layout(allowBreak){const result=[];brokenWords=false;for(const paragraph of paragraphs){if(!paragraph.trim()){result.push('');continue;}let row='';for(const word of paragraph.trim().split(/\s+/)){const parts=[];if(allowBreak&&ctx.measureText(word).width>available){let part='';for(const char of Array.from(word)){if(part&&ctx.measureText(part+char).width>available){parts.push(part);part=char;}else part+=char;}if(part)parts.push(part);brokenWords=true;}else parts.push(word);for(const part of parts){const candidate=row?row+' '+part:part;if(row&&ctx.measureText(candidate).width>available){result.push(row);row=part;}else row=candidate;}}if(row)result.push(row);}return result;}
 function calculate(){ctx.font=original.replace(/\d+(?:\.\d+)?px/,size+'px');const long=words.some(word=>ctx.measureText(word).width>available);rows=layout(size<=minimum&&long);leading=lineHeight*size/base;return rows.length<=limit&&rows.length*leading<=height&&rows.every(row=>ctx.measureText(row).width<=available+.1);}
 let fit=calculate();if(!fit){let low=minimum,high=base;size=minimum;fit=calculate();if(fit){for(let i=0;i<9;i++){size=(low+high)/2;if(calculate())low=size;else high=size;}size=Math.max(minimum,Math.floor(low*2)/2);fit=calculate();}}
 // Extreme pasted content still gets a complete, bounded rendering, without ellipses.
 while(!fit&&size>1){size=Math.max(1,size-.5);ctx.font=original.replace(/\d+(?:\.\d+)?px/,size+'px');rows=layout(true);leading=Math.min(lineHeight*size/base,height/Math.max(1,rows.length));fit=rows.every(row=>ctx.measureText(row).width<=available+.1)&&rows.length*leading<=height+.1;if(rows.length>limit&&size>1)fit=false;}
 const measuredWidth=Math.max(0,...rows.map(row=>ctx.measureText(row).width)),usedHeight=rows.length?size+(rows.length-1)*leading:0;
 const metrics={lines:rows.length,fontSize:size,lineHeight:leading,width:measuredWidth,height:usedHeight,rows:[...rows],brokenWords,fit:fit&&usedHeight<=height+.5};
 if(options.background&&rows.length){const left=ctx.textAlign==='left'||ctx.textAlign==='start'?x:ctx.textAlign==='right'||ctx.textAlign==='end'?x-measuredWidth:x-measuredWidth/2;const color=ctx.fillStyle;ctx.fillStyle=options.background;ctx.fillRect(left-10,y-6,measuredWidth+20,Math.min(height,rows.length*leading)+12);ctx.fillStyle=color;}
 rows.forEach((row,i)=>ctx.fillText(row,x,y+i*leading));ctx.font=original;return metrics;
}
