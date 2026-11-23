import assert from 'node:assert/strict';
import {prepareWindRay,renderWindRay} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_wind_ray.js';
const gear={kind:'剣'};
function fixture(){
 const particles=[],queries=[];
 const d={id:'realm',isChunkLoaded:p=>{queries.push(p);return true;},getBlockFromRay:()=>undefined,getEntitiesFromRay:()=>[],spawnParticle:(...x)=>particles.push(x)};
 const p={id:'player',typeId:'minecraft:player',isValid:true,dimension:d,getHeadLocation:()=>({x:0,y:80,z:0}),getViewDirection:()=>({x:2,y:0,z:0})};
 const enemy={id:'enemy',typeId:'minecraft:zombie',isValid:true,getComponent:()=>({hasTypeFamily:s=>s==='monster'})};
 return {p,d,enemy,particles,queries};
}
{
 const {p,d,enemy,particles,queries}=fixture();d.getEntitiesFromRay=(origin,dir,opt)=>{
  assert.equal(dir.x,1);assert.equal(opt.ignoreBlockCollision,false);return [{entity:enemy,distance:4}];
 };
 const ray=prepareWindRay(p,gear);assert.equal(ray.distance,4);assert.equal(ray.target,enemy);assert.equal(queries.length,11);
 renderWindRay(p,ray);assert.ok(particles.length>6&&particles.length<=31);assert.ok(particles.every(([id])=>id==='hakkai:wind_trace'||id==='hakkai:wind_burst'));
}
{
 const {p,d,enemy}=fixture();d.getBlockFromRay=()=>({block:{location:{x:3,y:80,z:0}},faceLocation:{x:0,y:0,z:0}});
 d.getEntitiesFromRay=()=>[{entity:enemy,distance:4}];const ray=prepareWindRay(p,gear);
 assert.equal(ray.target,undefined);assert.ok(ray.distance<3,'wall stops visuals and damage');
}
for(const typeId of ['minecraft:player','minecraft:villager','hakkai:fushi']){
 const {p,d,enemy}=fixture(),friend={id:'friend',typeId,isValid:true,getComponent:()=>({hasTypeFamily:()=>false})};
 d.getEntitiesFromRay=()=>[{entity:enemy,distance:4},{entity:friend,distance:2}];
 const ray=prepareWindRay(p,gear);assert.equal(ray.target,undefined);assert.equal(ray.distance,2,'friend absorbs ray');
}
{
 const {p,d,enemy}=fixture();d.getEntitiesFromRay=()=>[{entity:p,distance:0},{entity:enemy,distance:2}];
 assert.equal(prepareWindRay(p,gear).target,enemy,'caster does not block own ray');
 for(const typeId of ['hakkai:time_warden','hakkai:ender_0','hakkai:fushi_chief']){
  enemy.typeId=typeId;assert.equal(prepareWindRay(p,gear).target,enemy);
 }
}
for(const fail of [f=>f.d.isChunkLoaded=()=>false,f=>f.d.getBlockFromRay=()=>{throw Error('unloaded')},f=>f.d.getEntitiesFromRay=()=>{throw Error('unsupported')},f=>f.d.getBlockFromRay=()=>({block:{location:{x:2,y:80,z:0}}}),f=>f.p.getViewDirection=()=>({x:0,y:0,z:0})]){
 const f=fixture();fail(f);assert.equal(prepareWindRay(f.p,gear),undefined,'unsafe/unavailable path fails closed');
}
assert.equal(prepareWindRay(fixture().p,{kind:'杖'}),undefined);
console.log('Wind ray: loaded path, direction, wall, friendly blockers, range and API failure OK (mocked)');
