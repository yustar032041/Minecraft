// Runs the actual transfer function with simulated Minecraft objects.
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';
class ItemStack {constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64});}clone(){return new ItemStack(this.typeId,this.amount);}isStackableWith(x){return this.typeId===x.typeId;}}
class Container {constructor(items){this.items=items;this.size=items.length;this.failOnce=false;}getItem(i){return this.items[i]?.clone();}setItem(i,v){this.items[i]=v?.clone();if(this.failOnce){this.failOnce=false;throw Error('write failed');}}}
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const start=src.indexOf('function transfer(b){'),end=src.indexOf("safeSub('system','before','startup'",start);assert.ok(start>=0&&end>start);
function fixture(kind,inputs,outputs=[undefined,undefined]){
 const from=new Container(inputs),to=new Container(outputs),reports=[],produced=[];
 const ore={typeId:'hakkai:ore_3',permutation:{id:'ore'},setType(id){this.typeId=id;if(this.failOnce){this.failOnce=false;throw Error('block failed');}},setPermutation(p){this.typeId=p.id==='ore'?'hakkai:ore_3':p.id;}};
 const barrel=c=>({typeId:'minecraft:barrel',getComponent:()=>({container:c})});
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getBlockFromRay:()=>({}),getBlock:l=>l.x===-1?barrel(from):l.x===1?barrel(to):ore};
 const b={typeId:'hakkai:'+kind,dimension:d,x:0,y:80,z:0};
 const total=(c,id)=>c.items.reduce((a,v)=>a+(v?.typeId===id?v.amount:0),0);
 const room=(c,s)=>c.items.reduce((a,v)=>a+(!v?s.maxAmount:v.isStackableWith(s)?v.maxAmount-v.amount:0),0)>=s.amount;
 const ctx={ns:'hakkai:',world:{getTimeOfDay:()=>6000},currentWeather:new Map(),WeatherType:{Thunder:'thunder',Rain:'rain'},system:{currentTick:0},ItemStack,total,room,factoryTransaction,production:(_,n)=>produced.push(n),report:(...x)=>reports.push(x)};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
 return {from,to,ore,b,ctx,reports,produced,run:()=>ctx.transfer(b)};
}
const item=(id,n=1)=>new ItemStack(id,n);const snap=c=>c.items.map(v=>v&&[v.typeId,v.amount]);
for(const [kind,raw,out] of [['mill','minecraft:raw_iron','minecraft:iron_ingot'],['kiln','minecraft:sand','minecraft:glass']]){
 const f=fixture(kind,[item('minecraft:coal'),item(raw,3)]);f.run();assert.deepEqual(snap(f.from),[undefined,undefined]);assert.deepEqual(snap(f.to),[[out,3],undefined]);assert.deepEqual(f.produced,[3]);
}
{
 const f=fixture('compressor',[item('hakkai:shard_2',2),item('minecraft:amethyst_shard')]);f.run();assert.deepEqual(snap(f.to),[['hakkai:crystal_2',1],undefined]);
}
{
 const f=fixture('sorter',[item('hakkai:shard_2',2)]);f.run();assert.deepEqual(snap(f.from),[['hakkai:shard_2',1]]);assert.deepEqual(snap(f.to),[['hakkai:shard_2',1],undefined]);
}
{
 const f=fixture('miner',[item('minecraft:coal')]);f.run();assert.equal(f.ore.typeId,'minecraft:air');assert.deepEqual(snap(f.to),[['hakkai:crystal_3',1],undefined]);
}
for(const fail of ['inventory','block']){
 const f=fixture('miner',[item('minecraft:coal')]);if(fail==='inventory')f.to.failOnce=true;else f.ore.failOnce=true;
 f.run();assert.equal(f.ore.typeId,'hakkai:ore_3');assert.deepEqual(snap(f.from),[['minecraft:coal',1]]);assert.deepEqual(snap(f.to),[undefined,undefined]);assert.equal(f.produced.length,0);assert.ok(f.reports.length,fail);
}
console.log('Actual machine transfer: mill, kiln, compressor, sorter and miner with failure rollback OK (simulated)');
