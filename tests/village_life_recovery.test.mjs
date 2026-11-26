import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {depositToVillage,workshopStep,contributeRequest,donation,recoverCrisis,requestStatus,detectCrisis} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_life.js';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';
class Item {constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64})}clone(){return new Item(this.typeId,this.amount)}isStackableWith(x){return x.typeId===this.typeId}}
const container=items=>({items,size:items.length,getItem(i){return this.items[i]?.clone()},setItem(i,v){this.items[i]=v?.clone()}});
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const code=src.slice(src.indexOf('function cultureTownForSite('),src.indexOf('async function townMenu('));
for(const mode of ['request','stock','crisis'])test(`actual ${mode} menu restores record and inventory after write-then-throw`,async()=>{
 const initial=mode==='crisis'?{goods:1,lifeCrisis:{active:true,type:'monster',day:0}}:{goods:0};
 let saved=JSON.stringify(initial),fail=true;
 const t={key:'town',d:{id:'hakkai:realm_0',getBlock:()=>({typeId:'hakkai:town_bell'}),getEntities:()=>[]},l:{x:0,y:0,z:0},data:initial};
 const p={id:'a',name:'A',isValid:true,dimension:t.d,location:{x:0,y:0,z:0},getGameMode:()=> 'survival',inventory:container([new Item('minecraft:wheat',8),new Item('minecraft:oak_planks',8)])};
 const reports=[],world={},ctx={world,ns:'hakkai:',GameMode:{Survival:'survival',Adventure:'adventure',Creative:'creative'},townRecord:t=>({...t.data}),townGet:()=>t,townNear:()=>t,currentPlace:()=>undefined,
  seasonDay:()=>0,raining:()=>false,dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),lifeWorkers:()=>({}),lifeBuildings:()=>0,requestStatus,contributeRequest,donation,recoverCrisis,detectCrisis,depositToVillage,
  property:(_w,_k,v)=>{saved=v;if(fail){fail=false;throw Error('after write')}},form:async()=>0,notice:()=>{},simple:()=>{},space:p=>p.inventory,report:(...x)=>reports.push(x),factoryResidentRole:()=>undefined,places:[]};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 if(mode==='request')await ctx.villageSharedRequest(p,t);
 if(mode==='stock')await ctx.villageSupplyMenu(p,t);
 if(mode==='crisis')await ctx.villageCrisisMenu(p,t);
 assert.deepEqual(JSON.parse(saved),initial);assert.deepEqual(t.data,initial);
 assert.equal(p.inventory.items[0].amount,8);assert.equal(p.inventory.items[1].amount,8);assert.ok(reports.length);
});
test('donation rollback is not called when inventory write fails before external commit',()=>{
 const c=container([new Item('minecraft:wheat',4)]);let commit=0,rollback=0,attempt=0;
 c.setItem=(i,v)=>{c.items[i]=v?.clone();if(attempt++===0)throw Error('write after change')};
 assert.equal(depositToVillage(c,'minecraft:wheat',4,()=>commit++,()=>{},()=>rollback++),false);
 assert.equal(commit,0);assert.equal(rollback,0);assert.equal(c.items[0].amount,4);
});
test('workshop restores changed record and stops instead of trying alternate recipe',()=>{
 const input=container([new Item('minecraft:wheat',3),new Item('minecraft:oak_log',1)]),output=container([undefined,undefined]);
 const d={isChunkLoaded:()=>true,getBlock:p=>({typeId:'minecraft:barrel',getComponent:()=>({container:p.x?output:input})}),getEntities:()=>[{isValid:true,typeId:'minecraft:villager_v2',location:{x:1,y:0,z:0},getComponent:()=>undefined}]};
 const t={d,l:{x:0,y:0,z:0},factoryVillage:true},setup={input:{x:0,y:0,z:0},output:{x:2,y:0,z:0}};
 let record='before';const reports=[];
 const value=workshopStep(t,setup,{ItemStack:Item,factoryTransaction,factoryResidentRole:()=> 'saw',extraRole:()=> 'artisan',
  onCraft:()=>{record='after';throw Error('save after write')},rollbackCraft:()=>{record='before'},report:(...r)=>reports.push(r)});
 assert.equal(value,undefined);assert.equal(record,'before');assert.equal(input.items[0].amount,3);assert.equal(input.items[1].amount,1);assert.deepEqual(output.items,[undefined,undefined]);assert.ok(reports.length);
});
test('failed ledger restoration is reported while inventory restoration is still attempted',()=>{
 const c=container([new Item('minecraft:wheat',4)]),reports=[];
 assert.equal(depositToVillage(c,'minecraft:wheat',4,()=>{throw Error('write failure')},(...a)=>reports.push(a),()=>{throw Error('rollback failure')}),false);
 assert.equal(c.items[0].amount,4);assert.ok(reports.some(([s])=>s.includes('記録の復旧失敗')));assert.ok(reports.some(([s])=>s.includes('復旧要確認')));
});
test('actual life tick restores the shared workshop cooldown record after a write-then-throw',async()=>{
 const lib=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/village_life.js');
 const input=container([new Item('minecraft:wheat',3)]),output=container([undefined]),reports=[];
 const setup={input:{x:0,y:1,z:0},output:{x:2,y:1,z:0}},initial={goods:0,lifeWorkshop:setup};let saved=JSON.stringify(initial),fail=true;
 const worker={isValid:true,typeId:'minecraft:villager_v2',role:'artisan',location:{x:1,y:1,z:0}};
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getBlock:p=>p.y===0?{typeId:'hakkai:town_bell'}:{typeId:'minecraft:barrel',getComponent:()=>({container:p.x?output:input})},getEntities:q=>q.families?[]:[worker],spawnParticle(){}};
 const t={d,l:{x:0,y:0,z:0},key:'town',data:initial},p={isValid:true,dimension:d,location:{x:0,y:1,z:0},getGameMode:()=> 'survival'};
 worker.dimension=d;const ctx={...lib,world:{getAbsoluteTime:()=>1200,getDynamicProperty:()=>saved},ns:'hakkai:',GameMode:{Survival:'survival',Adventure:'adventure',Creative:'creative'},townRecord:t=>({...t.data}),townGet:()=>t,townNear:()=>t,currentPlace:()=>undefined,
  num:()=>0,property:(_w,_k,v)=>{saved=v;if(fail){fail=false;throw Error('after save')}},seasonDay:()=>0,raining:()=>false,dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),state:()=>({}),factoryResidentRole:()=>undefined,villagerJob:e=>e.role,BUILDER_IDS:[],places:[],factoryTransaction,ItemStack:Item,report:(...r)=>reports.push(r)};
 vm.createContext(ctx);vm.runInContext(code,ctx);ctx.lifeTick(p,undefined,0);
 assert.deepEqual(JSON.parse(saved),initial);assert.deepEqual(t.data,initial);assert.equal(input.items[0].amount,3);assert.equal(output.items[0],undefined);assert.ok(reports.length);
});
test('workshop write error stops alternate recipe, but missing ingredients can fall through',()=>{
 function fixture(wheat){
  const input=container([...(wheat?[new Item('minecraft:wheat',3)]:[]),new Item('minecraft:oak_log',1)]),output=container([undefined,undefined]);
  const d={isChunkLoaded:()=>true,getBlock:p=>({typeId:'minecraft:barrel',getComponent:()=>({container:p.x?output:input})}),getEntities:()=>[{isValid:true,typeId:'minecraft:villager_v2',location:{x:1,y:0,z:0},getComponent:()=>undefined}]};
  const t={d,l:{x:0,y:0,z:0},factoryVillage:true},setup={input:{x:0,y:0,z:0},output:{x:2,y:0,z:0}};
  return {input,output,t,setup,options:{ItemStack:Item,factoryTransaction,factoryResidentRole:()=> 'saw',extraRole:()=> 'artisan',report:()=>{}}};
 }
 const f=fixture(true);let attempt=0;f.input.setItem=(i,v)=>{f.input.items[i]=v?.clone();if(attempt++===0)throw Error('after write')};
 assert.equal(workshopStep(f.t,f.setup,f.options),undefined);assert.equal(f.input.items[0].amount,3);assert.equal(f.input.items[1].amount,1);assert.deepEqual(f.output.items,[undefined,undefined]);
 const g=fixture(false);assert.match(workshopStep(g.t,g.setup,g.options),/板材/);assert.equal(g.input.items[0],undefined);assert.equal(g.output.items[0].typeId,'minecraft:oak_planks');assert.equal(g.output.items[0].amount,4);
});
