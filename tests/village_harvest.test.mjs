import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {villageHarvestStep,validVillageHarvest} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_harvest.js';
import {farmStep} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_farm.js';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';

class Item {
 constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64});}
 clone(){return new Item(this.typeId,this.amount);}
 isStackableWith(o){return this.typeId===o.typeId;}
}
class Container {
 constructor(items=[undefined]){this.items=items;this.size=items.length;}
 getItem(i){return this.items[i]?.clone();}
 setItem(i,v){this.items[i]=v?.clone();}
}
const pos=(x,y,z)=>({x,y,z}),key=p=>`${p.x},${p.y},${p.z}`;
function fixture(){
 const map=new Map(),output=new Container(),cursors=new Map(),reports=[];
 const d={id:'hakkai:realm_0',unloaded:new Set(),workers:[],isChunkLoaded:p=>!d.unloaded.has(key(p)),getBlock:p=>map.get(key(p))??{typeId:'minecraft:air'},getEntities:()=>d.workers};
 const barrelPos=pos(0,80,0),barrel={typeId:'minecraft:barrel',getComponent:()=>({container:output})};map.set(key(barrelPos),barrel);
 const town={d,l:pos(0,80,0),factoryVillage:false},registration={...barrelPos};
 const worker={isValid:true,typeId:'minecraft:villager_v2',dimension:d,location:pos(1,80,0),role:'artisan',getComponent:()=>undefined};d.workers.push(worker);
 const permutation=(id,state,age)=>({id,getState:k=>k===state?age:undefined,withState:(k,v)=>permutation(id,state,k===state?v:age)});
 function crop(p,id='minecraft:wheat',age=7,state='growth'){
  const b={typeId:id,permutation:permutation(id,state,age),setPermutation(v){this.permutation=v;}};
  map.set(key(p),b);map.set(key(pos(p.x,p.y-1,p.z)),{typeId:'minecraft:farmland'});return b;
 }
 const options={farmStep,factoryTransaction,ItemStack:Item,cursors,workerRole:e=>e.role==='artisan'||town.factoryVillage&&e.role==='grower',currentHarvest:()=>registration,report:(...args)=>reports.push(args)};
 return {d,map,output,town,registration,worker,options,crop,run:()=>villageHarvestStep(town,registration,options),reports};
}
for(const [id,state,max,item,amount] of [
 ['minecraft:wheat','growth',7,'minecraft:wheat',1],['minecraft:carrots','growth',7,'minecraft:carrot',2],['minecraft:potatoes','growth',7,'minecraft:potato',2],['minecraft:beetroot','growth',7,'minecraft:beetroot',1],
 ...['spring_tulip','summer_corn','autumn_squash','ice_blossom','summer_sunflower'].map(n=>['hakkai:'+n,'hakkai:age',3,'hakkai:'+n+'_produce',2])]){
 test(`nearby registered village worker harvests ${id} into barrel`,()=>{
  const f=fixture(),crop=f.crop(pos(2,80,1),id,max,state);assert.equal(f.run(),true);
  assert.deepEqual([f.output.getItem(0).typeId,f.output.getItem(0).amount],[item,amount]);assert.equal(crop.permutation.getState(state),0);assert.equal(f.run(),false);
 });
}
test('requires registration, a nearby adult eligible worker, and a loaded barrel',()=>{
 for(const fault of ['unregistered','distant','baby','wrong_role','wrong_dimension','unloaded','no_barrel']){
  const f=fixture(),crop=f.crop(pos(1,80,0));
  if(fault==='unregistered')f.options.currentHarvest=()=>undefined;
  if(fault==='distant')f.worker.location=pos(7,80,0);
  if(fault==='baby')f.worker.getComponent=()=>({});
  if(fault==='wrong_role')f.worker.role='guide';
  if(fault==='wrong_dimension')f.worker.dimension={id:'elsewhere'};
  if(fault==='unloaded')f.d.unloaded.add(key(f.registration));
  if(fault==='no_barrel')f.map.set(key(f.registration),{typeId:'minecraft:stone'});
  assert.equal(f.run(),false,fault);assert.equal(crop.permutation.getState('growth'),7,fault);assert.equal(f.output.getItem(0),undefined,fault);
 }
});
test('only the registered same-height 5x5 farmland is harvested, with full or unripe crops left alone',()=>{
 const f=fixture(),outside=f.crop(pos(3,80,0)),above=f.crop(pos(1,81,0)),immature=f.crop(pos(-1,80,0),'minecraft:wheat',6),ripe=f.crop(pos(1,80,0));
 f.output.items[0]=new Item('minecraft:stone',64);assert.equal(f.run(),false);assert.equal(ripe.permutation.getState('growth'),7);
 f.output.items[0]=undefined;assert.equal(f.run(),true);
 assert.equal(ripe.permutation.getState('growth'),0);assert.equal(outside.permutation.getState('growth'),7);assert.equal(above.permutation.getState('growth'),7);assert.equal(immature.permutation.getState('growth'),6);
});
test('factory grower is supported only in the factory village',()=>{
 const f=fixture();f.worker.role='grower';f.crop(pos(1,80,0));assert.equal(f.run(),false);f.town.factoryVillage=true;assert.equal(f.run(),true);
});
test('registration and worker role are rechecked when writing the harvest',()=>{
 for(const fault of ['registration','worker']){
  const f=fixture(),crop=f.crop(pos(1,80,0)),set=f.output.setItem.bind(f.output);let first=true,registered=true;
  f.options.currentHarvest=()=>registered?f.registration:undefined;
  f.output.setItem=(i,v)=>{set(i,v);if(first){first=false;if(fault==='registration')registered=false;else f.worker.role='guide';}};
  assert.equal(f.run(),false);assert.equal(crop.permutation.getState('growth'),7);assert.equal(f.output.getItem(0),undefined);
 }
});
test('barrel registration has bounded village coordinates',()=>{
 const f=fixture();assert.equal(validVillageHarvest(f.town,pos(28,80,0)),true);assert.equal(validVillageHarvest(f.town,pos(29,80,0)),false);
 assert.equal(validVillageHarvest(f.town,pos(0.5,80,0)),false);f.town.factoryVillage=true;assert.equal(validVillageHarvest(f.town,pos(50,80,0)),true);
});

