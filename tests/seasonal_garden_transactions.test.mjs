// Production custom-component callback with actual transaction planner.
// Native event order, block loading and client behavior require Bedrock tests.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {inventoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js';
import {seasonalPlants} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
class Item{constructor(typeId,amount=1,tag=''){Object.assign(this,{typeId,amount,tag,maxAmount:64})}clone(){return new Item(this.typeId,this.amount,this.tag)}isStackableWith(x){return this.typeId===x.typeId&&this.tag===x.tag}}
class Inventory{constructor(items){this.items=items;this.size=items.length;this.writes=0}getItem(i){return this.items[i]?.clone()}setItem(i,v){this.items[i]=v?.clone();if(++this.writes===this.failAt){this.failAt=0;throw Error('slot mutated then failed')}}}
const perm=age=>({getState:()=>age,withState:(_k,n)=>perm(n)});
function setup(name='spring_tulip',age=3,items=[undefined]){
 const notices=[],reports=[],inv=new Inventory(items),p={id:'a',isValid:true,selectedSlotIndex:0,inv,mode:'survival',getGameMode(){return this.mode}};
 const b={typeId:'hakkai:'+name,dimension:{id:'minecraft:overworld'},permutation:perm(age),floor:'minecraft:farmland',below(){return {typeId:this.floor,permutation:{getState:()=>7}}},setPermutation(v){this.permutation=v;if(this.fail){this.fail=false;throw Error('crop mutated then failed')}}};
 let handler;const ctx={inventoryTransaction,ItemStack:Item,space:p=>p.inv,selected:p=>p.inv.getItem(p.selectedSlotIndex),GameMode:{Spectator:'spectator',Adventure:'adventure',Creative:'creative'},isCreative:p=>p.mode==='creative',gardenById:new Map(seasonalPlants.map(x=>['hakkai:'+x.id,x])),gardenAge:'hakkai:age',ns:'hakkai:',notice:(p,m)=>notices.push([p.id,m]),report:(...x)=>reports.push(x),raining:()=>true,seasons:['春','夏','秋','冬'],era:()=> '春',safeReg:(_r,_id,x)=>handler=x,blockComponentRegistry:{}};
 vm.createContext(ctx);let a=src.indexOf('function growGarden('),z=src.indexOf('async function gardenGuide(',a);assert.ok(a>=0&&z>a);vm.runInContext(src.slice(a,z),ctx);
 a=src.indexOf(" safeReg(blockComponentRegistry,ns+'field_crop'");z=src.indexOf(" safeReg(blockComponentRegistry,ns+'canopy'",a);assert.ok(a>=0&&z>a);vm.runInContext(src.slice(a,z),ctx);
 const run=(player=p)=>handler.onPlayerInteract({block:b,player});return {ctx,handler,b,p,inv,notices,reports,run};
}
for(const plant of seasonalPlants){
 test(`${plant.id}: ripe harvest, regrowth and bone-meal cost`,()=>{
  const f=setup(plant.id);f.run();assert.equal(f.b.permutation.getState(),0);assert.equal(f.inv.items[0].typeId,'hakkai:'+plant.id+'_produce');assert.equal(f.inv.items[0].amount,2);f.run();assert.equal(f.inv.items[0].amount,2);
  f.inv.items[0]=new Item('minecraft:bone_meal',2,'tag');f.run();assert.equal(f.b.permutation.getState(),1);assert.equal(f.inv.items[0].amount,1);assert.equal(f.inv.items[0].tag,'tag');
  f.run();assert.equal(f.b.permutation.getState(),2);assert.equal(f.inv.items[0],undefined);
 });
}
test('harvest full, output write failure and crop write failure roll back',()=>{
 for(const fault of ['full','slot','block']){
  const f=setup('spring_tulip',3,[fault==='full'?new Item('minecraft:iron_hoe'):undefined]);if(fault==='slot')f.inv.failAt=1;if(fault==='block')f.b.fail=true;f.run();assert.equal(f.b.permutation.getState(),3);assert.equal(f.inv.items[0]?.typeId,fault==='full'?'minecraft:iron_hoe':undefined);assert.ok(f.notices.length);
  if(fault!=='full'){f.run();assert.equal(f.b.permutation.getState(),0);assert.equal(f.inv.items[0].amount,2)}
 }
});
test('fertilizer slot and crop failures restore both, and preserve the original stack',()=>{
 for(const fault of ['slot','block']){
  const f=setup('ice_blossom',1,[new Item('minecraft:bone_meal',3,'named')]);if(fault==='slot')f.inv.failAt=1;else f.b.fail=true;f.run();assert.equal(f.b.permutation.getState(),1);assert.equal(f.inv.items[0].amount,3);assert.equal(f.inv.items[0].tag,'named');f.run();assert.equal(f.b.permutation.getState(),2);assert.equal(f.inv.items[0].amount,2);
 }
});
test('creative use does not spend bone meal; wrong soil, mature, invalid age and modes refuse',()=>{
 const f=setup('spring_tulip',1,[new Item('minecraft:bone_meal',5)]);f.p.mode='creative';f.run();assert.equal(f.b.permutation.getState(),2);assert.equal(f.inv.items[0].amount,5);
 f.b.floor='minecraft:dirt';f.run();assert.equal(f.b.permutation.getState(),2);f.b.floor='minecraft:farmland';f.b.permutation=perm(3);f.run();assert.equal(f.inv.items[0].amount,5);
 for(const age of [-1,4,1.5]){f.b.permutation=perm(age);f.run();assert.equal(f.b.permutation.getState(),age)}
 f.b.permutation=perm(1);for(const mode of ['spectator','adventure']){f.p.mode=mode;f.run();assert.equal(f.b.permutation.getState(),1)}
});
test('only empty hand or hoe harvest, and two players cannot harvest the same ripe crop twice',()=>{
 const f=setup('summer_corn',3,[new Item('minecraft:diamond')]);f.run();assert.equal(f.b.permutation.getState(),3);
 f.inv.items[0]=new Item('minecraft:iron_hoe');f.inv.items.push(undefined);f.inv.size++;const b={...f.p,id:'b',inv:new Inventory([undefined])};f.run();f.run(b);
 assert.equal(f.b.permutation.getState(),0);assert.equal(f.inv.items[1].amount,2);assert.equal(b.inv.items[0],undefined);
});
test('natural random growth remains independent and requires farmland',()=>{
 const f=setup('spring_tulip',0);f.handler.onRandomTick({block:f.b});assert.equal(f.b.permutation.getState(),1);f.b.floor='minecraft:dirt';f.handler.onRandomTick({block:f.b});assert.equal(f.b.permutation.getState(),1);
});
test('five real blocks and output item definitions retain the custom component',()=>{
 for(const plant of seasonalPlants){const block=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/blocks/${plant.id}.json`))['minecraft:block'];const item=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/items/${plant.id}_produce.json`))['minecraft:item'];assert.ok(block.components['hakkai:field_crop']);assert.equal(item.description.identifier,'hakkai:'+plant.id+'_produce');}
});
