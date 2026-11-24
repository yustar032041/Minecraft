import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {seasonAt,festivalAt,villageTier,requestStatus,contributeRequest,festivalJoin,donation,workDay,detectCrisis,recoverCrisis,addVillageMemory,depositToVillage,validWorkshop,workshopStep} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_life.js';
assert.deepEqual([0,3,6,9,12].map(d=>seasonAt(d).name),['春','夏','秋','冬','春']);
assert.equal(seasonAt(11).dayInSeason,3);assert.equal(seasonAt(12).year,2);
const titles=new Set();for(let r=0;r<8;r++)for(let s=0;s<4;s++){const f=festivalAt(s*3+1,r);assert.ok(f.open);titles.add(f.title);assert.equal(festivalAt(s*3,r).open,false);}assert.equal(titles.size,32);
for(let season=0;season<4;season++)assert.equal(requestStatus({},season*3,0).item,['minecraft:wheat','minecraft:carrot','minecraft:pumpkin','minecraft:beetroot'][season]);
{
 let d={goods:0},a=contributeRequest(d,0,0,'友達A');assert.equal(a.count,2);d=a.next;
 for(const person of ['友達B','友達A','友達B']){a=contributeRequest(d,0,0,person);d=a.next;}
 assert.equal(d.lifeRequest.count,8);assert.equal(d.goods,6);assert.equal(d.lifeQuests,1);assert.equal(contributeRequest(d,0,0,'友達A'),undefined);assert.equal(requestStatus(d,1,0).count,0);
 assert.equal(d.lifeHistory[1].who,'友達B');assert.equal(villageTier(d,4).name,'にぎわう町');
}
{
 let d={goods:0};assert.equal(festivalJoin(d,0,1,'p1','A'),undefined);
 d=festivalJoin(d,1,1,'p1','A');assert.equal(d.goods,2);assert.equal(d.lifeFestivals,1);
 assert.equal(festivalJoin(d,1,1,'p1','A'),undefined);d=festivalJoin(d,1,1,'p2','B');assert.equal(d.goods,2);assert.equal(d.lifeFestivals,1);
 d=festivalJoin(d,4,1,'p1','A');assert.equal(d.lifeFestivals,2);assert.equal(d.goods,4);
}
{
 let d={goods:0};d=donation(d,'food',0,'A').next;d=donation(d,'wood',0,'B').next;
 assert.equal(workDay(d,0,{}),undefined,'real nearby workers required');
 d=workDay(d,0,{artisan:true,builder:true});assert.equal(d.goods,5);assert.equal(d.lifeFood,2);assert.equal(d.lifeWood,2);
 assert.equal(workDay(d,0,{artisan:true,builder:true}),undefined,'daily cap');d=workDay(d,1,{farmer:true,builder:true});assert.equal(d.goods,10);
 assert.equal(donation({lifeFood:62},'food',0,'A'),undefined,'stock cap');
}
{
 let d={goods:1};assert.equal(detectCrisis(d,0,{}),undefined);d=detectCrisis(d,0,{monsters:1});assert.equal(d.lifeCrisis.type,'monster');
 assert.equal(recoverCrisis(d,0,{monsters:1},'A'),undefined);const p=recoverCrisis(d,0,{monsters:0},'A');assert.equal(p.next.goods,7);assert.equal(p.next.lifeRecoveries,1);assert.equal(recoverCrisis(p.next,0,{},'A'),undefined);
 assert.equal(detectCrisis(p.next,0,{monsters:1}),undefined,'one alert/day');assert.equal(detectCrisis(p.next,2,{rain:true}).lifeCrisis.type,'storm');
}
{
 let d={};for(let i=0;i<25;i++)d=addVillageMemory(d,i,'x','§x\nAlex');assert.equal(d.lifeHistory.length,20);assert.equal(d.lifeHistory[0].day,5);assert.equal(d.lifeHistory[0].who,'xAlex');
}
class Item{constructor(typeId,amount=1){this.typeId=typeId;this.amount=amount;this.maxAmount=64;}clone(){return new Item(this.typeId,this.amount);}isStackableWith(other){return other?.typeId===this.typeId;}}
function inventory(items,failAt=-1){return {items,size:items.length,failAt,getItem(i){return this.items[i]?.clone();},setItem(i,v){if(i===this.failAt){this.failAt=-1;throw Error('failed');}this.items[i]=v?.clone();}};}
const snap=c=>c.items.map(x=>x&&[x.typeId,x.amount]);
{
 const c=inventory([new Item('minecraft:wheat',1),new Item('minecraft:wheat',3),new Item('minecraft:stone',2)]),before=snap(c);let committed=0;
 assert.equal(depositToVillage(c,'minecraft:wheat',5,()=>committed++),false);assert.deepEqual(snap(c),before);assert.equal(committed,0);
 assert.equal(depositToVillage(c,'minecraft:wheat',2,()=>{throw Error('save error')}),false);assert.deepEqual(snap(c),before);
 assert.equal(depositToVillage(c,'minecraft:wheat',2,()=>committed++),true);assert.equal(committed,1);assert.deepEqual(snap(c),[undefined,['minecraft:wheat',2],['minecraft:stone',2]]);
 const f=inventory([new Item('minecraft:wheat',1),new Item('minecraft:wheat',2)],1),old=snap(f);assert.equal(depositToVillage(f,'minecraft:wheat',2,()=>{}),false);assert.deepEqual(snap(f),old);
}
// Execute the actual shared UI handlers. Both players contribute to the same
// town record; stale forms re-read the current record before committing.
{
 const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const code=main.slice(main.indexOf('function cultureTownForSite('),main.indexOf('async function townMenu('));
 const props=new Map(),world={},mode={Survival:'survival',Adventure:'adventure',Creative:'creative'};let day=0,choice=0,monsters=0,rain=false;
 const d={id:'hakkai:realm_0',getBlock:()=>({typeId:'hakkai:town_bell'}),getEntities:q=>q.families?.includes('monster')?Array(monsters).fill({}):[],spawnParticle(){}};
 const town={key:'town-test',d,l:{x:0,y:88,z:0},data:{goods:0}};
 const player=(id)=>({id,name:id,isValid:true,location:{x:0,y:88,z:0},dimension:d,getGameMode:()=>mode.Survival,inventory:inventory([new Item('minecraft:wheat',8),new Item('minecraft:oak_planks',8)]),playSound(){}});
 const a=player('Alice'),b=player('Bob'),messages=[];
 const context={seasonAt,festivalAt,villageTier,requestStatus,contributeRequest,festivalJoin,donation,workDay,detectCrisis,recoverCrisis,addVillageMemory,depositToVillage,GameMode:mode,world,ns:'hakkai:',dimID:i=>`hakkai:realm_${i}`,expandedY:88,places:[],num:(_,k)=>props.get(k)??0,property:(_,k,v)=>props.set(k,v),townRecord:t=>t.data,townNear:()=>town,townGet:()=>town,currentPlace:()=>undefined,seasonDay:()=>day,raining:()=>rain,dist:(u,v)=>Math.hypot(u.x-v.x,u.y-v.y,u.z-v.z),factoryResidentRole:()=>undefined,friendlyResidentById:new Map(),BUILDER_IDS:[],validWorkshop,workshopStep,factoryTransaction,ItemStack:Item,form:async()=>choice,simple:async()=>{},notice:(_p,s)=>messages.push(s),space:p=>p.inventory,report:()=>{}};
 vm.createContext(context);vm.runInContext(code,context);
 await context.villageSharedRequest(a,town);await context.villageSharedRequest(b,town);await context.villageSharedRequest(a,town);await context.villageSharedRequest(b,town);
 assert.equal(town.data.lifeRequest.count,8);assert.equal(town.data.goods,6);assert.equal(a.inventory.items[0].amount,4);assert.equal(b.inventory.items[0].amount,4);
 await context.villageSharedRequest(a,town);assert.equal(a.inventory.items[0].amount,4);
 day=1;await context.villageSeasonFestival(a,town);await context.villageSeasonFestival(b,town);assert.equal(town.data.lifeFestivalPeople.length,2);assert.equal(town.data.goods,8);
 await context.villageSeasonFestival(a,town);assert.equal(town.data.lifeFestivalPeople.length,2);
 choice=0;await context.villageSupplyMenu(a,town);assert.equal(town.data.lifeFood,4);assert.equal(a.inventory.items[0],undefined);
 monsters=1;await context.villageCrisisMenu(a,town);assert.equal(town.data.lifeCrisis.active,true);assert.equal(a.inventory.items[1].amount,8);
 monsters=0;await context.villageCrisisMenu(b,town);assert.equal(town.data.lifeCrisis.active,false);assert.equal(b.inventory.items[1].amount,4);assert.equal(town.data.goods,14);
 assert.ok(town.data.lifeHistory.some(x=>x.who==='Alice'));assert.ok(town.data.lifeHistory.some(x=>x.who==='Bob'));
 assert.ok(main.includes("if(site.kind==='culture'){"));assert.ok(main.includes('return villageLifeMenu(p,cultureTownForSite'));
}
console.log('Season cycle, 32 festivals, shared requests/records, role-gated stock, safe alerts and concurrent UI commits OK (mocked)');

