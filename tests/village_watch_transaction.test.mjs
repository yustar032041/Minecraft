// Actual deferred village-watch handler, with mock Bedrock entities and storage.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {inventoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js';
class Item{constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64})}clone(){return new Item(this.typeId,this.amount)}isStackableWith(x){return this.typeId===x.typeId}}
class Inventory{constructor(items){this.items=items;this.size=items.length;this.n=0}getItem(i){return this.items[i]?.clone()}setItem(i,x){this.items[i]=x?.clone();if(++this.n===this.failAt){this.failAt=0;throw Error('slot mutated')}}}
function fixture({mode='survival',emeralds=2}={}){
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),a=src.indexOf('async function villageWatch('),b=src.indexOf('const seasonalCrops=',a);assert.ok(a>=0&&b>a);
 let day=5,blocked=false,failSpawn=false;const pending=[],notices=[],reports=[],spawned=[],props=new Map([['hakkai:trust',12]]),inv=new Inventory([emeralds?new Item('minecraft:emerald',emeralds):undefined]);
 const d={id:'realm',getEntities:()=>blocked?[{},{}]:spawned.filter(x=>!x.removed),spawnEntity:(id,at)=>{if(failSpawn)throw Error('spawn failed');const e={id,at,removed:false,remove(){this.removed=true}};spawned.push(e);return e}};
 const p={isValid:true,mode,dimension:d,location:{x:0,y:0,z:0},inv,getGameMode(){return this.mode},getDynamicProperty:k=>props.get(k),setDynamicProperty(k,v){if(v===undefined)props.delete(k);else props.set(k,v);if(this.failKey===k){this.failKey=undefined;throw Error('property mutated')}}};
 const v={isValid:true,dimension:d,location:{x:1,y:0,z:0}};
 const ctx={ns:'hakkai:',villagerNear:()=>v,seasonDay:()=>day,form:()=>new Promise(r=>pending.push(r)),simple:()=>{},civicRoles:[{id:'patrol_guard',name:'見張り'},{id:'patrol_mage',name:'魔法'},{id:'patrol_archer',name:'弓'}],dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),space:p=>p.inv,num:(_p,k,f=0)=>props.get('hakkai:'+k)??f,isCreative:p=>p.mode==='creative',total:(c,id)=>c.items.reduce((n,x)=>n+(x?.typeId===id?x.amount:0),0),safeNear:()=>({x:2,y:0,z:0}),inventoryTransaction,property:(p,k,value)=>p.setDynamicProperty('hakkai:'+k,value),report:(...x)=>reports.push(x),notice:(_p,s)=>notices.push(s)};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b),ctx);
 const open=()=>ctx.villageWatch(p),answer=async(choice=0)=>{const t=open();pending.shift()(choice);await t};return {ctx,p,v,d,inv,props,spawned,pending,notices,reports,open,answer,setDay:x=>day=x,setBlocked:x=>blocked=x,setFailSpawn:x=>failSpawn=x};
}
test('survival pays and records once; creative remains free',async()=>{
 for(const mode of ['survival','creative']){const f=fixture({mode});await f.answer(2);assert.equal(f.spawned.filter(x=>!x.removed).length,1);assert.equal(f.spawned[0].id,'hakkai:patrol_archer');assert.equal(f.inv.items[0].amount,mode==='creative'?2:1);assert.equal(f.props.get('hakkai:patrol_day'),5);await f.answer(0);assert.equal(f.spawned.length,1)}
});
test('inventory, spawn and post-mutation record failures restore emerald and remove known spawned guard',async()=>{
 for(const fault of ['slot','spawn','record']){const f=fixture();if(fault==='slot')f.inv.failAt=1;if(fault==='spawn')f.setFailSpawn(true);if(fault==='record')f.p.failKey='hakkai:patrol_day';await f.answer();assert.equal(f.inv.items[0].amount,2);assert.equal(f.props.has('hakkai:patrol_day'),false);assert.equal(f.spawned.filter(x=>!x.removed).length,0);assert.ok(f.notices.at(-1).includes('できません'));}
});
test('form checks current day, current trust, target distance, cap and role',async()=>{
 const f=fixture();let task=f.open();f.setDay(6);f.pending.shift()(0);await task;assert.equal(f.spawned.length,0);assert.match(f.notices.at(-1),/日が変わりました/);
 task=f.open();f.props.set('hakkai:trust',0);f.pending.shift()(0);await task;assert.equal(f.spawned.length,0);f.props.set('hakkai:trust',12);
 task=f.open();f.v.location.x=20;f.pending.shift()(0);await task;assert.equal(f.spawned.length,0);f.v.location.x=1;
 f.setBlocked(true);await f.answer();assert.equal(f.spawned.length,0);f.setBlocked(false);await f.answer(999);assert.equal(f.spawned.length,0);assert.equal(f.inv.items[0].amount,2);
});
test('two overlapping forms only reserve one patrol',async()=>{
 const f=fixture(),a=f.open(),b=f.open();f.pending.shift()(0);await a;f.pending.shift()(0);await b;assert.equal(f.spawned.length,1);assert.equal(f.inv.items[0].amount,1);assert.equal(f.props.get('hakkai:patrol_day'),5);
});
