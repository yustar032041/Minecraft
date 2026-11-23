import assert from 'node:assert/strict';
import {skyRoute,skySiteRoute} from '../Hakkai_v7.1.0/BehaviorPack/scripts/terrain_features.js';
import {blendSiteHeight,seededSitePlans} from '../Hakkai_v7.1.0/BehaviorPack/scripts/natural_sites.js';
import {places} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
const noise=(x,z,scale,r,salt)=>Math.sin(x/scale+salt)*.5+Math.cos(z/scale-salt)*.5;
let checked=0;
for(let seed=0;seed<20;seed++){
 const plans=seededSitePlans(places,String(seed));
 for(const raw of places.filter(s=>s.dim===6&&s.id>=9&&s.id<=48)){
  const s={...raw,...plans.get(raw.id)},z=s.z,x=s.x;
  const zz=Math.round((z-20*Math.sin(x/116))/224)*224+20*Math.sin(x/116);
  const xx=Math.round((x-20*Math.sin(z/116))/224)*224+20*Math.sin(z/116);
  const target=Math.abs(zz-z)<=Math.abs(xx-x)?{x,z:zz}:{x:xx,z};
  const length=Math.hypot(target.x-x,target.z-z);if(length<5)continue;
  let prev;
  for(let k=0;k<=Math.floor(length);k++){
   const px=x+(target.x-x)*k/length,pz=z+(target.z-z)*k/length;
   const road=skySiteRoute(px,pz,[s],noise);assert.ok(road);assert.equal(road.siteId,s.id);
   const h=road.height;
   if(prev!==undefined)assert.ok(Math.abs(h-prev)<=1,`site ${s.id} ramp ${prev}/${h}`);prev=h;
  }
  assert.ok(skyRoute(target.x,target.z,noise).distance<1e-9,'route endpoint joins cloud route');
  checked++;
 }
}
assert.ok(checked>50);assert.equal(skySiteRoute(9000,9000,[places[43]],noise),undefined);
console.log('Sky sites: deterministic nearest cloud-route branches, endpoints and gradual ramp plans (pure simulation)');
