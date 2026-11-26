// Stable API-shaped mocks: absence of the preview isSolid property must not
// disable actions; missing metadata or support rays must still fail closed.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {possibleFloor} from '../Hakkai_v7.1.0/BehaviorPack/scripts/floor_candidate.js';
import {validRealmEnderRetreat} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender_retreat.js';
import {findKingShadowSpawn,KING_SHADOW_SUMMONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/king_summon_positions.js';
import {clearRushLine} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_rush_line.js';
const floor={typeId:'minecraft:stone',isAir:false,isLiquid:false,isWaterlogged:false};
const hazard=/magma|cactus/;
test('stable floor metadata is preliminary, unknown or dangerous floors fail closed',()=>{
 assert.equal(possibleFloor(floor,hazard),true);
 for(const b of [{...floor,isAir:true},{...floor,isLiquid:true},{...floor,isWaterlogged:true}, {...floor,typeId:'minecraft:magma'},
  {...floor,isAir:undefined},{...floor,isLiquid:undefined},{...floor,isWaterlogged:undefined},{...floor,isSolid:false},{}])
  assert.equal(possibleFloor(b,hazard),false);
});
test('stable floor candidates still require full-height footprint rays',()=>{
 const aim={x:.5,y:80,z:.5},pos={x:4.5,y:80,z:.5};
 const d={isChunkLoaded:()=>true,getEntities:()=>[],getBlock:p=>p.y===79?floor:{isAir:true},
  getBlockFromRay:p=>({face:'Up',block:{location:{y:79}},faceLocation:{y:1}})};
 assert.equal(validRealmEnderRetreat(d,pos),true);
 assert.ok(findKingShadowSpawn(d,aim,0,KING_SHADOW_SUMMONS[0]));
 for(const hit of [undefined,{face:'Up',block:{location:{y:79}},faceLocation:{y:.5}}]){
  const bad={...d,getBlockFromRay:()=>hit};
  assert.equal(validRealmEnderRetreat(bad,pos),false);
  assert.equal(findKingShadowSpawn(bad,aim,0,KING_SHADOW_SUMMONS[0]),undefined);
 }
});
test('rush permits stable air or liquid, not unknown or non-air partial endpoints',()=>{
 const d={id:'r',isChunkLoaded:()=>true,getBlock:()=>({isAir:true,isLiquid:false}),getBlockFromRay:()=>undefined};
 const e={dimension:d,location:{x:0,y:80,z:0}},p={dimension:d,location:{x:2,y:80,z:0}};
 assert.equal(clearRushLine(e,p),true);
 d.getBlock=()=>({isAir:false,isLiquid:true});assert.equal(clearRushLine(e,p),true);
 d.getBlock=()=>({isAir:false,isLiquid:false});assert.equal(clearRushLine(e,p),false);
 d.getBlock=()=>({});assert.equal(clearRushLine(e,p),false);
 d.getBlock=()=>({isAir:true});d.getBlockFromRay=()=>{throw Error('unloaded')};assert.equal(clearRushLine(e,p),false);
});
test('builder foundations reject unknown partial or waterlogged blocks', async()=>{
 const {safeBuilderGround}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/village_builders.js');
 assert.equal(safeBuilderGround({typeId:'minecraft:stone',isLiquid:false,isWaterlogged:false}),true);
 assert.equal(safeBuilderGround({typeId:'minecraft:stone_slab',isLiquid:false,isWaterlogged:false}),false);
 assert.equal(safeBuilderGround({typeId:'minecraft:stone',isLiquid:false,isWaterlogged:true}),false);
});
