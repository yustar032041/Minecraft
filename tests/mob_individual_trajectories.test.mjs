// Geometry and collision simulations, not a Bedrock rendering/network test.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {isMovingProjectileTalent} from '../Hakkai_v7.1.0/BehaviorPack/scripts/attack_warning.js';
import {CREATURE_PATHS,TRAVELER_PATHS,attackPathOffset} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_attack_paths.js';
import {startMobProjectile,advanceMobProjectile} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_projectile.js';
const profiles=mobContentList.filter(p=>p.temper==='hostile'&&isMovingProjectileTalent(p.talent));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function dimension({blockAt,entityAt}={}){
 const rays=[],particles=[];
 return {rays,particles,isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),
  getBlockFromRay:(from,dir,{maxDistance})=>{
   rays.push({from:{...from},dir:{...dir},len:maxDistance});
   if(blockAt!==undefined&&from.x<blockAt&&from.x+dir.x*maxDistance>=blockAt){
    const k=(blockAt-from.x)/dir.x,at={x:blockAt,y:from.y+dir.y*k,z:from.z+dir.z*k};
    return {block:{location:at},faceLocation:{x:0,y:0,z:0}};
   }
  },
  getEntitiesFromRay:(from,dir,{maxDistance})=>{
   if(!entityAt||from.x>=entityAt.x||from.x+dir.x*maxDistance<entityAt.x)return [];
   const k=(entityAt.x-from.x)/dir.x;
   return Math.hypot(from.y+dir.y*k-entityAt.y,from.z+dir.z*k-entityAt.z)<.1?[{entity:entityAt.entity,distance:k}]:[];
  },spawnParticle:(id,pos)=>particles.push({id,pos:{...pos}})};
}
function launch(profile,aim={x:8,y:0,z:0}){return startMobProjectile({x:0,y:0,z:0},aim,10,12,profile);}
function run(profile,flight,d){let result;for(let t=11;t<80;t++){result=advanceMobProjectile(d,flight,t,'source','target',profile);if(result.done)return result;}assert.fail('projectile never ended');}

