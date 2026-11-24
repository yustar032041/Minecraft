import assert from 'node:assert/strict';
import {test} from 'node:test';
import {caveInterval,solidIntervals} from '../Hakkai_v7.1.0/BehaviorPack/scripts/terrain_features.js';
import {seedFunctions} from './seed_terrain_helpers.mjs';
const {hash}=seedFunctions('731');
function old(realm,x,z,top,bottom){
 if(realm===6||top-bottom<12)return;
 const phase=hash(0,0,realm,619)*Math.PI*2;
 const xwarp=x+Math.sin(z/75+realm*.7+phase)*30,zwarp=z+Math.sin(x/90-realm*.8-phase)*27;
 const first=Math.abs(Math.sin(xwarp/61+realm*.81+phase)+.30*Math.sin(zwarp/92));
 const second=Math.abs(Math.sin(zwarp/74-realm*.68-phase)+.25*Math.sin(xwarp/82));
 const deep=realm===5&&top-bottom>=48,width=deep?.34:realm===5?.18:.095,dist=Math.hypot(first,second);
 const passage=first<=width||second<=width,chamber=Math.max(0,1-dist/(deep?.72:realm===5?.36:.27));
 if(!passage&&chamber===0)return;
 const entrance=Math.max(0,1-dist/(deep?.90:.28));
 const floor=Math.max(bottom+2,Math.round(top-(deep?48:realm===5?11:10)+entrance*(deep?47:9)));
 const lower=floor+1,upper=Math.min(passage?top:top-1,floor+(deep?22:4)+Math.round(chamber*(deep?10:2)));
 return lower<=upper?{lower,upper}:undefined;
}
test('new caves are larger and taller in each non-sky realm, remain smooth and ore-safe',()=>{
 for(const r of [0,1,2,3,4,5,7]){
  const top=r===5?76:96,bottom=r===5?0:60;let before=0,after=0,volumeBefore=0,volumeAfter=0,extra=0,entrances=0,maxHeight=0,min=top;
  for(let x=-250;x<=250;x+=2)for(let z=-250;z<=250;z+=2){
   const a=old(r,x,z,top,bottom),b=caveInterval(r,x,z,top,bottom,hash);
   if(a){before++;volumeBefore+=a.upper-a.lower+1;}
   if(b){after++;volumeAfter+=b.upper-b.lower+1;maxHeight=Math.max(maxHeight,b.upper-b.lower+1);min=Math.min(min,b.lower);if(!a)extra++;if(b.upper===top)entrances++;
    for(const [lo,hi] of solidIntervals(bottom,top,b))assert.ok(hi<b.lower||lo>b.upper);
    const n=caveInterval(r,x+1,z,top,bottom,hash);if(n)assert.ok(Math.abs(n.lower-b.lower)<=1,`realm ${r} floor slope`);
   }
  }
  assert.ok(after>before*1.35,`realm ${r} area ${before}->${after}`);
  assert.ok(volumeAfter>volumeBefore*1.5,`realm ${r} volume ${volumeBefore}->${volumeAfter}`);
  assert.ok(extra>1000&&entrances>0&&maxHeight>=(r===5?30:9));
  if(r===5)assert.ok(min<25,'deep cave descends below former floor');
  console.log(`realm ${r}: cave columns ${before}->${after}, air volume ${volumeBefore}->${volumeAfter}, max height ${maxHeight}`);
 }
 assert.equal(caveInterval(6,0,0,96,60,hash),undefined,'sky islands remain distinct');
});
