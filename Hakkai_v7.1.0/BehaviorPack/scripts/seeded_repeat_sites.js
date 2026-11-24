// Repeat actual existing site structures in seed-selected 256-block cells.
// Separate keys prevent copies from sharing unique visit/founding records.
import {siteBounds,siteIntersects} from './natural_sites.js';
export const REPEAT_SITE_IDS=[
 [9,10,17,21,29,30,31,59], [20,22,32,33], [11,23,34,35], [12,24,36,37],
 [13,25,38,39,60], [14,19,26,40,41,42], [15,18,27,43,44,45], [16,28,46,47,48]
];
export const repeatKey=(r,gx,gz)=>`seed_repeat_${r}_${gx}_${gz}_v1`;
export function repeatSitePlan(places,r,gx,gz,hash){
 const ids=REPEAT_SITE_IDS[r];if(!ids||!Number.isInteger(gx)||!Number.isInteger(gz)||hash(gx,gz,r,3101)>=.9)return undefined;
 const q=hash(gx,gz,r,3107);
 // Factory structures are common in the grass realm, while all other old
 // locations still have equal seed-based opportunities in the remaining cells.
 const id=r===0&&q<.35?59:ids[Math.min(ids.length-1,Math.floor(hash(gx,gz,r,3113)*ids.length))];
 const template=places.find(s=>s.id===id&&s.dim===r);if(!template)return undefined;
 const x=gx*256+128+Math.floor(hash(gx,gz,r,3119)*49)-24;
 const z=gz*256+128+Math.floor(hash(gx,gz,r,3121)*49)-24;
 const site={...template,x,z,templateId:id,repeatKey:repeatKey(r,gx,gz)},b=siteBounds(site);
 // Respect all original, unique locations including reserved starting areas.
 if(places.some(s=>s.dim===r&&siteIntersects(s,b.x0-32,b.z0-32,b.x1+32,b.z1+32)))return undefined;
 // Legacy prepared central and frontier terrain must never become a copy.
 for(const [x0,z0,x1,z1] of [[23,-22,73,22],[288,-64,415,63]])
  if(b.x0<=x1+8&&b.x1>=x0-8&&b.z0<=z1+8&&b.z1>=z0-8)return undefined;
 return site;
}
// A copy is only attempted in an entirely untouched, unoccupied volume. Claim
// before placement: a crash or partial API failure is never replayed over blocks.
export async function placeRepeatSite({site,world,dimension,num,property,loaded,BlockVolume}){
 const b=siteBounds(site),key=site.repeatKey;
 const marked=()=>{for(let cx=Math.floor(b.x0/16);cx<=Math.floor(b.x1/16);cx++)for(let cz=Math.floor(b.z0/16);cz<=Math.floor(b.z1/16);cz++)if(num(world,`seed_land_${site.dim}_${cx}_${cz}_v1`)||num(world,`seed_land_${site.dim}_${cx}_${cz}_skip_v1`))return true;return false;};
 if(num(world,key))return 'finished';
 if(marked()){property(world,key,2);return 'blocked';}
 const from={x:b.x0,y:72,z:b.z0},to={x:b.x1,y:72+(site.size?46:34)-1,z:b.z1};
 try{return await loaded(dimension,from,to,async()=>{
  if(num(world,key))return 'finished';
  if(marked()){property(world,key,2);return 'blocked';}
  const occupied=dimension.getEntities({location:{x:site.x+.5,y:88,z:site.z+.5},maxDistance:(site.size??45)*1.5});
  if(occupied.some(e=>e?.isValid&&e.location.x>=b.x0-2&&e.location.x<=b.x1+2&&e.location.z>=b.z0-2&&e.location.z<=b.z1+2&&e.location.y>=from.y-3&&e.location.y<=to.y+3))return 'retry';
  if(dimension.getPlayers().some(p=>p.location.x>=b.x0-2&&p.location.x<=b.x1+2&&p.location.z>=b.z0-2&&p.location.z<=b.z1+2))return 'retry';
  if(dimension.containsBlock(new BlockVolume(from,to),{excludeTypes:['minecraft:air']})){property(world,key,2);return 'blocked';}
  property(world,key,2); // failure/partial placement remains blocked forever
  world.structureManager.place(`hakkai:site_${site.templateId}`,dimension,from,{includeEntities:false});
  property(world,key,1);return 'built';
 });}catch{return 'retry';}
}
