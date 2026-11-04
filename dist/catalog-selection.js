export function coverTone(cover){
 const hex=cover.appearance.paper.slice(1);const rgb=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.25?'light':'dark';
}
export function selectCovers(options,{layout='all',tone='all',recommended=false}={}){
 const matches=options.filter(c=>(layout==='all'||c.layout===layout)&&(tone==='all'||coverTone(c)===tone));
 if(!recommended)return matches;
 // Compare distinct compositions first, rather than three colors of one design.
 const picked=[],layouts=new Set();for(const cover of matches){if(layouts.has(cover.layout))continue;picked.push(cover);layouts.add(cover.layout);if(picked.length===3)break;}
 for(const cover of matches){if(picked.length===3)break;if(!picked.includes(cover))picked.push(cover);}return picked;
}
