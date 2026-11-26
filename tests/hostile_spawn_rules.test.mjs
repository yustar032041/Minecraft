import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inFactoryVillage,nearArtificialLight,disallowHostileSpawn,suppressVanillaSpawn } from '../Hakkai_v7.1.0/BehaviorPack/scripts/hostile_spawn_rules.js';
const factory={id:59,x:100,z:-50,size:97};
const ctx={factory,world:{},num:()=>1,repeatSiteAt:(_,x,z)=>x>=500&&x<=596&&z>=500&&z<=596?{id:59}:undefined};
function dimension(id='hakkai:realm_0',sources=[],blocked=false){
 const d={id,getLightLevel:()=>15,getBlocks(volume,filter,allow){
  assert.equal(allow,true);return {getBlockLocationIterator:()=>sources.filter(p=>p.x>=volume.from.x&&p.x<=volume.to.x&&p.y>=volume.from.y&&p.y<=volume.to.y&&p.z>=volume.from.z&&p.z<=volume.to.z&&filter.includeTypes.includes(p.typeId))[Symbol.iterator]()};
 },getBlock:p=>sources.find(q=>q.x===p.x&&q.y===p.y&&q.z===p.z),getBlockFromRay:()=>blocked?{}:undefined};return d;
}
const pt=(x,z,y=88)=>({x,y,z});
const torch=(x,y,z,typeId='minecraft:torch')=>({x,y,z,typeId});
test('original and repeat village footprints include edge blocks and all heights',()=>{
 assert.equal(inFactoryVillage(dimension(),pt(148.9,-2.1),ctx),true);
 assert.equal(inFactoryVillage(dimension(),pt(149,-50),ctx),false);
 assert.equal(inFactoryVillage(dimension(),pt(500,500,-50),ctx),true);
 assert.equal(inFactoryVillage(dimension('minecraft:overworld'),pt(100,-50),ctx),false);
 assert.equal(inFactoryVillage(dimension(),pt(100,-50),{...ctx,num:()=>0}),false);
});
test('only nearby visible artificial lights suppress, not daylight or distant / obstructed lamps',()=>{
 const p=pt(0,0),far=torch(8,88,0),near=torch(7,88,0);
 assert.equal(nearArtificialLight(dimension(),p),false,'sunlight alone is not a torch');
 assert.equal(nearArtificialLight(dimension(undefined,[near]),p),true,'within torch radius');
 assert.equal(nearArtificialLight(dimension(undefined,[far]),p),false,'torch outside radius');
 assert.equal(nearArtificialLight(dimension(undefined,[torch(4,88,4)]),p),false,'Manhattan distance exceeds radius');
 assert.equal(nearArtificialLight(dimension(undefined,[torch(3,88,0)],true),p),false,'solid wall blocks line of sight');
 assert.equal(nearArtificialLight(dimension(undefined,[torch(5,88,0,'minecraft:soul_torch')]),p),true);
 assert.equal(nearArtificialLight(dimension(undefined,[torch(4,88,0,'minecraft:redstone_torch')]),p),false);
 const unlit={...torch(1,88,0,'minecraft:campfire'),permutation:{getState:()=>true}};
 assert.equal(nearArtificialLight(dimension(undefined,[unlit]),p),false);
 const invalid={id:'minecraft:overworld',getBlocks(){throw Error()}};
 assert.equal(disallowHostileSpawn(invalid,p,ctx),false,'inspection failure does not suppress');
 assert.equal(disallowHostileSpawn(dimension(),pt(100,-50),ctx),true,'factory still protected');
});
test('the source block hit on a diagonal ray is not mistaken for a wall',()=>{
 const p=pt(0,0),light=torch(3,88,3,'minecraft:sea_lantern'),d=dimension(undefined,[light]);
 d.getBlockFromRay=()=>({block:{location:{x:3,y:88,z:3}}});
 assert.equal(nearArtificialLight(d,p),true,'diagonal ray intersecting the sea lantern itself');
 d.getBlockFromRay=()=>({block:{location:{x:1,y:88,z:1}}});
 assert.equal(nearArtificialLight(d,p),false,'an intervening wall still blocks the ray');
 d.getBlockFromRay=()=>({});
 assert.equal(nearArtificialLight(d,p),false,'unknown ray hit is not treated as the light');
});
test('only Spawned listed hostiles in village or near lamps are removed',()=>{
 const entity=(type,dim,location)=>({typeId:type,dimension:dim,location,isValid:true,remove(){this.removed=true;}});
 for(const [cause,type,sources,where,want] of [
  ['Spawned','minecraft:zombie',[],pt(100,-50),true],
  ['Spawned','minecraft:zombie',[torch(1,88,0)],pt(0,0),true],
  ['Spawned','minecraft:zombie',[],pt(0,0),false],
  ['Loaded','minecraft:zombie',[torch(1,88,0)],pt(0,0),false],
  ['Event','minecraft:zombie',[torch(1,88,0)],pt(0,0),false],
  ['Spawned','minecraft:cow',[torch(1,88,0)],pt(0,0),false],
  ['Spawned','minecraft:ender_dragon',[torch(1,88,0)],pt(0,0),false],
  ['Spawned','hakkai:wild_0_0',[torch(1,88,0)],pt(0,0),false]
 ]){
  const e=entity(type,dimension(undefined,sources),where);
  assert.equal(suppressVanillaSpawn({cause,entity:e},ctx),want,`${cause} ${type}`);
  assert.equal(!!e.removed,want);
 }
});
