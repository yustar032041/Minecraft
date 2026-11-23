import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createLandscapeField} from '../Hakkai_v7.1.0/BehaviorPack/scripts/landscape_regions.js';
function make(seed){
 let sh=2166136261;for(const c of String(seed))sh=Math.imul(sh^c.charCodeAt(0),16777619)>>>0;
 const hash=(x,z,r,salt=0)=>{let h=(sh^Math.imul(x|0,0x9e3779b1)^Math.imul(z|0,0x85ebca6b)^Math.imul(r+1,0xc2b2ae35)^salt)>>>0;h=Math.imul(h^(h>>>16),0x7feb352d)>>>0;h=Math.imul(h^(h>>>15),0x846ca68b)>>>0;return ((h^(h>>>16))>>>0)/4294967295;};
 const smooth=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t;
 const noise=(x,z,scale,r,salt)=>{const fx=x/scale,fz=z/scale,x0=Math.floor(fx),z0=Math.floor(fz),tx=smooth(fx-x0),tz=smooth(fz-z0);return lerp(lerp(hash(x0,z0,r,salt)*2-1,hash(x0+1,z0,r,salt)*2-1,tx),lerp(hash(x0,z0+1,r,salt)*2-1,hash(x0+1,z0+1,r,salt)*2-1,tx),tz);};
 return createLandscapeField(hash,noise);
}
const start=performance.now();
for(const seed of [0,731,'another-seed'])for(let r=0;r<8;r++){
 const f=make(seed),other=make(seed),modes=new Set();let min=Infinity,max=-Infinity,large=0,count=0,maxSlope=0;
 for(let gx=-5;gx<=5;gx++)for(let gz=-5;gz<=5;gz++)modes.add(f.feature(r,gx,gz).mode);
 assert.ok(modes.size>=4,`seed ${seed} realm ${r} shapes`);
 for(let x=-960;x<=960;x+=24)for(let z=-960;z<=960;z+=24){
  const v=f.sample(r,x,z);assert.ok(Number.isFinite(v)&&v>=-38&&v<=46);min=Math.min(min,v);max=Math.max(max,v);count++;if(Math.abs(v)>5)large++;
  assert.equal(v,other.sample(r,x,z));maxSlope=Math.max(maxSlope,Math.abs(v-f.sample(r,x+1,z)),Math.abs(v-f.sample(r,x,z+1)));
 }
 assert.ok(min< -8&&max>12&&large/count>.12,`insufficient variation seed ${seed} realm ${r}`);
 assert.ok(maxSlope<5,`sharp field discontinuity ${maxSlope}`);
 // Explicitly check both sides of the origin and region-cell boundaries.
 for(const edge of [-480,-240,0,240,480])for(let z=-300;z<=300;z+=13)assert.ok(Math.abs(f.sample(r,edge-.001,z)-f.sample(r,edge+.001,z))<.05);
}
assert.notEqual(make(1).sample(0,42,-127),make(2).sample(0,42,-127));
console.log(`Landscape field: 3 seeds, 8 realms, shape variety, bounds, seams and local slope OK (${((performance.now()-start)/1000).toFixed(2)}s, Node only)`);
