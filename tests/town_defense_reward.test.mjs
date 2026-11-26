// Production vanilla-hostile death tail and actual item/property planner.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {progressReward} from '../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js';
class Item{constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64})}clone(){return new Item(this.typeId,this.amount)}isStackableWith(x){return this.typeId===x.typeId}}
class Inventory{constructor(items){this.items=items;this.size=items.length;this.writes=0}getItem(i){return this.items[i]?.clone()}setItem(i,v){this.items[i]=v?.clone();if(++this.writes===this.failAt){this.failAt=0;throw Error('inventory mutated')}}}
function setup(){
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=src.indexOf(" const killer=/** @type {import('@minecraft/server').Player | undefined} */ (damageSource.damagingEntity);"),b=src.indexOf("\n});\r\nsafeSub('world','after','entityDie',e=>",a);assert.ok(a>=0&&b>a);
 let now=10000;const notices=[],reports=[],ctx={ns:'hakkai:',progressReward,ItemStack:Item,space:p=>p.inv,report:(...x)=>reports.push(x),notice:(p,m)=>notices.push([p.id,m]),vanillaDrops:{zombie:0},villagerNear:()=>true,townNear:()=>({}),townScore:()=>2,world:{getAbsoluteTime:()=>now},Math:{...Math,random:()=>1,min:Math.min},num:(p,k,f=0)=>p.props.get('hakkai:'+k)??f,property(p,k,v){p.setDynamicProperty('hakkai:'+k,v)}};
 vm.createContext(ctx);vm.runInContext(`function death(deadEntity,damageSource){const t=deadEntity.typeId;${src.slice(a,b)}}`,ctx);
 const player=(id,items=[undefined])=>({id,typeId:'minecraft:player',isValid:true,location:{},dimension:{},inv:new Inventory(items),props:new Map(),getDynamicProperty(k){return this.props.get(k)},setDynamicProperty(k,v){if(v===undefined)this.props.delete(k);else this.props.set(k,v);if(this.failKey===k){this.failKey=undefined;throw Error('property mutated')}}});
 const kill=p=>ctx.death({typeId:'minecraft:zombie',dimension:{spawnItem:()=>{}},location:{}},{damagingEntity:p});return {ctx,player,kill,notices,reports,setTime:n=>now=n};
}
test('town defense gift, cooldown and best-effort rollback with unchanged trust bookkeeping',()=>{
 const f=setup(),p=f.player('a');p.failKey='hakkai:last_defense_gift';f.kill(p);assert.equal(p.props.get('hakkai:trust'),1);assert.equal(p.props.has('hakkai:last_defense_gift'),false);assert.equal(p.inv.items[0],undefined);
 f.kill(p);assert.equal(p.inv.items[0].typeId,'hakkai:shard_0');assert.equal(p.props.get('hakkai:last_defense_gift'),10000);assert.equal(p.props.get('hakkai:trust'),2);f.kill(p);assert.equal(p.inv.items[0].amount,1);
 f.setTime(11200);f.kill(p);assert.equal(p.inv.items[0].amount,2);
});
test('full or failed writes do not set the gift cooldown; separate players are independent',()=>{
 const f=setup(),a=f.player('a',[new Item('other',64)]),b=f.player('b');f.kill(a);f.kill(b);assert.equal(a.props.has('hakkai:last_defense_gift'),false);assert.equal(b.inv.items[0].amount,1);
 a.inv.items[0]=undefined;a.inv.failAt=1;f.kill(a);assert.equal(a.props.has('hakkai:last_defense_gift'),false);assert.equal(a.inv.items[0],undefined);f.kill(a);assert.equal(a.inv.items[0].amount,1);
});
