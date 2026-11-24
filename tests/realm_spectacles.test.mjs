import assert from 'node:assert/strict';import fs from 'node:fs';
import {REALM_LANDSCAPES,REALM_SURFACES,realmPanorama,realmSurface,spectaclePlan,cavernHangingPlan} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_spectacles.js';
import {seedFunctions} from './seed_terrain_helpers.mjs';
assert.equal(new Set(REALM_LANDSCAPES).size,8);
for(const seed of ['1','731','other']){
 const {hash,noise}=seedFunctions(seed);
 for(let r=0;r<8;r++){
  let max=-Infinity,min=Infinity,maxStep=0,count=0;const surfaces=new Set();
  for(let x=-600;x<=600;x+=15)for(let z=-600;z<=600;z+=15){
   const a=realmPanorama(r,x,z,noise);surfaces.add(realmSurface(r,x,z,noise,hash));min=Math.min(min,a);max=Math.max(max,a);
   assert.ok(Number.isFinite(a)&&a>=-20&&a<=30);count+=Math.abs(a)>2;
   maxStep=Math.max(maxStep,Math.abs(a-realmPanorama(r,x+1,z,noise)),Math.abs(a-realmPanorama(r,x,z+1,noise)));
  }
  assert.ok(surfaces.has(undefined)&&REALM_SURFACES[r].every(v=>surfaces.has(v)),`realm ${r} surface patches`);
  assert.ok(max>4&&count>30,`${seed} r${r}: ${min} to ${max}, ${count}`);
  assert.ok(maxStep<2,`${seed} r${r} local height step ${maxStep}`);
  for(const edge of [-32,-16,0,16,32])assert.ok(Math.abs(realmPanorama(r,edge-.001,300,noise)-realmPanorama(r,edge+.001,300,noise))<.02);
  let planned=0;for(let cx=-20;cx<=20;cx++)for(let cz=-20;cz<=20;cz++)if(spectaclePlan(r,cx,cz,hash).length)planned++;
  assert.ok(planned>400&&planned<850,`${seed} ${r} distribution ${planned}`);
 }
}
// Force all 24 variants and all orientations, even if a seed never picks one.
for(let r=0;r<8;r++)for(let variant=0;variant<3;variant++)for(let rotation=0;rotation<4;rotation++){
 const hash=(_x,_z,_r,salt)=>salt===1901?0:salt===1907?(variant+.1)/3:salt===1913?(rotation+.1)/4:.5;
 const p=spectaclePlan(r,-3,4,hash);assert.ok(p.length>=25&&p.length<=600,`${r}/${variant}: ${p.length}`);
 assert.deepEqual(p,spectaclePlan(r,-3,4,hash));
 assert.equal(new Set(p.map(q=>`${q.x},${q.y},${q.z}`)).size,p.length);
 assert.ok(p.every(q=>q.x>=-48&&q.x< -32&&q.z>=64&&q.z<80&&q.y>=1&&q.y<=23));
 for(const q of p)if(q.type.startsWith('hakkai:'))assert.ok(fs.existsSync(`Hakkai_v7.1.0/BehaviorPack/blocks/${q.type.slice(7)}.json`),q.type);
}
assert.deepEqual(spectaclePlan(0,0,0,()=>1),[]);assert.equal(realmPanorama(-1,0,0,()=>1),0);
for(const seed of ['1','731']){
 const {hash}=seedFunctions(seed);let count=0;
 for(let cx=-20;cx<=20;cx++)for(let cz=-20;cz<=20;cz++)for(const p of cavernHangingPlan(cx,cz,hash)){
  count++;assert.ok(p.x>=cx*16+2&&p.x<=cx*16+13&&p.z>=cz*16+2&&p.z<=cz*16+13);assert.ok(p.length>=3&&p.length<=9);
 }
 assert.ok(count>1000);
}
console.log('8 seeded panorama fields, 24 chunk-contained silhouettes × 4 rotations, cavern ceiling plans (pure/mocked)');
