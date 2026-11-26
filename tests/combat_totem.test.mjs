import assert from 'node:assert/strict';
import {setupFushiTotem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_totem.js';
function fixture(){
 const queue=[],effects=[],removed=[],particles=[],damage=[],slots={Mainhand:{typeId:'hakkai:fushi_totem',clone(){return {...this}}},Offhand:undefined};
 const h={currentValue:8,setCurrentValue(v){this.currentValue=v;return true;}};
 let inv={0:slots.Mainhand};
 const equip={getEquipment:s=>s==='Mainhand'?inv[p.selectedSlotIndex]:slots[s],setEquipment:(s,v)=>{slots[s]=v;return true;}};
 const container={getItem:i=>inv[i],setItem:(i,v)=>{inv[i]=v;}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,selectedSlotIndex:0,getGameMode:()=> 'survival',getComponent:c=>c==='minecraft:health'?h:c==='minecraft:equippable'?equip:c==='minecraft:inventory'?{container}:undefined,getEffects:()=>[{typeId:'poison'},{typeId:'speed'}],removeEffect:e=>removed.push(e),addEffect:(...e)=>effects.push(e),dimension:{spawnParticle:(...a)=>particles.push(a)},location:{x:0,y:1,z:0},playSound:()=>{},applyDamage:(...a)=>damage.push(a)};
 const system={run:fn=>queue.push(fn)},controller=setupFushiTotem({system,notice:()=>{}});
 const event=(damage=10,cause='entityAttack')=>({hurtEntity:p,damage,cancel:false,damageSource:{cause}});
 return {p,h,inv,slots,equip,queue,effects,removed,particles,damage,controller,event,run:()=>queue.shift()?.()};
}
for(const hand of ['main','off']){
 const f=fixture();if(hand==='off'){f.inv[0]=undefined;f.slots.Offhand={typeId:'hakkai:fushi_totem',clone(){return {...this}}};}
 const e=f.event();assert.equal(f.controller.before(e),true);assert.equal(e.cancel,true);assert.equal(f.h.currentValue,8,'no world mutation in before event');
 const simultaneous=f.event();assert.equal(f.controller.before(simultaneous),true);assert.equal(f.queue.length,1,'single reservation');
 f.run();assert.equal(f.h.currentValue,1);assert.equal(hand==='main'?f.inv[0]:f.slots.Offhand,undefined);assert.deepEqual(f.removed,['poison','speed']);assert.equal(f.effects.length,3);assert.equal(f.particles.length,1);
 assert.equal(f.controller.before(f.event()),false,'single use');
}
{
 const f=fixture();assert.equal(f.controller.before(f.event(7)),false);for(const c of ['void','selfDestruct','override'])assert.equal(f.controller.before(f.event(50,c)),false);
 const e=f.event();e.cancel=true;assert.equal(f.controller.before(e),false);assert.equal(f.queue.length,0);
 f.slots.Offhand={typeId:'minecraft:totem_of_undying'};assert.equal(f.controller.before(f.event()),false,'native totem takes precedence');
}
{
 const f=fixture();const e=f.event();f.controller.before(e);f.inv[0]=undefined;f.run();assert.equal(f.h.currentValue,8);assert.equal(f.effects.length,0);assert.equal(f.damage.length,1,'unpaid hit is replayed');assert.equal(f.controller.isReplaying(f.p),false);
}
{
 const f=fixture();f.controller.before(f.event());f.p.selectedSlotIndex=1;f.inv[1]={typeId:'minecraft:apple'};f.run();assert.equal(f.inv[0],undefined,'debit original slot');assert.equal(f.inv[1].typeId,'minecraft:apple');
}
{
 const f=fixture();f.controller.before(f.event());f.h.currentValue=0;f.run();assert.ok(f.inv[0],'no consume after unrelated death');
}
{
 const f=fixture();f.p.getGameMode=()=> 'creative';assert.equal(f.controller.before(f.event()),false);
 f.p.getGameMode=()=> 'adventure';assert.equal(f.controller.before(f.event()),true);
}
console.log('FUSHI totem: hands, lethal hit, deferral, single debit, native priority, bypass and failure (mocked)');
