import assert from 'node:assert/strict';
import {EquipmentSlot as Slot,GameMode} from '@minecraft/server';
import {setupShieldWear} from '../Hakkai_v7.1.0/BehaviorPack/scripts/shield_wear.js';
import {deferShieldArrow} from '../Hakkai_v7.1.0/BehaviorPack/scripts/shield_reflect.js';
function makeItem(type='hakkai:gear_006',damage=0,max=20,props={},unbreakable=false){
 const durability={damage,maxDurability:max,unbreakable};
 return {typeId:type,getDynamicProperty:k=>props[k],setDynamicProperty:(k,v)=>{props[k]=v},getComponent:k=>k==='minecraft:durability'?durability:undefined,
  copy:()=>makeItem(type,durability.damage,max,{...props},durability.unbreakable)};
}
function fixture(slot=Slot.Offhand){
 const queue=[],held={};held[slot]=makeItem();
 const eq={getEquipment:s=>held[s]?.copy(),setEquipment:(s,item)=>{held[s]=item?.copy();return true}};
 const p={id:'p',isValid:true,selectedSlotIndex:0,getGameMode:()=>GameMode.Survival,getComponent:()=>eq,playSound:()=>{}};
 const system={currentTick:10,run:fn=>queue.push(fn)};const wear=setupShieldWear({system});const shield={slot,typeId:'hakkai:gear_006'};
 return {p,held,eq,system,wear,shield,queue,drain:()=>{while(queue.length)queue.shift()()}};
}
for(const slot of [Slot.Mainhand,Slot.Offhand]){
 const f=fixture(slot);assert.equal(f.wear.reserve(f.p,f.shield,5),false,'unprepared item cannot block for free');
 assert.equal(f.wear.prepare(f.p,f.shield),true);assert.equal(f.wear.reserve(f.p,f.shield,2),true);assert.equal(f.queue.length,0,'small hit no wear');
 assert.equal(f.wear.reserve(f.p,f.shield,5),true);assert.equal(f.held[slot].getComponent('minecraft:durability').damage,0,'no mutation in before event');
 f.drain();assert.equal(f.held[slot].getComponent('minecraft:durability').damage,6,'deferred hit wear');
 assert.equal(f.wear.reserve(f.p,f.shield,14),true);assert.equal(f.wear.reserve(f.p,f.shield,1),false,'pending break blocks subsequent hits');
 f.drain();assert.equal(f.held[slot],undefined,'shield breaks after exhausting durability');
}
{
 const f=fixture();f.wear.prepare(f.p,f.shield);f.wear.reserve(f.p,f.shield,5);const replacement=makeItem();f.held[Slot.Offhand]=replacement;f.drain();
 assert.equal(f.held[Slot.Offhand].getComponent('minecraft:durability').damage,0,'never charge a swapped shield');
}
{
 const f=fixture(Slot.Mainhand);f.wear.prepare(f.p,f.shield);f.wear.reserve(f.p,f.shield,5);f.p.selectedSlotIndex=1;f.drain();
 assert.equal(f.held[Slot.Mainhand].getComponent('minecraft:durability').damage,0,'never touch a different selected slot');
}
{
 const f=fixture();f.wear.prepare(f.p,f.shield);f.wear.reserve(f.p,f.shield,4);f.wear.reserve(f.p,f.shield,4);f.drain();
 assert.equal(f.held[Slot.Offhand].getComponent('minecraft:durability').damage,10,'same-tick attacks both paid');
}
{
 const f=fixture();f.p.getGameMode=()=>GameMode.Creative;assert.equal(f.wear.prepare(f.p,f.shield),true);assert.equal(f.wear.reserve(f.p,f.shield,5),true);assert.equal(f.queue.length,0);
 const g=fixture();g.held[Slot.Offhand]=makeItem('hakkai:gear_006',0,20,{},true);g.wear.prepare(g.p,g.shield);assert.equal(g.wear.reserve(g.p,g.shield,10),true);assert.equal(g.queue.length,0);
 const h=fixture();h.wear.prepare(h.p,h.shield);h.system.run=()=>{throw Error('not available')};assert.equal(h.wear.reserve(h.p,h.shield,4),false,'no block if debit cannot be scheduled');
}
function arrowFixture(){
 const queue=[],shots=[],d={id:'realm'},p={isValid:true,dimension:d,location:{x:0,y:80,z:0}},comp={shoot:v=>shots.push(v)};
 const arrow={typeId:'minecraft:arrow',isValid:true,dimension:d,location:{x:1,y:80,z:0},getVelocity:()=>({x:-2,y:-.2,z:0}),clearVelocity:()=>shots.push('clear'),getComponent:()=>comp};
 const system={run:fn=>queue.push(fn)},source={cause:'projectile',damagingProjectile:arrow};return {queue,shots,d,p,comp,arrow,system,source};
}
{
 const f=arrowFixture();assert.equal(deferShieldArrow({system:f.system,player:f.p,source:f.source}),true);assert.deepEqual(f.shots,[]);
 f.queue.shift()();assert.equal(f.comp.owner,f.p);assert.equal(f.shots[0],'clear');assert.deepEqual(f.shots[1],{x:1,y:.1,z:-0});
}
for(const mutate of [f=>f.arrow.isValid=false,f=>f.arrow.dimension={id:'other'},f=>f.arrow.location.x=20,f=>f.p.isValid=false]){
 const f=arrowFixture();deferShieldArrow({system:f.system,player:f.p,source:f.source});mutate(f);f.queue.shift()();assert.deepEqual(f.shots,[],'stale arrow never changed');
}
{
 const f=arrowFixture();f.arrow.typeId='minecraft:trident';assert.equal(deferShieldArrow({system:f.system,player:f.p,source:f.source}),false);assert.equal(f.queue.length,0);
 const g=arrowFixture();g.arrow.getVelocity=()=>({x:0,y:0,z:0});assert.equal(deferShieldArrow({system:g.system,player:g.p,source:g.source}),false);
}
console.log('Shield wear and arrow reflection: deferred writes, both slots, swaps, queued breaks, no spawning and stale entities (simulated)');
