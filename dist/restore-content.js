const hasText=value=>typeof value==='string'&&value.trim().length>0;
const hasFields=(value,keys)=>!!value&&keys.some(key=>hasText(value[key]));
const hasRows=(rows,keys)=>Array.isArray(rows)&&rows.some(row=>hasFields(row,keys));
const hasAudio=value=>!!value&&Number(value.size)>0;
// Only user content triggers the replacement warning; visual defaults do not.
export function hasDraftContent(state={}, {photo,media,audio,pendingAudio=false,pendingMedia=false}={}){
 if(hasFields(state,['recipient','message','eventDate','eventPlace'])||hasText(photo)||pendingAudio||pendingMedia)return true;
 if(Array.isArray(media?.gallery)&&media.gallery.some(item=>hasText(item?.src)))return true;
 if(hasAudio(audio?.blob)||Object.values(audio?.files||{}).some(item=>hasAudio(item?.blob)))return true;
 if(hasRows(state.pages,['title','message','photoId'])||hasRows(state.guests,['name'])||hasRows(state.replies,['message']))return true;
 const ex=state.experience||{};
 if(hasFields(ex,['sender','specialDate','city','letter','musicUrl'])||hasFields(ex.secret,['hint','answer','message']))return true;
 if(hasRows(ex.timeline,['when','message'])||hasRows(ex.openWhen,['title','message'])||hasRows(ex.collective,['name','message'])||Array.isArray(ex.wheel)&&ex.wheel.some(hasText))return true;
 return hasFields(state.storyDesign,['nickname','title','subtitle','closing'])||hasFields(state.stationeryDesign,['title','photoNote','closing'])||hasFields(state.printDesign,['message'])||hasFields(state.delivery,['when','note']);
}
export const restoredWeddingPath=format=>format==='convite'?'invite':'gift';
