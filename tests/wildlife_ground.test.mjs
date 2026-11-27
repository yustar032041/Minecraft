import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {validWildlifeGround} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_ground.js';
import {spawnWildlife} from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_spawn.js';
import {wildlife} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
const root='Hakkai_v7.1.0/BehaviorPack/entities';
const at={x:-3.5,y:40,z:8.5};
function world(){
 const floor={typeId:'minecraft:test_partial',isAir:false,isLiquid:false,isWaterlogged:false,location:{x:-4,y:39,z:8}};
 const calls=[];return {floor,calls,isChunkLoaded:()=>true,getBlock:p=>p.y===39?floor:{isAir:true},
  getBlockFromRay:(from,dir,opts)=>{calls.push({from,dir,opts});return {block:floor,face:'Up',faceLocation:{y:1}}}};
}
test('all selected wildlife types fit the checked clearance and declare the wild spawn event',()=>{
 const files=fs.readdirSync(root).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'))['minecraft:entity']);
 const defs=new Map(files.map(e=>[e.description.identifier,e]));assert.equal(wildlife.length,120);
 for(const m of wildlife){const id='hakkai:'+m.id,e=defs.get(id);assert.ok(e,id);const box=e.components['minecraft:collision_box'];
  assert.ok(box.width>0&&box.width<=.9&&box.height>0&&box.height<=2,id);assert.ok(e.events['hakkai:wild'],id);
 }
});
test('dry full floor supports all five collision-box points, including at negative coordinates',()=>{
 const d=world();assert.equal(validWildlifeGround(d,at),true);assert.equal(d.calls.length,5);assert.equal(d.calls[0].opts.maxDistance,1);assert.deepEqual(d.calls[0].dir,{x:0,y:-1,z:0});assert.equal(d.calls[0].opts.includeLiquidBlocks,false);
});
test('blocked body, hazards, waterlogging, unavailable blocks and missing metadata fail closed',()=>{
 for(const mutation of [d=>d.floor.isWaterlogged=true,d=>d.floor.isWaterlogged=undefined,d=>d.floor.isLiquid=true,d=>d.floor.typeId='minecraft:magma',d=>d.floor.isAir=true,
  d=>d.getBlock=p=>p.y===41?{isAir:false}:p.y===39?d.floor:{isAir:true},d=>d.isChunkLoaded=p=>p.y!==39,d=>d.getBlock=()=>{throw Error('unloaded')},
  d=>d.getBlock=p=>p.y===39?d.floor:undefined]){const d=world();mutation(d);assert.equal(validWildlifeGround(d,at),false)}
 assert.equal(validWildlifeGround(world(),{...at,y:40.5}),false);assert.equal(validWildlifeGround(world(),{...at,x:NaN}),false);
});
test('partial support, side hits and rays hitting another floor are rejected',()=>{
 for(const hit of [undefined,{block:{location:{x:-4,y:39,z:8}},face:'Up',faceLocation:{y:.5}},
 {block:{location:{x:-3,y:39,z:8}},face:'Up',faceLocation:{y:1}},{block:{location:{x:-4,y:39,z:8}},face:'North',faceLocation:{y:1}}]){
  const d=world();let n=0;const original=d.getBlockFromRay;d.getBlockFromRay=(...args)=>++n===4?hit:original(...args);assert.equal(validWildlifeGround(d,at),false);
 }
});
test('support is checked at the final spawn, failure tries other candidates without consuming the density budget',()=>{
 const checked=[],spawned=[];let checks=0;const d={isChunkLoaded:()=>true,getPlayers:()=>[],spawnEntity:(_type,p)=>spawned.push(p)};
 const args={player:{dimension:d,location:{x:0,y:40,z:0}},type:'hakkai:wild_0_0',tick:0,safe:()=>true,
  confirm:(_d,p)=>{checked.push({...p});return ++checks===3},capacity:()=>true};
 assert.equal(spawnWildlife(args),true);assert.equal(checks,3);assert.deepEqual(spawned[0],checked[2]);
 args.confirm=()=>{throw Error('unloaded')};assert.equal(spawnWildlife(args),false);assert.equal(spawned.length,1);
});
test('unavailable or partially supported ground has a finite verification budget and never spawns',()=>{
 let confirmations=0,filtered=0;const d={isChunkLoaded:()=>true,getPlayers:opts=>{if(opts)filtered++;return []},spawnEntity:()=>assert.fail('must not spawn')};
 const args={player:{dimension:d,location:{x:0,y:40,z:0}},type:'hakkai:wild_0_0',tick:0,safe:()=>true,confirm:()=>{confirmations++;return false}};
 assert.equal(spawnWildlife(args),false);assert.equal(confirmations,24);assert.equal(filtered,0);
});
test('known full cubes spawn without a working ray and without liquid-flow support',()=>{
 const d=world();d.floor.typeId='minecraft:stone';d.floor.isLiquidBlocking=()=>false;
 d.getBlockFromRay=()=>{throw Error('ray unavailable')};
 assert.equal(validWildlifeGround(d,at),true);
 d.floor.isWaterlogged=true;assert.equal(validWildlifeGround(d,at),false);
});
test('unknown and partial blocks never use the full cube fallback',()=>{
 for(const id of ['minecraft:stone_slab','minecraft:oak_stairs','hakkai:unknown_floor']){
  const d=world();d.floor.typeId=id;d.getBlockFromRay=()=>undefined;
  assert.equal(validWildlifeGround(d,at),false,id);
 }
});
