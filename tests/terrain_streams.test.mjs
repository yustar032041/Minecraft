import assert from 'node:assert/strict';
import {streamPlan} from '../Hakkai_v7.1.0/BehaviorPack/scripts/terrain_streams.js';
import {realmRelief} from '../Hakkai_v7.1.0/BehaviorPack/scripts/terrain_features.js';
import {createLandscapeField} from '../Hakkai_v7.1.0/BehaviorPack/scripts/landscape_regions.js';
import {valleyProfile} from '../Hakkai_v7.1.0/BehaviorPack/scripts/terrain_valleys.js';
import {extraBiomeAt} from '../Hakkai_v7.1.0/BehaviorPack/scripts/extra_biomes.js';
import {seedFunctions} from './seed_terrain_helpers.mjs';
const key=p=>`${p.x},${p.z}`;
for(const r of [0,1,2,3,4,7]){
 let count=0;for(const seed of ['0','731','-11']){
  const {hash,noise,height}=seedFunctions(seed);
  for(let cx=-24;cx<24;cx++)for(let cz=-24;cz<24;cz++){
   const plan=streamPlan(r,cx,cz,hash,height,noise);if(!plan)continue;count++;
   assert.deepEqual(plan,streamPlan(r,cx,cz,hash,height,noise));assert.equal(plan.frozen,r===3);assert.equal(plan.cells.length,36);
   const cells=new Set(plan.cells.map(key)),rim=new Set(plan.rim.map(key));
   for(const p of plan.cells){
    assert.equal(Math.floor(p.x/16),cx);assert.equal(Math.floor(p.z/16),cz);assert.ok(p.x>=cx*16+2&&p.x<=cx*16+13&&p.z>=cz*16+2&&p.z<=cz*16+13);assert.ok(height(r,p.x,p.z)>=plan.floor);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])assert.ok(cells.has(key({x:p.x+dx,z:p.z+dz}))||rim.has(key({x:p.x+dx,z:p.z+dz})));
   }
   for(const p of plan.rim){assert.ok(height(r,p.x,p.z)>=plan.level);assert.equal(Math.floor(p.x/16),cx);assert.equal(Math.floor(p.z/16),cz);}
  }
 }
 assert.ok(count>2,`realm ${r}: too few real terrain stream candidates: ${count}`);console.log(`Realm ${r}: ${count} contained stream candidates across 3 seeds`);
}
const {hash,noise,height}=seedFunctions(731);for(const r of [5,6])assert.equal(streamPlan(r,0,0,hash,height,noise),undefined);
