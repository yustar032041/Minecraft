import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JOBS,jobBlock,villagerJob,workstationTick,releaseWorkstation,releaseDeadWorker} from '../Hakkai_v7.1.0/BehaviorPack/scripts/villager_jobs.js';
import {claimBuilderWork,releaseBuilderWork,builderRealm} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_builders.js';
import {world as apiWorld} from '@minecraft/server';
import {friendlySupportTick} from '../Hakkai_v7.1.0/BehaviorPack/scripts/friendly_residents.js';
function fixture(role='guide'){
 const data=new Map(),entities=new Map(),at={x:10,y:70,z:-5};let loaded=true;
 const world={getDynamicProperty:k=>data.get(k),setDynamicProperty(k,v){if(v===undefined)data.delete(k);else data.set(k,v)},getEntity:id=>entities.get(id)};
 const dimension={id:'hakkai:realm_0',isChunkLoaded:()=>loaded,getBlock:()=>block,getEntities:()=>[...entities.values()]};
 const block={typeId:jobBlock(role),dimension,location:at};
 function person(id='villager',baby=false){const props=new Map();const e={id,isValid:true,typeId:'minecraft:villager_v2',nameTag:'Original name',dimension,getComponent:t=>t==='minecraft:is_baby'&&baby?{}:undefined,getDynamicProperty:k=>props.get(k),setDynamicProperty(k,v){if(v===undefined)props.delete(k);else props.set(k,v)}};entities.set(id,e);return e;}
 return {data,entities,world,dimension,block,person,unload:()=>loaded=false,load:()=>loaded=true};
}
test('five roles assign adult vanilla villagers without replacing names or existing data',()=>{
 for(const role of Object.keys(JOBS)){
  const f=fixture(role),baby=f.person('baby',true),e=f.person('adult');e.setDynamicProperty('other:data','preserved');
  assert.equal(workstationTick(f.block,f.world,()=>59),true);assert.equal(villagerJob(e,f.world),role);
  assert.equal(villagerJob(baby,f.world),undefined);assert.equal(e.nameTag,'Original name');assert.equal(e.getDynamicProperty('other:data'),'preserved');
  assert.equal(workstationTick(f.block,f.world),false,'one villager per workplace');
  assert.equal(e.getDynamicProperty('hakkai:builder_home_v1'),role==='builder'?59:undefined);
 }
});
test('roles persist through unloaded chunks, release/reset and death',()=>{
 const f=fixture(),e=f.person();assert.equal(workstationTick(f.block,f.world),true);
 f.unload();assert.equal(villagerJob(e,f.world),'guide');f.load();
 assert.equal(releaseWorkstation(f.dimension,f.block.location,f.world),true);assert.equal(villagerJob(e,f.world),undefined);
 assert.equal(workstationTick(f.block,f.world),true);releaseDeadWorker(e,f.world);assert.equal(villagerJob(e,f.world),undefined);
});
test('workplaces do not steal villagers assigned elsewhere and reject unknown unloaded owner',()=>{
 const f=fixture(),e=f.person();assert.equal(workstationTick(f.block,f.world),true);
 const second={...f.block,typeId:jobBlock('healer'),location:{x:11,y:70,z:-5}};
 assert.equal(workstationTick(second,f.world),false);
 f.entities.clear();assert.equal(workstationTick(f.block,f.world),false,'missing owner stays reserved');
});
test('failed reservation rolls back',()=>{
 const f=fixture(),e=f.person();e.setDynamicProperty=()=>{throw Error('unavailable')};
 assert.equal(workstationTick(f.block,f.world),false);assert.equal(f.data.size,0);
});
test('several builders cannot concurrently plan the same village',()=>{
 const f=fixture('builder'),a=f.person('a'),b=f.person('b');assert.equal(workstationTick(f.block,f.world,()=>59),true);
 b.setDynamicProperty('hakkai:builder_home_v1',59);
 assert.equal(claimBuilderWork(a,f.world),true);assert.equal(claimBuilderWork(b,f.world),false);
 releaseBuilderWork(a,f.world);assert.equal(claimBuilderWork(b,f.world),true);
 apiWorld.getDynamicProperty=f.world.getDynamicProperty;assert.equal(builderRealm(a),0);
});
test('extra guide/healer roles provide support without changing ordinary villagers',()=>{
 const f=fixture('guide'),e=f.person();workstationTick(f.block,f.world);let effects=[];
 const player={dimension:{getEntities:({families})=>families[0]==='villager'?[e]:[]},location:{x:0,y:70,z:0},getEffect:()=>undefined,addEffect:id=>effects.push(id)};
 friendlySupportTick(player,{},0,e=>villagerJob(e,f.world));assert.deepEqual(effects,['speed']);
});
test('production guard loop damages only visible hostile mobs, not creepers or peaceful wildlife',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm');
 const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const guard={id:'g'},attacks=[];
 const mobs=[{isValid:true,typeId:'minecraft:creeper'}, {isValid:true,typeId:'hakkai:wild_0_0'}, {isValid:true,typeId:'minecraft:zombie',location:{x:1,y:0,z:0},applyDamage:(n,opts)=>attacks.push([n,opts])}];
 const dimension={getEntities:q=>q.families[0]==='villager'?[guard]:mobs};guard.location={x:0,y:0,z:0};
 const ctx={villagerJob:()=> 'guard',world:{},permit:()=>true,VANILLA_HOSTILES:new Set(['minecraft:creeper','minecraft:zombie']),wildlifeById:new Map([['hakkai:wild_0_0',{temper:'passive'}]]),visibleFrom:()=>true,EntityDamageCause:{entityAttack:'entityAttack'}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function villagerGuardTick('),source.indexOf('function builderWorkTick(')),ctx);
 ctx.villagerGuardTick({dimension,location:guard.location},40);
 assert.equal(attacks.length,1);assert.equal(attacks[0][0],3);assert.equal(attacks[0][1].cause,'entityAttack');assert.equal(attacks[0][1].damagingEntity,guard);
});
