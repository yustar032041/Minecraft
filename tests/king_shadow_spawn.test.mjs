import assert from 'node:assert/strict';
import fs from 'node:fs';
import {KING_SHADOW_SUMMONS,findKingShadowSpawn} from '../Hakkai_v7.1.0/BehaviorPack/scripts/king_summon_positions.js';
const aim={x:.5,y:80,z:.5},angle=0;
for(const shape of KING_SHADOW_SUMMONS){
 const e=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/entities/${shape.type}.json`))['minecraft:entity'];
 assert.deepEqual(e.components['minecraft:collision_box'],{width:shape.width,height:shape.height},`${shape.type} spawn clearance matches collision`);
 const calls=[],safe={isChunkLoaded:()=>true,getEntities:()=>[],getBlock:p=>{calls.push(p);return p.y===79?{isAir:false,isLiquid:false,isWaterlogged:false,typeId:'minecraft:stone'}:{isAir:true}},
  getBlockFromRay:origin=>({face:'Up',block:{location:{x:Math.floor(origin.x),y:79,z:Math.floor(origin.z)}},faceLocation:{x:0,y:1,z:0}})};
 const pos=findKingShadowSpawn(safe,aim,angle,shape);assert.deepEqual(pos,{x:5.5,y:80,z:.5});assert.ok(calls.length>=2);
 assert.equal(findKingShadowSpawn({...safe,isChunkLoaded:()=>false},aim,angle,shape),undefined,'unloaded chunks');
 assert.equal(findKingShadowSpawn({...safe,getBlock:()=>undefined},aim,angle,shape),undefined,'missing blocks');
 assert.equal(findKingShadowSpawn({...safe,getBlock:p=>p.y===79?{isSolid:false}:{isAir:true}},aim,angle,shape),undefined,'floor is not solid');
 assert.equal(findKingShadowSpawn({...safe,getBlock:p=>p.y===79?{isSolid:true,isWaterlogged:false,typeId:'minecraft:stone'}:{isAir:false}},aim,angle,shape),undefined,'blocked or water-filled body space');
 for(const floor of [{isSolid:true},{isSolid:true,typeId:'minecraft:stone'}, {isSolid:true,isWaterlogged:true,typeId:'minecraft:stone'}, {isSolid:true,isLiquid:true,isWaterlogged:false,typeId:'minecraft:stone'},...['magma','cactus','campfire','soul_campfire','oak_leaves','powder_snow','rail','oak_pressure_plate','pointed_dripstone'].map(typeId=>({isSolid:true,isWaterlogged:false,typeId:'minecraft:'+typeId}))]){
  assert.equal(findKingShadowSpawn({...safe,getBlock:p=>p.y===79?floor:{isAir:true}},aim,angle,shape),undefined,`refuses hazardous, liquid or unidentified floor: ${floor.typeId}`);
 }
 assert.equal(findKingShadowSpawn({...safe,getEntities:()=>[{id:'occupied'}]},aim,angle,shape),undefined,'occupied locations');
 assert.equal(findKingShadowSpawn({...safe,getBlock:()=>{throw Error('unavailable')}},aim,angle,shape),undefined,'API failures');
 for(const ray of [()=>undefined,()=>{throw Error('unavailable')},()=>({face:'North',block:{location:{y:79}},faceLocation:{y:1}}),()=>({face:'Up',block:{location:{y:79}},faceLocation:{y:.5}}),()=>({face:'Up',block:{location:{}},faceLocation:{y:1}})]){
  assert.equal(findKingShadowSpawn({...safe,getBlockFromRay:ray},aim,angle,shape),undefined,'unknown, side or partial support is refused');
 }
 const raySamples=[];const sampled=findKingShadowSpawn({...safe,getBlockFromRay:p=>{raySamples.push(p);return safe.getBlockFromRay(p);}},aim,angle,shape);
 assert.ok(sampled);assert.equal(raySamples.length,5,'centre and four corners are sampled');
 const badCorner=findKingShadowSpawn({...safe,getBlockFromRay:p=>{
  // Only the exact candidate centre has support; corners are over an edge.
  return Math.abs(Math.hypot(p.x-aim.x,p.z-aim.z)-5)<1e-8?safe.getBlockFromRay(p):undefined;
 }},aim,angle,shape);
 assert.equal(badCorner,undefined,'a supported centre alone cannot permit an unsupported footprint');
 const alt=findKingShadowSpawn({...safe,getEntities:({location})=>location.x>5.4?[{id:'player'}]:[]},aim,angle,shape);
 assert.ok(alt&&Math.hypot(alt.x-aim.x,alt.z-aim.z)<=5.000001,'tries an unoccupied candidate inside warning');
 const reserved=findKingShadowSpawn(safe,aim,angle,shape,[pos]);assert.ok(reserved&&Math.hypot(reserved.x-pos.x,reserved.z-pos.z)>=2,'two summons cannot share a reserved location');
}
assert.equal(findKingShadowSpawn({},aim,0,KING_SHADOW_SUMMONS[0]),undefined);
assert.equal(findKingShadowSpawn({},aim,0,{width:NaN,height:1}),undefined);
console.log('King shadow spawn: fixed warning, actual collision clearance, unloaded/obstructed/occupied refusal and alternatives (mocked)');
