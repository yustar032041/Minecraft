// Real controllers with mocked Script API. Does not prove live engine timing,
// rendering, disconnect races, multiplayer or encounter balance.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameMode,Difficulty,EntityDamageCause} from '@minecraft/server';
import {setupRealmEnders} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
import {setupFushiSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';
import {setupGuardianBoss} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_boss.js';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
function fixture(type){
 const messages=[],hits=[],reports=[];let entities=[],players=[];
 const d={id:'r',getEntities:()=>entities,getPlayers:()=>players,spawnParticle:()=>{},isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),getBlockFromRay:()=>undefined};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:1,y:80,z:0},getGameMode:()=>GameMode.Survival,
  sendMessage:m=>messages.push(m),applyDamage:n=>{hits.push(n);return true},addEffect:()=>{},applyImpulse:()=>{}};
 const mob={id:'good',typeId:type,isValid:true,dimension:d,location:{x:0,y:80,z:0},playAnimation:()=>{},getComponent:()=>({effectiveMax:1000,currentValue:1000})};
 players=[p];const world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>players};
 const queue=[];const system={currentTick:0,runTimeout:(fn,delay)=>queue.push({at:system.currentTick+delay,fn})};
 const runUntil=t=>{while(system.currentTick<t){system.currentTick++;while(queue.some(q=>q.at===system.currentTick)){const i=queue.findIndex(q=>q.at===system.currentTick);queue.splice(i,1)[0].fn();}}};
 return {d,p,mob,world,system,runUntil,messages,hits,reports,report:(...x)=>reports.push(x),setEntities:v=>entities=v,setPlayers:v=>players=v};
}
test('FUSHI family scan isolates a bad entity from a warned chief',()=>{
 const f=fixture('hakkai:fushi_chief'),c=setupFushiSystem(f);c.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});
 f.setEntities([{get typeId(){throw Error('unloaded')}},f.mob]);c.tick(f.p,20);
 assert.equal(f.messages.length,0);assert.ok(f.mob.isValid);
});
test('FUSHI fast chief scan isolates a stale id from later chiefs',()=>{
 const f=fixture('hakkai:fushi_chief'),c=setupFushiSystem(f);c.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p}});
 f.setEntities([{get id(){throw Error('unloaded')}},f.mob]);c.tickChiefs(f.p,20);
 assert.equal(f.messages.length,0);assert.ok(f.mob.isValid);
});
test('realm traveler scan isolates an invalid creature and still resolves a warned attack',()=>{
 const f=fixture('hakkai:ender_0'),c=setupRealmEnders({...f,safe:()=>false});
 c.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p,cause:EntityDamageCause.entityAttack}});
 f.setEntities([{get id(){throw Error('unloaded')}},f.mob]);c.tick(f.p,20);c.tick(f.p,60);
 assert.equal(f.messages.length,0);assert.equal(f.hits.length,0); // scheduler is a no-op
});
test('guardian scan isolates one stale guardian and resolves a source-centred attack',()=>{
 const f=fixture('hakkai:guardian_0'),c=setupGuardianBoss(f);
 f.setEntities([{get isValid(){throw Error('unloaded')}},f.mob]);
 for(const t of [0,30,70]){f.system.currentTick=t;c.tick(f.p,t);}
 f.runUntil(73);assert.equal(f.messages.length,0);assert.equal(f.hits.length,1);
});
test('one invalid player cannot prevent another player from being hit',()=>{
 const f=fixture('hakkai:guardian_0'),c=setupGuardianBoss(f);f.setEntities([f.mob]);
 const broken={id:'broken',typeId:'minecraft:player',isValid:true,dimension:f.d,location:{x:1,y:80,z:0},
  getGameMode:()=>GameMode.Survival,sendMessage:()=>{},applyDamage:()=>{throw Error('not expected')}};
 c.tick(f.p,0);f.setPlayers([{get isValid(){throw Error('unavailable')}},broken,f.p]);f.system.currentTick=30;c.tick(f.p,30);
 assert.equal(f.messages.length,0,'no floor-warning notification');
 Object.defineProperty(broken,'location',{get(){throw Error('disconnected')}});f.setPlayers([broken,f.p]);f.system.currentTick=70;c.tick(f.p,70);
 f.runUntil(73);assert.equal(f.hits.length,1,'disconnected target cannot block another attack target');
});
test('fast king scan isolates one stale boss from a later valid one',()=>{
 const f=fixture('hakkai:eclipse_colossus'),c=setupMobSystem({...f,ns:'hakkai:',num:()=>0,property:()=>{}});
 f.setEntities([{get id(){throw Error('unloaded')}},f.mob]);
 for(const t of [0,100,140]){f.system.currentTick=t;c.tickBosses(f.p,t);}
 assert.ok(f.messages.some(m=>m.includes('八界断ち')));assert.ok(f.hits.length>0);
});
test('stale online-player references do not hide the recorded chief or traveler target',()=>{
 for(const type of ['hakkai:fushi_chief','hakkai:ender_0']){
  const f=fixture(type),c=type.endsWith('chief')?setupFushiSystem(f):setupRealmEnders({...f,safe:()=>false});
  c.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p,cause:EntityDamageCause.entityAttack}});
  f.setEntities([f.mob]);f.setPlayers([{get id(){throw Error('disconnected')}},f.p]);c.tick(f.p,20);
  assert.equal(f.messages.length,0,type);assert.ok(f.mob.isValid);
 }
});
test('unavailable player list never silently retargets an attack',()=>{
 const f=fixture('hakkai:ender_0'),c=setupRealmEnders({...f,safe:()=>false});
 c.onHurt({hurtEntity:f.mob,damageSource:{damagingEntity:f.p,cause:EntityDamageCause.entityAttack}});f.setEntities([f.mob]);
 f.world.getAllPlayers=()=>{throw Error('unavailable')};c.tick(f.p,20);c.tick(f.p,60);
 assert.equal(f.messages.length,0);assert.equal(f.hits.length,0);
});
test('ordinary body attack skips a stale online reference before the target',()=>{
 const f=fixture('hakkai:foe_0_0'),c=setupMobSystem({...f,ns:'hakkai:',num:()=>0,property:()=>{}});f.p.location.x=.7;
 f.setEntities([f.mob]);for(const t of [0,120]){f.system.currentTick=t;c.tick(f.p,t);}
 assert.equal(f.messages.length,0);
 f.setPlayers([{get id(){throw Error('disconnected')}},f.p]);f.system.currentTick=160;c.tick(f.p,160);
 assert.equal(f.hits.length,1);
});
test('burst fallback and hit loops skip invalid players while hitting present targets',()=>{
 const f=fixture('hakkai:foe_0_10'),c=setupMobSystem({...f,ns:'hakkai:',num:()=>0,property:()=>{}});
 const hits=[];const q={id:'q',typeId:'minecraft:player',isValid:true,dimension:f.d,location:{x:2,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:()=>{},applyDamage:n=>{hits.push(n);return true},addEffect:()=>{},applyImpulse:()=>{}};
 f.setEntities([f.mob]);f.setPlayers([f.p,q]);for(const t of [0,120]){f.system.currentTick=t;c.tick(f.p,t);}
 assert.equal(f.messages.length,0);
 const stale={get id(){throw Error('gone')}};f.setPlayers([stale,q]);f.system.currentTick=160;c.tick(q,160);
 f.runUntil(165);assert.equal(hits.length,1,'present second player still receives the attack');assert.equal(f.hits.length,0);
});
test('king skips stale references when selecting target and resolving a warned area',()=>{
 const f=fixture('hakkai:eclipse_colossus'),c=setupMobSystem({...f,ns:'hakkai:',num:()=>0,property:()=>{}});f.setEntities([f.mob]);
 const broken={id:'bad',typeId:'minecraft:player',isValid:true,dimension:f.d,location:{x:2,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:()=>{},applyDamage:()=>true};
 f.system.currentTick=0;c.tickBosses(f.p,0);
 // Target selection ignores the bad location without rejecting the valid player.
 Object.defineProperty(broken,'location',{configurable:true,get(){throw Error('stale')}});
 f.setPlayers([broken,f.p]);f.system.currentTick=100;c.tickBosses(f.p,100);
 assert.ok(f.messages.some(m=>m.includes('八界断ち')));
 f.setPlayers([{get id(){throw Error('stale id')},get isValid(){throw Error('gone')}},broken,f.p]);
 f.system.currentTick=140;c.tickBosses(f.p,140);assert.equal(f.hits.length,1);
});
test('king damage callback disconnecting a victim does not hide another warned victim',()=>{
 const f=fixture('hakkai:eclipse_colossus'),c=setupMobSystem({...f,ns:'hakkai:',num:()=>0,property:()=>{}});f.setEntities([f.mob]);
 const hit=[];const q={id:'q',typeId:'minecraft:player',isValid:true,dimension:f.d,location:{x:2,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:()=>{},applyDamage:n=>{hit.push(n);return true},addEffect:()=>{},applyImpulse:()=>{}};
 f.p.applyDamage=()=>{Object.defineProperty(f.p,'location',{get(){throw Error('disconnected after hit')}});return true};
 f.setPlayers([f.p,q]);for(const t of [0,100]){f.system.currentTick=t;c.tickBosses(f.p,t);}
 f.system.currentTick=140;c.tickBosses(q,140);assert.equal(hit.length,1);
});
test('a missing global player list does not cause an unnotified single-target hit',()=>{
 const f=fixture('hakkai:foe_0_0'),c=setupMobSystem({...f,ns:'hakkai:',num:()=>0,property:()=>{}});f.setEntities([f.mob]);
 for(const t of [0,120]){f.system.currentTick=t;c.tick(f.p,t);}
 f.world.getAllPlayers=()=>{throw Error('unavailable')};f.system.currentTick=160;c.tick(f.p,160);
 assert.equal(f.messages.length,0);assert.equal(f.hits.length,0);
});