test('all moving profiles and travelers have an explicit supported path, with no stray ids',()=>{
 assert.equal(profiles.length,65);assert.deepEqual(Object.keys(CREATURE_PATHS).sort(),profiles.map(p=>p.id).sort());
 assert.equal(TRAVELER_PATHS.length,8);
 for(const p of [...profiles,...TRAVELER_PATHS.map((_,realm)=>({talent:'traveler',realm}))]){
  const f=launch(p);assert.ok(f,p.id??p.realm);assert.ok(attackPathOffset(f.path,.5,f.length));
 }
 assert.equal(launch({id:'unknown',talent:'frost'}),undefined);
 assert.equal(launch({talent:'traveler',realm:8}),undefined);
});
for(const profile of profiles)test(`${profile.id}: each visible segment is the raycast segment`,()=>{
 const d=dimension(),f=launch(profile),r=run(profile,f,d);assert.equal(r.hit,undefined);
 assert.equal(d.rays.length,f.frames);assert.ok(d.particles.length>=d.rays.length*2);
 for(const ray of d.rays){
  const points=d.particles.filter(p=>{
   const x=p.pos.x-ray.from.x,y=p.pos.y-ray.from.y,z=p.pos.z-ray.from.z;
   const k=x*ray.dir.x+y*ray.dir.y+z*ray.dir.z;
   return k>=-1e-8&&k<=ray.len+1e-8&&Math.hypot(x-ray.dir.x*k,y-ray.dir.y*k,z-ray.dir.z*k)<1e-8;
  });
  assert.ok(points.some(p=>Math.hypot(p.pos.x-ray.from.x,p.pos.y-ray.from.y,p.pos.z-ray.from.z)<1e-8));
  assert.ok(points.some(p=>Math.hypot(p.pos.x-ray.from.x-ray.dir.x*ray.len,p.pos.y-ray.from.y-ray.dir.y*ray.len,p.pos.z-ray.from.z-ray.dir.z*ray.len)<1e-8));
 }
 close(f.position.x,8);close(f.position.y,.8);close(f.position.z,0);
});
for(let realm=0;realm<8;realm++)test(`traveler ${realm}: realm path is rendered and raycast together`,()=>{
 const profile={talent:'traveler',realm},d=dimension(),f=launch(profile);
 run(profile,f,d);assert.equal(f.path,TRAVELER_PATHS[realm]);assert.equal(d.rays.length,f.frames);
 for(const ray of d.rays){
  assert.ok(d.particles.some(p=>Math.hypot(p.pos.x-ray.from.x,p.pos.y-ray.from.y,p.pos.z-ray.from.z)<1e-8));
  assert.ok(d.particles.some(p=>Math.hypot(p.pos.x-ray.from.x-ray.dir.x*ray.len,p.pos.y-ray.from.y-ray.dir.y*ray.len,p.pos.z-ray.from.z-ray.dir.z*ray.len)<1e-8));
 }
 close(f.position.x,8);close(f.position.y,.8);close(f.position.z,0);
});
test('all ten path forms have the intended lateral and vertical shape',()=>{
 const expected={straight:[0,0],leftArc:[-1,0],rightArc:[1,0],leftWave:[-1,0],rightWave:[1,0],loft:[0,1],loftLeft:[-1,1],loftRight:[1,1],clockLeft:[-1,1],clockRight:[1,1]};
 for(const [path,[side,up]] of Object.entries(expected)){
  const q=attackPathOffset(path,.25,8);assert.equal(Math.sign(q.side),side,path);assert.equal(Math.sign(q.up),up,path);
  const start=attackPathOffset(path,0,8),end=attackPathOffset(path,1,8);
  close(start.side,0);close(start.up,0);close(end.side,0);close(end.up,0);
 }
});
test('curved paths differ from the straight line and hit only on their actual segment',()=>{
 const profile=profiles.find(p=>CREATURE_PATHS[p.id]==='leftArc');
 const scout=dimension();run(profile,launch(profile),scout);
 const ray=scout.rays[Math.floor(scout.rays.length/2)],k=ray.len/2;
 const pos={x:ray.from.x+ray.dir.x*k,y:ray.from.y+ray.dir.y*k,z:ray.from.z+ray.dir.z*k};
 assert.ok(Math.abs(pos.z)>.5);
 const entity={id:'target',isValid:true,location:{x:pos.x,y:pos.y-.8,z:pos.z}};
 const curved=dimension({entityAt:{...pos,entity}});assert.equal(run(profile,launch(profile),curved).hit,entity);
 const straightProfile=profiles.find(p=>CREATURE_PATHS[p.id]==='straight');
 const straight=dimension({entityAt:{...pos,entity}});assert.equal(run(straightProfile,launch(straightProfile),straight).hit,undefined);
});
test('wall and nearer bystander stop a curved shot at the rendered contact',()=>{
 const profile=profiles.find(p=>CREATURE_PATHS[p.id]==='leftArc');
 const scout=dimension();run(profile,launch(profile),scout);const ray=scout.rays[4],k=ray.len/2;
 const pos={x:ray.from.x+ray.dir.x*k,y:ray.from.y+ray.dir.y*k,z:ray.from.z+ray.dir.z*k};
 for(const d of [dimension({blockAt:pos.x}),dimension({entityAt:{...pos,entity:{id:'bystander',isValid:true,location:pos}}})]){
  const result=run(profile,launch(profile),d);assert.equal(result.done,true);assert.equal(result.hit,undefined);
  const last=d.particles.at(-1).pos;close(last.x,pos.x);close(last.y,pos.y);close(last.z,pos.z);
 }
});
test('shots are independent and a skipped tick or changed profile cancels safely',()=>{
 const a=profiles.find(p=>CREATURE_PATHS[p.id]==='leftArc'),b=profiles.find(p=>CREATURE_PATHS[p.id]==='rightArc');
 const fa=launch(a),fb=launch(b),da=dimension(),db=dimension();
 for(let t=11;t<=13;t++){assert.equal(advanceMobProjectile(da,fa,t,'source','target',a).done,false);assert.equal(advanceMobProjectile(db,fb,t,'source','target',b).done,false);}
 assert.ok(fa.position.z*fb.position.z<0);
 assert.equal(advanceMobProjectile(da,fa,15,'source','target',a).done,true);
 assert.equal(advanceMobProjectile(db,fb,14,'source','target',a).done,true);
});
