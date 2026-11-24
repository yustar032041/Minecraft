import assert from 'node:assert/strict';
import fs from 'node:fs';
import {places} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {repeatSitePlan,placeRepeatSite} from '../Hakkai_v7.1.0/BehaviorPack/scripts/seeded_repeat_sites.js';
import {setupSeededWorlds} from '../Hakkai_v7.1.0/BehaviorPack/scripts/seeded_worlds.js';
import {foundFactoryResident} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_village.js';
import {foundFriendlyResident} from '../Hakkai_v7.1.0/BehaviorPack/scripts/friendly_residents.js';
import {foundBuilder,builderHome,autoBuilderPlan,readBuilderProject} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_builders.js';
import {residentSpot} from '../Hakkai_v7.1.0/BehaviorPack/scripts/resident_spawn.js';
import {seedFunctions} from './seed_terrain_helpers.mjs';
import {BlockVolume} from '@minecraft/server';
const seed='731',hash=seedFunctions(seed).hash,copies=[];
for(let x=-20;x<20;x++)for(let z=-20;z<20;z++){
 const s=repeatSitePlan(places,0,x,z,hash);if(s?.id===59)copies.push(s);
}
assert.ok(copies.length>100);assert.deepEqual(new Set(copies.map(s=>s.factoryVariant)),new Set([0,1,2,3]));
for(const s of copies.slice(0,20))assert.deepEqual(s,repeatSitePlan(places,0,Math.floor(s.x/256),Math.floor(s.z/256),hash));
const selected=copies[0],other=copies.find(s=>Math.hypot(s.x-selected.x,s.z-selected.z)>300);
const marks=new Map([[selected.repeatKey,1],[other.repeatKey,1],['built_59',1]]),spawned=[];
const world={seed,gameRules:{doMobSpawning:true},getDynamicProperty:k=>marks.get(k.replace('hakkai:','')),getAllPlayers:()=>[]};
const num=(_e,k)=>marks.get(k)??0,property=(_e,k,v)=>marks.set(k,v),system={currentTick:0},report=(_,e)=>{throw e;};
const dimension={id:'hakkai:realm_0',getPlayers:()=>[],getEntities:()=>[],isChunkLoaded:()=>true,
 getBlock:p=>p.y===87?{typeId:'minecraft:grass_block',isSolid:true,isLiquid:false,isAir:false}:{typeId:'minecraft:air',isSolid:false,isAir:true},
 spawnEntity:(type,at,options)=>{const props=new Map(),e={typeId:type,location:{...at},dimension,isValid:true,getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v)};spawned.push({e,options});return e;}};
