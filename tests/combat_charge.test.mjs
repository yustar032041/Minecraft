import assert from 'node:assert/strict';
import {setupCombatCharge} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_charge.js';
const system={currentTick:0,queue:[],run(fn){this.queue.push(fn);}},casts=[];
const gs=[{kind:'剣',id:'s'},{kind:'斧',id:'a'},{kind:'槍',id:'l'},{kind:'弓',id:'b'},{kind:'盾',id:'d'}];
const gear=new Map(gs.map(g=>[g.id,g])),s={useTick:-100},p={id:'p',isValid:true,isSneaking:true,selectedSlotIndex:0,dimension:{id:'d'},getGameMode:()=> 'survival'};let held='s';
const c=setupCombatCharge({system,gear,selected:()=>({typeId:held}),state:()=>s,cast:(_,g,charged)=>casts.push([g.kind,charged])});
for(const id of ['s','a','l']){
 held=id;system.currentTick+=100;let t=system.currentTick;c.start(p,{typeId:id});system.currentTick=t+23;assert.equal(c.release(p,{typeId:id}),false);assert.equal(casts.length,gs.slice(0,['s','a','l'].indexOf(id)).length);
 c.start(p,{typeId:id});system.currentTick+=24;assert.equal(c.release(p,{typeId:id}),true);assert.equal(casts.at(-1)[1],true);assert.equal(c.release(p,{typeId:id}),false,'release once');
}
held='b';system.currentTick=500;c.start(p,{typeId:'b'});system.currentTick=518;assert.equal(c.release(p,{typeId:'b'}),true,'bow behavior retained');
held='s';system.currentTick=550;c.start(p,{typeId:'s'});assert.ok(c.status(p,560).includes('溜めています'));assert.ok(c.status(p,574).includes('離す'));c.clear(p.id);assert.equal(c.status(p,574),'');
held='s';system.currentTick=600;c.start(p,{typeId:'s'});c.stop(p);system.currentTick=624;assert.equal(c.release(p,{typeId:'s'}),true,'stop-before-release accepted');system.queue.splice(0).forEach(fn=>fn());
system.currentTick=700;c.start(p,{typeId:'s'});c.stop(p);system.currentTick=701;c.start(p,{typeId:'s'});system.queue.splice(0).forEach(fn=>fn());system.currentTick=725;assert.equal(c.release(p,{typeId:'s'}),true,'stop cannot clear new draw');
for(const change of [()=>{p.isSneaking=false},()=>{p.selectedSlotIndex=1},()=>{p.dimension.id='other'},()=>{held='a'},()=>{s.busy=true}]){
 p.isSneaking=true;p.selectedSlotIndex=0;p.dimension.id='d';held='s';s.busy=false;system.currentTick+=100;c.start(p,{typeId:'s'});change();system.currentTick+=24;assert.equal(c.release(p,{typeId:'s'}),false);
}
p.isSneaking=true;p.selectedSlotIndex=0;p.dimension.id='d';held='s';s.busy=false;system.currentTick+=100;c.start(p,{typeId:'s'});system.currentTick+=300;c.complete(p,{typeId:'s'});assert.equal(c.release(p,{typeId:'s'}),false,'completed use does not auto attack');
// An invalid new start cancels an earlier abandoned draw.
system.currentTick+=100;c.start(p,{typeId:'s'});p.isSneaking=false;c.start(p,{typeId:'s'});p.isSneaking=true;system.currentTick+=24;assert.equal(c.release(p,{typeId:'s'}),false);
// Stop for a different item cannot erase a newer draw.
system.currentTick+=100;c.start(p,{typeId:'s'});c.stop(p,{typeId:'a'});system.queue.splice(0).forEach(fn=>fn());system.currentTick+=24;assert.equal(c.release(p,{typeId:'s'}),true);
console.log('Charged weapons: hold/release, duration, interruption, stop ordering, bow and anti-duplicates (mocked)');
