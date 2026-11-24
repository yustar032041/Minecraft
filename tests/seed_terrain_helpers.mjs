import {realmPanorama} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_spectacles.js';
import {realmRelief} from '../Hakkai_v7.1.0/BehaviorPack/scripts/terrain_features.js';
import {createLandscapeField} from '../Hakkai_v7.1.0/BehaviorPack/scripts/landscape_regions.js';
import {valleyProfile} from '../Hakkai_v7.1.0/BehaviorPack/scripts/terrain_valleys.js';
import {extraBiomeAt} from '../Hakkai_v7.1.0/BehaviorPack/scripts/extra_biomes.js';
export function seedFunctions(seed){
 let sh=2166136261;for(const c of String(seed))sh=Math.imul(sh^c.charCodeAt(0),16777619)>>>0;
 const hash=(x,z,r,salt=0)=>{let h=(sh^Math.imul(x|0,0x9e3779b1)^Math.imul(z|0,0x85ebca6b)^Math.imul(r+1,0xc2b2ae35)^salt)>>>0;h=Math.imul(h^(h>>>16),0x7feb352d)>>>0;h=Math.imul(h^(h>>>15),0x846ca68b)>>>0;return ((h^(h>>>16))>>>0)/4294967295;};
 const noise=(x,z,scale,r,salt)=>{const fx=x/scale,fz=z/scale,x0=Math.floor(fx),z0=Math.floor(fz),s=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t,tx=s(fx-x0),tz=s(fz-z0);return lerp(lerp(hash(x0,z0,r,salt)*2-1,hash(x0+1,z0,r,salt)*2-1,tx),lerp(hash(x0,z0+1,r,salt)*2-1,hash(x0+1,z0+1,r,salt)*2-1,tx),tz);};
 const landscape=createLandscapeField(hash,noise),base=[88,87,85,91,88,76,94,84];
 const height=(r,x,z)=>{let h=noise(x+19*r,z-41*r,390,r,11)*17+noise(x+17*r,z-23*r,142,r,13)*13+noise(x-31*r,z+13*r,49,r,23)*8+noise(x+7*r,z-5*r,17,r,37)*3+realmRelief(r,x,z,noise)+landscape.sample(r,x,z)-valleyProfile(r,x,z,noise).depth;
  const extra=r===7&&noise(x,z,190,7,1181)>.22?undefined:extraBiomeAt(r,x,z,noise);if(extra)h+=extra.weight*(1.5+noise(x,z,120,r,1637)*2);if(r===5)h=h*.62+noise(x,z,33,r,47)*7;h+=realmPanorama(r,x,z,noise);return Math.round(Math.max(48,Math.min(145,base[r]+h)));};
 return {hash,noise,height};
}
