import assert from 'node:assert/strict';
import {setupCombatResonance,combatEnemies,isCombatTarget,applyCombatHit} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_resonance.js';
import {GameMode} from '@minecraft/server';
const gear={id:'gear_002',kind:'剣'},axe={id:'gear_003',kind:'斧'},staff={id:'gear_004',kind:'杖'};
function fixture(){
 const particles=[],animations=[],notices=[],sounds=[];
 const dimension={id:'hakkai:realm_0',spawnParticle:(...args)=>particles.push(args)};
 const player={id:'a',typeId:'minecraft:player',isValid:true,isSneaking:false,selectedSlotIndex:0,dimension,location:{x:0,y:80,z:0},getGameMode:()=>GameMode.Survival,playAnimation:(...x)=>animations.push(x),playSound:(...x)=>sounds.push(x)};
 const target={id:'mob',typeId:'minecraft:zombie',isValid:true,dimension,location:{x:2,y:80,z:0},getComponent:()=>({hasTypeFamily:t=>t==='monster'})};
 const system={currentTick:0},ctrl=setupCombatResonance({system,notice:(...x)=>notices.push(x)});
 return {particles,animations,notices,sounds,player,target,system,ctrl};
}
{
 const f=fixture(),{ctrl,player:p,target:e,system:t}=f;
 assert.equal(ctrl.onHurt(p,e,gear,4),1);assert.equal(f.particles.length,11);assert.equal(f.animations.length,1);
 t.currentTick=5;assert.equal(ctrl.onHurt(p,e,gear,4),1,'rapid duplicate events do not accumulate');
 t.currentTick=8;assert.equal(ctrl.onHurt(p,e,gear,4),2);t.currentTick=16;assert.equal(ctrl.onHurt(p,e,gear,4),3);
 assert.equal(f.notices.length,1);assert.equal(ctrl.level(p,gear),3);
 assert.equal(ctrl.consume(p,gear),true);assert.equal(ctrl.consume(p,gear),false);assert.equal(ctrl.level(p,gear),0);
 assert.ok(f.particles.every(([id])=>id==='hakkai:wind_trace'));
}
{
 const f=fixture(),{ctrl,player:p,target:e,system:t}=f;
 ctrl.onHurt(p,e,gear,4);t.currentTick=81;assert.equal(ctrl.level(p,gear),0,'partial expires');
 ctrl.onHurt(p,e,gear,4);t.currentTick=89;ctrl.onHurt(p,e,gear,4);t.currentTick=97;ctrl.onHurt(p,e,gear,4);
 t.currentTick=217;assert.equal(ctrl.level(p,gear),3);t.currentTick=218;assert.equal(ctrl.consume(p,gear),false,'full expires');
}
for(const [change,selectedGear] of [[p=>p.selectedSlotIndex++,gear],[p=>p.dimension={id:'hakkai:realm_1'},gear],[()=>{},axe]]){
 const f=fixture();f.ctrl.onHurt(f.player,f.target,gear,1);change(f.player);
 assert.equal(f.ctrl.level(f.player,selectedGear),0,'weapon, slot or dimension change invalidates');
}
{
 const f=fixture(),{ctrl,player:p,target:e,system:t}=f;
 ctrl.onHurt(p,e,gear,2);const other={...p,id:'b'};t.currentTick=8;ctrl.onHurt(other,e,gear,2);
 assert.equal(ctrl.level(p,gear),1);assert.equal(ctrl.level(other,gear),1);ctrl.clear(p.id);assert.equal(ctrl.level(other,gear),1);
}
{
 const f=fixture(),{ctrl,player:p,target:e}=f;
 assert.equal(ctrl.onHurt(p,e,staff,2),0);assert.equal(ctrl.onHurt(p,e,gear,0),0);
 p.isSneaking=true;assert.equal(ctrl.onHurt(p,e,gear,2),0);p.isSneaking=false;
 p.getGameMode=()=>GameMode.Creative;assert.equal(ctrl.onHurt(p,e,gear,2),1);assert.equal(f.animations.length,1,'creative hit previews the attack animation');
 p.getGameMode=()=>GameMode.Spectator;assert.equal(ctrl.onHurt(p,e,gear,2),0);
 p.getGameMode=()=>GameMode.Survival;
 for(const typeId of ['minecraft:player','minecraft:villager','hakkai:fushi']){
  const harmless={...e,typeId,getComponent:()=>({hasTypeFamily:()=>false})};assert.equal(ctrl.onHurt(p,harmless,gear,2),0);
 }
 assert.ok(isCombatTarget({...e,typeId:'hakkai:time_warden'}));
 assert.ok(isCombatTarget({...e,typeId:'hakkai:fushi_chief'}));
 assert.ok(isCombatTarget({...e,typeId:'hakkai:ender_7'}));
}
{
 const f=fixture(),e={...f.target,typeId:'hakkai:time_warden'},damage=[];
 e.setOnFire=()=>{throw Error('immune')};e.applyKnockback=()=>{throw Error('resistant')};e.addEffect=()=>{throw Error('immune')};e.applyDamage=(n,source)=>damage.push({n,source});
 applyCombatHit(f.player,e,12,2,7,1);assert.equal(damage[0].n,12);assert.equal(damage[0].source.damagingEntity,f.player);
}
{
 const f=fixture(),{ctrl,player:p,target:e,system:t}=f;
 ctrl.onHurt(p,e,gear,1);assert.equal(ctrl.consumeCombo(p,gear),false);
 t.currentTick=8;ctrl.onHurt(p,e,gear,1);assert.equal(ctrl.consume(p,gear),false);
 assert.equal(ctrl.consumeCombo(p,gear),true);assert.equal(ctrl.level(p,gear),0);
 t.currentTick=20;ctrl.onHurt(p,e,gear,1);t.currentTick=28;ctrl.onHurt(p,e,gear,1);
 t.currentTick=36;ctrl.onHurt(p,e,gear,1);assert.equal(ctrl.consumeCombo(p,gear),false,'three marks are reserved for full resonance');
 assert.equal(ctrl.consume(p,gear),true);
}
// Anchored bosses must never receive script-driven knockback, while optional
// effect failures on ordinary enemies must not prevent damage.
for(const id of ['hakkai:time_warden','hakkai:eclipse_colossus','hakkai:fushi_chief','hakkai:guardian_0']){
 const f=fixture(),e={...f.target,typeId:id},calls=[];
 e.applyKnockback=()=>calls.push('knockback');e.applyDamage=()=>calls.push('damage');
 applyCombatHit(f.player,e,5,0,0,1);assert.deepEqual(calls,['damage']);
}
{
 const f=fixture(),e={...f.target},calls=[];
 e.applyKnockback=()=>{throw Error('immune')};e.applyDamage=()=>calls.push('damage');e.setOnFire=()=>{throw Error('immune')};
 applyCombatHit(f.player,e,5,2,0,1);assert.deepEqual(calls,['damage']);
}
{
 const f=fixture(),p=f.player,warden={...f.target,id:'warden',typeId:'hakkai:time_warden',location:{x:1,y:80,z:0}};
 const neutral={...f.target,id:'neutral',typeId:'hakkai:fushi_chief'};
 f.player.dimension.getEntities=q=>q.type?[warden]:[f.target,warden];
 const got=combatEnemies(p,8,6);assert.deepEqual(got.map(x=>x.id),['warden','mob']);assert.ok(!got.includes(neutral));
 f.player.dimension.getEntities=q=>q.type?(()=>{throw Error('not loaded')})():[f.target];assert.equal(combatEnemies(p,8,6).length,1);
}
console.log('Combat prototype: confirmed hits, timing, expiry, isolation, friendly exclusion, trial target and immune knockback OK (mocked)');
