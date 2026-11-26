import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {places} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {setupExpeditionRecords} from '../Hakkai_v7.1.0/BehaviorPack/scripts/expedition_records.js';
import {progressReward} from '../Hakkai_v7.1.0/BehaviorPack/scripts/inventory_exchange.js';
class Item{constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64})}clone(){return new Item(this.typeId,this.amount)}isStackableWith(o){return this.typeId===o.typeId}}
function fixture(){
 const notices=[],reports=[],properties=new Map(),inv={size:1,items:[new Item('minecraft:stone',64)],getItem(i){return this.items[i]?.clone()},setItem(i,v){this.items[i]=v?.clone();if(this.fail){this.fail=false;throw Error('after write')}}};
 const player={id:'p',dimension:{id:'hakkai:realm_0',spawnParticle:()=>{}},location:{x:118,y:88,z:0},playSound:()=>{},getDynamicProperty:k=>properties.get(k),setDynamicProperty(k,v){if(v===undefined)properties.delete(k);else properties.set(k,v);if(this.failKey===k){this.failKey=undefined;throw Error('after save')}}};
 const ns='hakkai:',num=(_p,k)=>properties.get(ns+k)??0,space=()=>inv,report=(...r)=>reports.push(r);
 const records=setupExpeditionRecords({ns,places,num,notice:(_p,s)=>notices.push(s),paged:()=>{},simple:()=>{},frontierWorlds:{siteCoords:()=>undefined,isGenerated:()=>false},claimDiscovery:(p,id,key,value)=>progressReward(p,[],[[id,1]],{[key]:value},{space,ItemStack:Item,ns,report})});
 return {records,player,inv,notices,properties,reports};
}
test('expedition full inventory retries without losing the one-time reward or record',()=>{
 const f=fixture();f.records.tick(f.player,0);assert.equal(f.records.count(f.player),0);assert.equal(f.inv.items[0].typeId,'minecraft:stone');assert.match(f.notices.at(-1),/空き/);
 f.inv.items[0]=undefined;f.records.tick(f.player,199);assert.equal(f.records.count(f.player),0,'retry is throttled');f.records.tick(f.player,200);assert.equal(f.records.count(f.player),1);assert.equal(f.inv.items[0].typeId,'hakkai:bandage');assert.equal(f.inv.items[0].amount,1);
 f.records.tick(f.player,400);assert.equal(f.inv.items[0].amount,1,'no duplicate reward');
});
test('failed inventory or record write restores state and permits retry',()=>{
 for(const fault of ['inventory','property']){
  const f=fixture();f.inv.items[0]=undefined;if(fault==='inventory')f.inv.fail=true;else f.player.failKey='hakkai:discoveries';
  f.records.tick(f.player,1);assert.equal(f.records.count(f.player),0,fault);assert.equal(f.inv.items[0],undefined,fault);assert.ok(f.reports.length);assert.match(f.notices.at(-1),/保存できません/);
  f.records.tick(f.player,201);assert.equal(f.records.count(f.player),1);assert.equal(f.inv.items[0].typeId,'hakkai:bandage');
 }
});
test('production passes the real transactional progressReward and guide states the retry policy',()=>{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 assert.match(src,/claimDiscovery:\(p,id,key,value\)=>progressReward\(p,\[\],\[\[id,1\]\],\{\[key\]:value\},\{space,ItemStack,ns,report\}\)/);
 const guide=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/expedition_records.js','utf8');assert.match(guide,/持ち物が満杯なら空きを作り/);
});
