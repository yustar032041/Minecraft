import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inFactoryVillage,disallowHostileSpawn,suppressVanillaSpawn } from '../Hakkai_v7.1.0/BehaviorPack/scripts/hostile_spawn_rules.js';
const factory={id:59,x:100,z:-50,size:97};
const ctx={factory,world:{},num:()=>1,repeatSiteAt:(_,x,z)=>x>=500&&x<=596&&z>=500&&z<=596?{id:59}:undefined};
const d=(id='hakkai:realm_0',light=0)=>({id,getLightLevel:()=>light});
const pt=(x,z)=>({x,y:88,z});
test('original and repeat village footprints include edge blocks and all heights',()=>{
 assert.equal(inFactoryVillage(d(),pt(148.9,-2.1),ctx),true);
 assert.equal(inFactoryVillage(d(),pt(149,-50),ctx),false);
 assert.equal(inFactoryVillage(d(),{x:500,y:-50,z:500},ctx),true);
 assert.equal(inFactoryVillage(d('minecraft:overworld'),pt(100,-50),ctx),false);
 assert.equal(inFactoryVillage(d(),pt(100,-50),{...ctx,num:()=>0}),false);
});
test('additional hostile candidates require darkness and no factory village',()=>{
 assert.equal(disallowHostileSpawn(d(),pt(100,-50),ctx),true);
 assert.equal(disallowHostileSpawn(d(undefined,1),pt(0,0),ctx),true);
 assert.equal(disallowHostileSpawn(d(undefined,0),pt(0,0),ctx),false);
 assert.equal(disallowHostileSpawn({id:'minecraft:overworld',getLightLevel(){throw Error();}},pt(0,0),ctx),true);
});
test('only newly naturally spawned listed hostiles are removed',()=>{
 const entity=(type,dim,location)=>({typeId:type,dimension:dim,location,isValid:true,remove(){this.removed=true;}});
 for(const [cause,type,light,where,want] of [
  ['Spawned','minecraft:zombie',0,pt(100,-50),true],
  ['Spawned','minecraft:zombie',2,pt(0,0),true],
  ['Spawned','minecraft:zombie',0,pt(0,0),false],
  ['Loaded','minecraft:zombie',5,pt(0,0),false],
  ['Event','minecraft:zombie',5,pt(0,0),false],
  ['Spawned','minecraft:cow',5,pt(0,0),false],
  ['Spawned','minecraft:ender_dragon',5,pt(0,0),false],
  ['Spawned','hakkai:wild_0_0',5,pt(0,0),false]
 ]){
  const e=entity(type,d(undefined,light),where);
  assert.equal(suppressVanillaSpawn({cause,entity:e},ctx),want,`${cause} ${type}`);
  assert.equal(!!e.removed,want);
 }
 const e=entity('minecraft:zombie',{id:'minecraft:overworld',getLightLevel(){throw Error();}},pt(0,0));
 assert.equal(suppressVanillaSpawn({cause:'Spawned',entity:e},ctx),false);
});
