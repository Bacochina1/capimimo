// Ilustrações estáveis em células fixas; o movimento usa a mesma linha do tempo de 30 fps da caixa.
export function openingMascot(data={}){
 const primary={natal:0,pascoa:1,aniversario:2,casamento:3,maes:4,pais:5,avos:6,namorados:7,amizade:8,formatura:9,anonovo:10,outro:11};
 const family={amizade:'familia',aniversario:'aniversario',aniversario_namoro:'amor',mesversario:'aniversario',casamento:'casamento',bodas:'casamento',namorados:'amor',maes:'familia',pais:'familia',avos:'familia',natal:'natal',anonovo:'conquistas',pascoa:'pascoa',formatura:'conquistas',pedido_namoro:'amor',desculpas:'amor',pet:'pet',outro:'familia'};
 const style={natal:'natal',pascoa:'pascoa',aniversario:'aniversario',casamento:'casamento',familia:'familia',amor:'namorados',conquistas:'formatura',pet:'pet'};
 const occasion=data.occasion||'outro',chosen=data.openingStyle,kind=chosen&&chosen!=='default'&&chosen!==family[occasion]?(style[chosen]||occasion):occasion;
 const extra={aniversario_namoro:0,mesversario:1,bodas:2,pedido_namoro:3,desculpas:4,pet:5,familia:6};
 if(Object.hasOwn(extra,kind))return {path:'assets/opening-mascots-extra-v2.webp',index:extra[kind],columns:4,rows:2};
 return {path:'assets/opening-mascots-v2.webp',index:primary[kind]??11,columns:4,rows:3};
}
export function drawOpeningScene(ctx,atlas,mascot,frame,data={}){
 const n=Math.max(0,Math.min(89,Math.floor(frame)||0));ctx.clearRect(0,0,600,600);if(!atlas?.naturalWidth)return;
 // O mesmo atlas da caixa é partilhado por todos os temas para evitar cortes entre quadros.
 ctx.drawImage(atlas,n%10*320,Math.floor(n/10)*320,320,320,125,65,470,470);
 if(!mascot?.naturalWidth)return;const config=openingMascot(data),cellW=mascot.naturalWidth/config.columns,cellH=mascot.naturalHeight/config.rows,phase=n/89,bob=Math.sin(phase*Math.PI*2)*3,tilt=Math.sin(phase*Math.PI*2)*.025;
 let sourceY=Math.floor(config.index/config.columns)*cellH,sourceH=cellH;
 // A ponta da estrela de Ano-Novo avança alguns pixels sobre a margem entre linhas.
 if(config.rows===3&&config.index===10){sourceY-=8;sourceH+=8;}else if(config.rows===3&&config.index===6){sourceH-=8;}
 ctx.save();ctx.translate(110,411+bob);ctx.rotate(tilt);ctx.drawImage(mascot,(config.index%config.columns)*cellW,sourceY,cellW,sourceH,-105,-105,210,210);ctx.restore();
}
