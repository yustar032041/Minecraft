// Block/raycast/API mocks only: entity origins and ray selection shapes are
// not a substitute for Bedrock hitboxes, teleport physics, or multiplayer QA.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameMode,Difficulty,EntityDamageCause} from '@minecraft/server';
import {validRealmEnderRetreat} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender_retreat.js';
import {setupRealmEnders} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
const point={x:4.5,y:80,z:.5};
function floorWorld(){
 const rays=[];
 return {rays,isChunkLoaded:()=>true,getBlock:pos=>pos.y===79?{isAir:false,isLiquid:false,isWaterlogged:false,typeId:'minecraft:stone'}:{isAir:pos.y>=80&&pos.y<=82},
  getBlockFromRay:pos=>{rays.push({...pos});return {face:'Up',block:{location:{y:79}},faceLocation:{y:1}};}};
}
test('all eight authored collision boxes fit the landing check assumptions',()=>{
 for(let i=0;i<8;i++){
  const e=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/entities/ender_${i}.json`))['minecraft:entity'];
  assert.deepEqual(e.components['minecraft:collision_box'],{width:.65,height:2.75});
  assert.equal(e.components['minecraft:scale'],undefined);
 }
});
test('landing requires air, stable floor and five correctly placed support rays',()=>{
 const d=floorWorld();assert.equal(validRealmEnderRetreat(d,point),true);assert.equal(d.rays.length,5);
 assert.ok(d.rays.some(r=>r.x<point.x&&r.z<point.z));assert.ok(d.rays.some(r=>r.x>point.x&&r.z>point.z));
 for(const floor of [{isSolid:true},{isSolid:true,typeId:'minecraft:stone'}, {isSolid:true,isWaterlogged:true,typeId:'minecraft:stone'},
  {isSolid:true,isLiquid:true,isWaterlogged:false,typeId:'minecraft:stone'},...['magma','cactus','campfire','powder_snow','oak_leaves','pointed_dripstone'].map(x=>({isSolid:true,isWaterlogged:false,typeId:'minecraft:'+x}))]){
  const bad=floorWorld();const original=bad.getBlock;bad.getBlock=p=>p.y===79?floor:original(p);
  assert.equal(validRealmEnderRetreat(bad,point),false,`floor ${floor.typeId}`);
 }
 for(const failure of ['unloaded','low-ceiling','liquid-body','no-ray','side','half-slab','corner','throws']){
  const bad=floorWorld(),base=bad.getBlock,ray=bad.getBlockFromRay;
  if(failure==='unloaded')bad.isChunkLoaded=()=>false;
  if(failure==='low-ceiling')bad.getBlock=p=>p.y===82?{isAir:false}:base(p);
  if(failure==='liquid-body')bad.getBlock=p=>p.y===80?{isAir:false,isLiquid:true}:base(p);
  if(failure==='no-ray')bad.getBlockFromRay=()=>undefined;
  if(failure==='side')bad.getBlockFromRay=()=>({face:'North',block:{location:{y:79}},faceLocation:{y:1}});
  if(failure==='half-slab')bad.getBlockFromRay=()=>({face:'Up',block:{location:{y:79}},faceLocation:{y:.5}});
  if(failure==='corner')bad.getBlockFromRay=p=>p.x===point.x&&p.z===point.z?ray(p):undefined;
  if(failure==='throws')bad.getBlock=()=>{throw Error('unavailable')};
  assert.equal(validRealmEnderRetreat(bad,point),false,failure);
 }
 assert.equal(validRealmEnderRetreat({},point),false);assert.equal(validRealmEnderRetreat(d,{...point,x:NaN}),false);
});
function encounter({unsafe=false,occupied=false,otherEntity=false,blockFirst=false,realm=0}={}){
 const d=floorWorld(),teleports=[],particles=[];let mob;
 Object.assign(d,{id:'r',getPlayers:()=>occupied?[{}]:[],getEntities:opts=>opts.families?[mob]:otherEntity?[{id:'animal'}]:[],
  spawnParticle:(id,pos)=>particles.push([id,{...pos}])});
 const ray=d.getBlockFromRay;
 d.getBlockFromRay=pos=>(unsafe||blockFirst&&pos.x>3.6&&Math.abs(pos.z-.5)<1)?undefined:ray(pos);
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:8,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:()=>{}};
 mob={id:'mob',typeId:`hakkai:ender_${realm}`,isValid:true,dimension:d,location:{x:0,y:80,z:0},teleport:(pos,opts)=>{teleports.push([{...pos},opts]);mob.location={...pos};}};
 const system={currentTick:0},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};
 const ctrl=setupRealmEnders({world,system,report:(_,err)=>{throw err},safe:()=>true});
 ctrl.onHurt({hurtEntity:mob,damageSource:{damagingEntity:p,cause:EntityDamageCause.projectile}});ctrl.tick(p,0);
 return {teleports,particles};
}
test('an accepted projectile hit tries a checked landing, retaining original portal origin',()=>{
 for(let realm=0;realm<8;realm++){
  const f=encounter({realm});assert.equal(f.teleports.length,1);assert.deepEqual(f.teleports[0][1],{checkForBlocks:true});
  assert.deepEqual(f.particles[0][1],{x:0,y:80,z:0});assert.deepEqual(f.particles[1][1],f.teleports[0][0]);
 }
});
test('unsupported and occupied destinations cancel; a blocked first direction tries another',()=>{
 assert.equal(encounter({unsafe:true}).teleports.length,0);
 assert.equal(encounter({occupied:true}).teleports.length,0);
 assert.equal(encounter({otherEntity:true}).teleports.length,0);
 const f=encounter({blockFirst:true});assert.equal(f.teleports.length,1);assert.notDeepEqual(f.teleports[0][0],{x:4.5,y:80,z:.5});
});
