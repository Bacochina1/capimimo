import {cleanStoryDesign} from './story-design.js';
// Shared ordering for every downloadable Stories format.
export function storyScenes(data){return [{kind:'cover'},...(data.photos||[]).map((photo,photoIndex)=>({kind:'photo',photoIndex,duration:photo.duration||cleanStoryDesign(data.storyDesign).duration})),{kind:'ending'}];}