{
 const source=inventory([new Item('minecraft:wheat',6),new Item('minecraft:oak_log',2)]),output=inventory([undefined,undefined]);
 const a={x:0,y:88,z:0},b={x:2,y:88,z:0};let loaded=true,workers=[];
 const d={isChunkLoaded:()=>loaded,getBlock:p=>({typeId:'minecraft:barrel',getComponent:()=>({container:p.x===0?source:output})}),getEntities:()=>workers};
 const t={d,l:{x:0,y:88,z:0},factoryVillage:false},setup={input:a,output:b};
 const options={ItemStack:Item,factoryTransaction,factoryResidentRole:e=>e.role,friendlyResidentById:new Map([['hakkai:resident_0_2',{role:'artisan'}]])};
 assert.ok(validWorkshop(t,setup));assert.equal(validWorkshop(t,{input:a,output:a}),false);assert.equal(validWorkshop(t,{input:a,output:{...b,x:5}}),false);
 assert.equal(workshopStep(t,setup,options),undefined,'no workers');
 workers=[{isValid:true,typeId:'hakkai:resident_0_2',location:{x:1,y:88,z:0}}];loaded=false;assert.equal(workshopStep(t,setup,options),undefined);loaded=true;
 assert.ok(workshopStep(t,setup,options).includes('パン'));assert.deepEqual(snap(source),[['minecraft:wheat',3],['minecraft:oak_log',2]]);assert.deepEqual(snap(output),[['minecraft:bread',1],undefined]);
 workers=[{isValid:true,typeId:'minecraft:villager_v2',role:'saw',getComponent:()=>undefined,location:{x:1,y:88,z:0}}];
 assert.equal(workshopStep(t,setup,options),undefined,'saw belongs to factory village only');t.factoryVillage=true;
 assert.ok(workshopStep(t,setup,options).includes('板材'));assert.deepEqual(snap(source),[['minecraft:wheat',3],['minecraft:oak_log',1]]);assert.deepEqual(snap(output),[['minecraft:bread',1],['minecraft:oak_planks',4]]);
 workers[0].getComponent=()=>({});assert.equal(workshopStep(t,setup,options),undefined,'baby never works');
 assert.equal(workshopStep(t,{input:a,output:a},options),undefined,'same inventory never processes');
}
// Barrel binding uses the real before-interaction handler: two different
// barrels in the same dimension, explicit per-player selection, no edits.
{
 const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');let handler,notes=[];
 const mode={Survival:'survival',Adventure:'adventure',Creative:'creative'};
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getBlock:()=>({typeId:'minecraft:barrel'})};
 const t={d,l:{x:0,y:88,z:0},key:'village',data:{goods:0}},store=new Map(),s={};
 const player={isValid:true,location:{x:1,y:88,z:0},dimension:d,getGameMode:()=>mode.Survival};
 const ctx={safeSub:(_a,_b,_c,fn)=>handler=fn,state:()=>s,system:{currentTick:0,run:fn=>fn()},notice:(_p,text)=>notes.push(text),dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),townGet:()=>t,lifeNear:()=>true,validWorkshop,townRecord:t=>t.data,saveVillageLife:(t,v)=>t.data=v,report:()=>{},GameMode:mode};
 vm.createContext(ctx);vm.runInContext(main.slice(main.indexOf("safeSub('world','before','playerInteractWithBlock'"),main.indexOf('async function returnMenu(')),ctx);
 function click(x,dimension=d){const e={player,isFirstEvent:true,block:{x,y:88,z:0,dimension,typeId:'minecraft:barrel'}};player.isSneaking=true;handler(e);assert.equal(e.cancel,true);}
 s.villageBarrelPick={town:t,phase:0,expires:600};click(0);assert.equal(s.villageBarrelPick.phase,1);click(2);
 assert.deepEqual(JSON.parse(JSON.stringify(t.data.lifeWorkshop)),{input:{x:0,y:88,z:0},output:{x:2,y:88,z:0}});
 s.villageBarrelPick={town:t,phase:0,expires:600};click(0);click(0);assert.equal(s.villageBarrelPick,undefined);assert.ok(notes.some(s=>s.includes('異なる樽')));
}
// Exercise the production life tick, including the real 60-second workshop
// cooldown, role/stock gating, and shared persisted record.
{
 const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),code=main.slice(main.indexOf('function cultureTownForSite('),main.indexOf('async function townMenu('));
 const props=new Map(),mode={Survival:'survival',Adventure:'adventure',Creative:'creative'},source=inventory([new Item('minecraft:wheat',9)]),output=inventory([undefined]);
 let now=0;const worker={isValid:true,typeId:'hakkai:resident_0_2',location:{x:1,y:88,z:0}},input={x:0,y:88,z:0},out={x:2,y:88,z:0};
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getBlock:p=>p.x===0&&p.y===87?{typeId:'hakkai:town_bell'}:{typeId:'minecraft:barrel',getComponent:()=>({container:p.x===0?source:output})},getEntities:q=>q.families?[]:[worker],spawnParticle(){}};
 const t={d,l:{x:0,y:87,z:0},key:'town',data:{goods:0,lifeFood:4,lifeWorkshop:{input,output:out}}},state={};
 const p={isValid:true,dimension:d,location:{x:0,y:88,z:0},getGameMode:()=>mode.Survival};
 const world={getAbsoluteTime:()=>now};
 const ctx={seasonAt,festivalAt,villageTier,requestStatus,contributeRequest,festivalJoin,donation,workDay,detectCrisis,recoverCrisis,addVillageMemory,depositToVillage,validWorkshop,workshopStep,ItemStack:Item,factoryTransaction,GameMode:mode,world,ns:'hakkai:',dimID:i=>`hakkai:realm_${i}`,expandedY:88,places:[],num:()=>0,property:(_,k,v)=>props.set(k,v),townRecord:t=>t.data,townNear:()=>t,townGet:()=>t,currentPlace:()=>undefined,seasonDay:()=>0,raining:()=>false,dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),factoryResidentRole:()=>undefined,friendlyResidentById:new Map([['hakkai:resident_0_2',{role:'artisan'}]]),BUILDER_IDS:[],state:()=>state,report:()=>{}};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 ctx.lifeTick(p,undefined,0);assert.equal(t.data.goods,3);assert.equal(t.data.lifeFood,2);assert.equal(output.items[0].amount,1);assert.equal(source.items[0].amount,6);
 now=200;ctx.lifeTick(p,undefined,200);assert.equal(output.items[0].amount,1,'workshop cooldown');
 now=1200;ctx.lifeTick(p,undefined,1200);assert.equal(output.items[0].amount,2);assert.equal(source.items[0].amount,3);assert.equal(t.data.goods,3,'abstract work daily cap');
}
{
 const input=inventory([new Item('minecraft:wheat',3)]),output=inventory([undefined]);
 const d={isChunkLoaded:()=>true,getBlock:p=>({typeId:'minecraft:barrel',getComponent:()=>({container:p.x?output:input})}),getEntities:()=>[{isValid:true,typeId:'artisan',location:{x:1,y:0,z:0}}]};
 const t={d,l:{x:0,y:0,z:0}},setup={input:{x:0,y:0,z:0},output:{x:2,y:0,z:0}};
 const o={ItemStack:Item,factoryTransaction,factoryResidentRole:()=>undefined,friendlyResidentById:new Map([['artisan',{role:'artisan'}]]),onCraft:()=>{throw Error('ledger failure');}};
 assert.equal(workshopStep(t,setup,o),undefined);assert.deepEqual(snap(input),[['minecraft:wheat',3]]);assert.deepEqual(snap(output),[undefined]);
 output.items[0]=new Item('minecraft:stone',64);assert.equal(workshopStep(t,setup,{...o,onCraft:()=>{throw Error('should not commit');}}),undefined);assert.deepEqual(snap(input),[['minecraft:wheat',3]]);
}
