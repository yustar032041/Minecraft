import {test} from 'node:test';import assert from 'node:assert/strict';
import {linkFinisher} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_link_finish.js';
import {setupWeaponTrace} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_trace.js';
const g={id:'gear_008',kind:'剣',damage:6,rank:1},style={linked:true,stage:3};
function world(){
 const hits=[],effects=[],jobs=[],d={id:'d',isChunkLoaded:()=>true,getEntitiesFromRay:()=>[],spawnParticle(){}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,selectedSlotIndex:0,location:{x:0,y:0,z:0},getHeadLocation:()=>({x:0,y:1,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),getGameMode:()=> 'survival',inputInfo:{getMovementVector:()=>({x:0,y:1})},playAnimation(){},playSound(){}};
 const e={id:'z',typeId:'minecraft:zombie',isValid:true,dimension:d,location:{x:2,y:0,z:0},getHeadLocation:()=>({x:2,y:1,z:0}),getComponent:()=>({hasTypeFamily:()=>true}),getEffect:()=>undefined,addEffect:(...args)=>effects.push(args),applyDamage:n=>(hits.push(n),true)};d.getEntities=()=>[e];
 const system={currentTick:0,runTimeout:f=>jobs.push(f)},c=setupWeaponTrace({system,gear:new Map([['hakkai:gear_008',g]]),selected:()=>({typeId:'hakkai:gear_008'}),state:()=>({s:50}),visibleFrom:()=>true});
 return {p,e,d,c,system,hits,effects,jobs,swing(t){system.currentTick=t;assert.equal(c.swing({player:p,heldItemStack:{typeId:'hakkai:gear_008'},swingSource:'Attack'}),true);jobs.shift()();}};
}
test('third rhythmic sweep triggers a short finisher, then chain restarts',()=>{
 const f=world();f.swing(0);f.swing(8);assert.equal(f.effects.length,0);f.swing(16);assert.deepEqual(f.hits,[6,16,18]);assert.equal(f.effects.length,1);assert.equal(f.effects[0][0],'weakness');f.swing(24);assert.equal(f.hits[3],6);assert.equal(f.effects.length,1);
});
test('a confirmed direct third hit gets the finisher once without a second damage instance',()=>{
 for(const order of ['hit-first','hurt-first']){
  const f=world(),event={player:f.p,heldItemStack:{typeId:'hakkai:gear_008'},swingSource:'Attack'};
  for(const tick of [0,8,16]){
   f.system.currentTick=tick;assert.equal(f.c.swing(event),true);
   if(order==='hit-first'){f.c.record(f.p,f.e);f.c.record(f.p,f.e,6);}else{f.c.record(f.p,f.e,6);f.c.record(f.p,f.e);}
   f.c.record(f.p,f.e,6);f.jobs.shift()();
  }
  assert.deepEqual(f.hits,[],'no scripted duplicate damage on direct target');assert.equal(f.effects.length,1,order);assert.equal(f.effects[0][0],'weakness');
 }
});
test('early native damage and spending a skill link do not erase the third-swing finisher',()=>{
 const f=world();f.swing(0);f.swing(8);const event={player:f.p,heldItemStack:{typeId:'hakkai:gear_008'},swingSource:'Attack'};
 f.system.currentTick=15;f.c.record(f.p,f.e,6);assert.equal(f.effects.length,0,'prior swing was only stage two');
 f.system.currentTick=16;assert.equal(f.c.swing(event),true);assert.deepEqual(f.c.takeLink(f.p,g,16),{direction:'forward',stage:3});
 f.jobs.shift()();assert.equal(f.effects.length,1,'confirmed direct hit was rechecked');assert.equal(f.hits.length,2,'no trace damage added to native hit');
});
test('failed damage, bosses, protected/non-hostile targets and stronger effects do not get overwritten',()=>{
 const f=world();assert.equal(linkFinisher(f.p,f.e,g,style,false),false);
 for(const id of ['hakkai:time_warden','hakkai:king_guardian_2','minecraft:wither']){f.e.typeId=id;assert.equal(linkFinisher(f.p,f.e,g,style,true),false);}
 f.e.typeId='minecraft:zombie';f.e.getEffect=()=>({amplifier:1,duration:500});assert.equal(linkFinisher(f.p,f.e,g,style,true),false);assert.equal(f.effects.length,0);
 f.e.getEffect=()=>undefined;f.e.getComponent=()=>({hasTypeFamily:()=>false});assert.equal(linkFinisher(f.p,f.e,g,style,true),false);assert.equal(f.effects.length,0);
});
