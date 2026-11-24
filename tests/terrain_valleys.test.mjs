import assert from 'node:assert/strict';
import {valleyProfile} from '../Hakkai_v7.1.0/BehaviorPack/scripts/terrain_valleys.js';
const noise=(x,z,scale,r,salt)=>Math.sin(x/scale+r*.4+salt*.013)*.7;
for(const realm of [0,1,2,3,4,7]){
 let max=0,bed=0;
 for(let x=-800;x<=800;x+=5)for(let z=-400;z<=400;z+=5){
  const a=valleyProfile(realm,x,z,noise),b=valleyProfile(realm,x+1,z,noise),c=valleyProfile(realm,x,z+1,noise);max=Math.max(max,a.depth);if(a.top)bed++;
  assert.ok(a.depth>=0&&a.depth<=10);assert.ok(Math.abs(a.depth-b.depth)<1.5);assert.ok(Math.abs(a.depth-c.depth)<1.5);assert.deepEqual(a,valleyProfile(realm,x,z,noise));
 }
 assert.ok(max>5,realm+' valley has depth');assert.ok(bed>100,realm+' valley has continuous bed');
}
for(const realm of [-1,5,6,8])assert.equal(valleyProfile(realm,10,20,noise).depth,0);
const shifted=(x,z,scale,r,salt)=>noise(x,z,scale,r,salt+12);assert.ok(Array.from({length:101},(_,i)=>i*2-100).some(z=>valleyProfile(0,10,z,noise).depth!==valleyProfile(0,10,z,shifted).depth));
console.log('Six realm seeded dry valleys: bounded, smooth, continuous and deterministic (simulated)');