const gen=setupSeededWorlds({ns:'hakkai:',world,system,num,property,report,places,buildRepeatSite:()=>{}});
assert.equal(gen.repeatSiteAt(0,selected.x,selected.z).repeatKey,selected.repeatKey);
assert.equal(gen.repeatSiteByKey(selected.repeatKey).repeatKey,selected.repeatKey);
assert.equal(gen.repeatSiteByKey('seed_repeat_0_999999999999999999_1_v1'),undefined);
assert.equal(gen.factoryVariant(selected.x,selected.z),selected.factoryVariant);
marks.set(other.repeatKey,2);assert.equal(gen.repeatSiteByKey(other.repeatKey),undefined);marks.set(other.repeatKey,1);
// Validate actual structure placement uses one of the four real templates.
{
 let called;const w={structureManager:{place:(...a)=>called=a}},fresh=new Map(),n=(_w,k)=>fresh.get(k)??0,p=(_w,k,v)=>fresh.set(k,v);
 const d={...dimension,containsBlock:()=>false};
 assert.equal(await placeRepeatSite({site:selected,world:w,dimension:d,num:n,property:p,loaded:async(_d,_a,_b,cb)=>cb(),BlockVolume}),'built');
 assert.equal(called[0],`hakkai:site_59_village_${selected.factoryVariant}`);
 assert.ok(fs.existsSync(`Hakkai_v7.1.0/BehaviorPack/structures/hakkai/site_59_village_${selected.factoryVariant}.mcstructure`));
}
// Alternate candidates are tried if a player occupies the first spot.
{
 const d={getPlayers:({location})=>location.x===0?[{}]:[],getEntities:()=>[]};
 const p=residentSpot(d,{x:0,y:88,z:0},(_d,q)=>q);assert.equal(p.x,5);
}
const unique=places.find(s=>s.id===59),findFloor=(_d,q)=>q;
for(const site of [selected,other,unique]){
 const args={site,world,dimension,num,property,findFloor,report};
 const town={factoryVillage:true,d:dimension,l:{x:site.x,y:88,z:site.z},repeatSiteKey:site.repeatKey};
 for(let i=0;i<24;i++)assert.equal(foundFactoryResident({town,world,num,property,findFloor,report}),true);
 assert.equal(foundFactoryResident({town,world,num,property,findFloor,report}),false);
 for(let i=0;i<4;i++)assert.equal(foundFriendlyResident(args),true);
 assert.equal(foundFriendlyResident(args),false);
 assert.equal(foundBuilder(args),true);assert.equal(foundBuilder(args),false);
}
assert.equal(spawned.length,87);assert.ok(spawned.every(x=>x.options.initialPersistence===true));
for(const role of [0,1,2,3])assert.equal(spawned.filter(x=>x.e.typeId===`hakkai:resident_0_${role}`).length,3);
const workers=spawned.filter(x=>x.e.typeId==='hakkai:builder_0').map(x=>x.e);
assert.deepEqual(workers.map(builderHome),[selected.repeatKey,other.repeatKey,59]);
marks.set(`builder_stage_${other.repeatKey}_v1`,4);
assert.equal(autoBuilderPlan(workers[0],{sites:[unique,selected,other],world,num,property}),'started');
assert.equal(readBuilderProject(workers[0]).homeId,selected.repeatKey);assert.equal(readBuilderProject(workers[0]).kind,'house');
assert.equal(autoBuilderPlan(workers[1],{sites:[unique,selected,other],world,num,property}),'started');
assert.equal(readBuilderProject(workers[1]).homeId,other.repeatKey);assert.equal(readBuilderProject(workers[1]).kind,'festival');
assert.equal(marks.get(`builder_stage_${other.repeatKey}_v1`),4);assert.equal(marks.has('builder_stage_59_v1'),false);
assert.ok(!marks.has(`built_${selected.repeatKey}`),'copy does not claim original site flags');
world.gameRules.doMobSpawning=false;const newSite={...other,repeatKey:'seed_repeat_0_101_101_v1'};marks.set(newSite.repeatKey,1);
assert.equal(foundFriendlyResident({site:newSite,world,dimension,num,property,findFloor,report}),false);
assert.equal(foundBuilder({site:newSite,world,dimension,num,property,findFloor,report}),false);
console.log('Factory copies: four seeded structures, safe slots, persistent residents, independent builders and projects (mocked)');
// Execute the actual main-loop founding branch for a previously built copy.
{
 const vm=await import('node:vm');const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const start=source.indexOf('const repeatFactory=seededWorlds?.repeatSiteAt('),end=source.indexOf("if(site?.kind==='culture')foundFriendlyResident",start);
 assert.ok(start>0&&end>start);
 const seen=[],m=new Map([[selected.repeatKey,1]]),w={gameRules:{doMobSpawning:true}};
 const d={...dimension,spawnEntity:(type,at,opts)=>{seen.push([type,opts]);const props=new Map();return {typeId:type,location:at,dimension:d,isValid:true,getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>props.set(k,v)};}};
 const context={seededWorlds:{repeatSiteAt:()=>selected},p:{dimension:d,location:{x:selected.x,y:88,z:selected.z}},site:undefined,ns:'hakkai:',expandedY:88,world:w,num:(_e,k)=>m.get(k)??0,property:(_e,k,v)=>m.set(k,v),findFloor,report,safeNear:findFloor,foundFactoryResident,foundFriendlyResident,foundBuilder};
 vm.createContext(context);const run=vm.runInContext(`(function(){${source.slice(start,end)}})`,context);
 for(let i=0;i<24;i++)run();
 assert.equal(seen.filter(([id])=>id==='minecraft:villager_v2').length,24);
 assert.equal(seen.filter(([id])=>id.startsWith('hakkai:resident_0_')).length,4);
 assert.equal(seen.filter(([id])=>id==='hakkai:builder_0').length,1);
 assert.ok(seen.every(([,opts])=>opts.initialPersistence===true));
}
// The real town registry recognises a copied bell and routes village-stage
// lookups to the copy instead of the original factory's singleton ID.
{
 const vm=await import('node:vm'),src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const ctx={world,system,seededWorlds:gen,travelSites:new Map([[59,unique]]),FACTORY_VILLAGE_ID:59,ns:'hakkai:',dimID:r=>`hakkai:realm_${r}`,expandedY:88,num,places,villageIdentity:s=>s.repeatKey??s.id};
 vm.createContext(ctx);
 vm.runInContext(src.slice(src.indexOf('const townCache='),src.indexOf('function discoverTown(')),ctx);
 vm.runInContext(src.slice(src.indexOf('function cultureTownForSite('),src.indexOf('function saveVillageLife(')),ctx);
 const a=ctx.townGet(dimension,{x:selected.x,y:88,z:selected.z},true),b=ctx.townGet(dimension,{x:other.x,y:88,z:other.z},true);
 assert.ok(a.factoryVillage&&b.factoryVillage);assert.equal(a.repeatSiteKey,selected.repeatKey);assert.equal(b.repeatSiteKey,other.repeatKey);
 assert.equal(ctx.villageSite(a).repeatKey,selected.repeatKey);assert.equal(ctx.villageSite(b).repeatKey,other.repeatKey);
 assert.equal(ctx.lifeBuildings(a),0);assert.equal(ctx.lifeBuildings(b),4);
}
