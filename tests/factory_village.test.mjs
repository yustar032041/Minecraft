import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
import {factoryResidentBonus} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_culture.js';
import {foundFactoryResident,FACTORY_RESIDENTS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_village.js';
import {places,biomes,families} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {NEW_BIOMES,newerBiomeAt,extraBiomeAt} from '../Hakkai_v7.1.0/BehaviorPack/scripts/extra_biomes.js';
import {seedFunctions} from './seed_terrain_helpers.mjs';
const props=new Map(),spawned=[],world={gameRules:{doMobSpawning:true}},d={id:'hakkai:realm_0',getPlayers:()=>[],getEntities:()=>[],spawnEntity:(id,at)=>{const e={id,at};spawned.push(e);return e;}};
const town={factoryVillage:true,d,l:{x:0,y:88,z:0}};
const num=(_,k)=>props.get(k)??0,property=(_,k,v)=>props.set(k,v),findFloor=(_d,at)=>at,report=()=>{};
const step=()=>foundFactoryResident({town,world,num,property,findFloor,report});
world.gameRules.doMobSpawning=false;assert.equal(step(),false);assert.equal(props.size,0);world.gameRules.doMobSpawning=true;
for(let i=0;i<FACTORY_RESIDENTS;i++)assert.equal(step(),true);
assert.equal(step(),false);assert.equal(spawned.length,24);assert.equal(new Set(spawned.map(e=>e.nameTag)).size,24);
spawned.pop();assert.equal(step(),false,'death does not trigger replacement on reload');
props.clear();assert.equal(foundFactoryResident({town,world,num,property,findFloor:()=>undefined,report}),false);assert.equal(props.size,0);
const failing={...town,d:{...d,spawnEntity:()=>{throw Error('failed')}}};assert.equal(foundFactoryResident({town:failing,world,num,property,findFloor,report}),false);assert.equal(num(world,'factory_village_founding_v1'),1,'uncertain spawn never duplicates');
assert.equal(places.find(s=>s.id===59).size,97);assert.equal(places.find(s=>s.id===60).dim,4);
const {noise}=seedFunctions('731');
for(let r=0;r<8;r++){
 const p=NEW_BIOMES[r];assert.equal(biomes[p.id],p.key);assert.equal(families[p.key],p);let n=0,old=0;
 for(let x=-1000;x<=1000;x+=30)for(let z=-1000;z<=1000;z+=30){const newer=newerBiomeAt(r,x,z,noise),previous=extraBiomeAt(r,x,z,noise);if(newer?.index===4)n++;if(previous)old++;}
 assert.ok(n>20&&old>n,`realm ${r} new and old areas`);
}
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
// Run the actual production function, not a substitute: only a successful
// factory transaction calls it, and its goods feed the same town record.
const src=main.slice(main.indexOf('function production(b,count){'),main.indexOf('function gatherTown('));
let saved;const active={data:{goods:5,work:0},factoryVillage:true};
const ctx={factoryResidentBonus,ns:'hakkai:',townNear:()=>active,townRecord:t=>t.data,townSave:(_,v)=>saved=v,world:{getAbsoluteTime:()=>123,getTimeOfDay:()=>6000},system:{currentTick:20},state:()=>({})};
vm.createContext(ctx);vm.runInContext(src,ctx);
ctx.production({x:4,y:88,z:4,typeId:'hakkai:crusher',dimension:{id:'hakkai:realm_0',spawnParticle(){},playSound(){},getPlayers(){return[];}},permutation:{getState(){return 0},withState(){return {}}},setPermutation(){}},2);
assert.equal(saved.goods,7);assert.equal(saved.work,123);
assert.match(main,/if\(factoryTransaction\([^]*?\)\)worked\(outputCount\)/);
assert.match(main,/t\.factoryVillage\?60:23/);assert.match(main,/t\.factoryVillage\?32:8/);
console.log('Factory village founding, no automatic respawn, production-to-town record, 8 new biome profiles (mocked)');
// The actual village scan reaches distant houses and resets removed facilities.
{
 const code=main.slice(main.indexOf('function gatherTown(t){'),main.indexOf('function nearestSpot('));
 let bed=true;const dim={isChunkLoaded:()=>true,getBlock:({x,y,z})=>{
  let id=x===40&&y===88&&z===30&&bed?'minecraft:bed':x===4&&y===88&&z===4?'hakkai:crusher':'minecraft:air';
  return {typeId:id,isAir:id==='minecraft:air'};
 }};
 const t={d:dim,l:{x:0,y:88,z:0},factoryVillage:true,i:0,sites:{},list:{}};
 const context={ns:'hakkai:',fortressPart:/^minecraft:.*(?:fence|wall)$/,workBlocks:new Set(),cropIds:new Set()};vm.createContext(context);vm.runInContext(code,context);
 for(let i=0;i<100;i++)context.gatherTown(t);
 assert.equal(t.sites.shelter.length,1);assert.equal(t.sites.machine.length,1);
 bed=false;for(let i=0;i<100;i++)context.gatherTown(t);assert.equal(t.sites.shelter,undefined,'removed bed is eventually removed from snapshot');
}