test('actual village menu and block interaction register and cancel the harvest barrel',async()=>{
 const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const a=source.indexOf('async function villageSupplyMenu('),b=source.indexOf('async function villageCrisisMenu(',a);
 const c=source.indexOf("safeSub('world','before','playerInteractWithBlock'"),end=source.indexOf('async function returnMenu(',c);assert.ok(a>0&&b>a&&c>0&&end>c);
 const f=fixture(),state={},notices=[];let handler,pick=6;
 const player={isValid:true,isSneaking:true,location:pos(0,80,0),dimension:f.d};f.town.data={};
 const ctx={form:async()=>pick,lifeNear:()=>true,lifeWorkers:()=>({}),townRecord:t=>t.data,saveVillageLife:(t,v)=>{t.data=v;},notice:(_p,m)=>notices.push(m),state:()=>state,system:{currentTick:0,run:fn=>fn()},validVillageHarvest,dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),townGet:()=>f.town,report:()=>{},safeSub:(_a,_b,_c,fn)=>{handler=fn;},GameMode:{Spectator:'spectator'}};
 vm.createContext(ctx);vm.runInContext(source.slice(a,b)+'\n'+source.slice(c,end),ctx);
 await ctx.villageSupplyMenu(player,f.town);assert.equal(state.villageBarrelPick.mode,'harvest');
 const event={player,isFirstEvent:true,block:{...f.registration,dimension:f.d,typeId:'minecraft:barrel'},cancel:false};handler(event);
 assert.equal(event.cancel,true);assert.deepEqual(JSON.parse(JSON.stringify(f.town.data.lifeHarvest)),f.registration);assert.equal(state.villageBarrelPick,undefined);
 pick=7;await ctx.villageSupplyMenu(player,f.town);assert.equal(f.town.data.lifeHarvest,undefined);
});

test('village life tick runs one registered harvest per ten seconds',()=>{
 const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const start=source.indexOf('function cultureTownForSite('),end=source.indexOf('async function townMenu(',start);assert.ok(start>0&&end>start);
 const f=fixture(),first=f.crop(pos(1,80,0)),second=f.crop(pos(2,80,0)),player={isValid:true,dimension:f.d,location:pos(0,80,0)};
 const state={};let now=0;f.town.data={lifeHarvest:{...f.registration},goods:0};
 const ctx={world:{getAbsoluteTime:()=>now},state:()=>state,townRecord:t=>t.data,seasonDay:()=>0,detectCrisis:()=>undefined,workDay:()=>undefined,
  festivalAt:()=>({open:false}),villageTier:()=>({index:0}),villageHarvestStep,farmStep,factoryTransaction,ItemStack:Item,
  factoryResidentRole:e=>e.role,villagerJob:e=>e.role,report:()=>{}};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 ctx.lifeTownForPlayer=()=>f.town;ctx.lifeNear=()=>true;ctx.lifeSignals=()=>({});ctx.lifeWorkers=()=>({});ctx.lifeBuildings=()=>0;
 ctx.saveVillageLife=(t,data)=>{t.data=data;};ctx.lifeRealm=()=>0;
 ctx.lifeTick(player,undefined,0);assert.equal(f.output.getItem(0).amount,1);assert.equal(f.town.data.lifeHarvestAt,0);
 now=100;ctx.lifeTick(player,undefined,100);assert.equal(f.output.getItem(0).amount,1);
 now=200;ctx.lifeTick(player,undefined,200);assert.equal(f.output.getItem(0).amount,2);assert.equal(first.permutation.getState('growth'),0);assert.equal(second.permutation.getState('growth'),0);
});
