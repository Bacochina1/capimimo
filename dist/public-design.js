import {coverOptions} from './cover-catalog.js';
// Public artwork preferences only. Never copy private delivery notes or guest data.
export function cleanPublicDesign(data={},photos=data.photos||[]){
 const cover=(value,format)=>coverOptions(data.occasion,format).some(item=>item.id===value)?value:'';
 const raw=data.printDesign&&typeof data.printDesign==='object'?data.printDesign:{};
 return {selectedPhotoId:typeof data.selectedPhotoId==='string'&&Array.isArray(photos)&&photos.some(photo=>photo.id===data.selectedPhotoId)?data.selectedPhotoId:'',coverId:cover(data.coverId,data.format),qrStyle:['carta','retrato','selo'].includes(data.qrStyle)?data.qrStyle:'carta',qrCoverId:cover(data.qrCoverId,'cartao'),printDesign:{style:raw.style==='collection'&&cover(raw.coverId,'livro')?'collection':['editorial','polaroid','full'].includes(raw.style)?raw.style:!raw.style&&cover(raw.coverId,'livro')?'collection':'editorial',coverId:cover(raw.coverId,'livro'),message:typeof raw.message==='string'?raw.message.slice(0,240):'',photoId:Array.isArray(photos)&&photos.some(photo=>typeof photo.id==='string'&&photo.id===raw.photoId)?raw.photoId:''}};
}
