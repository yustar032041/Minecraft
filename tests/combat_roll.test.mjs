import assert from 'node:assert/strict';
import {setupCombatRoll} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_roll.js';
import {EntityDamageCause as Cause,GameMode} from '@minecraft/server';
function fixture(){
 const impulses=[],animations=[],particles=[],notes=[],checks=[];
 let input={x:0,y:0};
 const d={id:'realm',isChunkLoaded:()=>true,spawnParticle:(...args)=>particles.push(args)};
 const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:true,isSwimming:false,isGliding:false,isFlying:false,isOnGround:true,
  dimension:d,location:{x:0.5,y:80,z:0.5},getGameMode:()=>GameMode.Survival,getComponent:()=>undefined,
  inputPermissions:{isPermissionCategoryEnabled:()=>true},inputInfo:{getMovementVector:()=>input},getViewDirection:()=>({x:1,y:.9,z:0}),getVelocity:()=>({x:0,y:0,z:0}),
  applyImpulse:v=>impulses.push(v),playAnimation:(...v)=>animations.push(v),playSound:()=>{}};
 const s={s:50,busy:false,menu:false},ctrl=setupCombatRoll({notice:(...v)=>notes.push(v),safe:(dim,pos)=>{checks.push(pos);return true;}});
 return {p,s,d,ctrl,impulses,animations,particles,notes,checks,set:(x,y)=>input={x,y}};
}
function tap(f,t){f.set(0,1);f.ctrl.tick(f.p,f.s,t);f.set(0,0);f.ctrl.tick(f.p,f.s,t+1);f.set(0,1);f.ctrl.tick(f.p,f.s,t+2);}
{
 const f=fixture();tap(f,10);
 assert.equal(f.s.s,40);assert.deepEqual(f.impulses,[{x:.38,y:0,z:0}]);assert.equal(f.checks.length,21);
 assert.equal(f.animations[0][0],'animation.hakkai.dodge_roll');assert.equal(f.particles.length,8);
 for(const cause of [Cause.entityAttack,Cause.projectile,Cause.entityExplosion,Cause.magic,Cause.sonicBoom])assert.equal(f.ctrl.blocks(f.p,{cause},12),true);
 assert.equal(f.ctrl.blocks(f.p,{cause:Cause.fall},12),false,'environment remains dangerous');
 assert.equal(f.ctrl.blocks(f.p,{cause:Cause.entityAttack},21),true);
 assert.equal(f.ctrl.blocks(f.p,{cause:Cause.entityAttack},22),false,'no free immunity at expiration');
 f.ctrl.tick(f.p,f.s,13);f.ctrl.tick(f.p,f.s,30);assert.equal(f.impulses.length,1,'held input cannot repeat');
 tap(f,31);assert.equal(f.impulses.length,1,'cooldown blocks repeated rolls');
 tap(f,40);assert.equal(f.impulses.length,2);
}
{
 const f=fixture();f.set(0,1);f.ctrl.tick(f.p,f.s,0);f.set(0,0);f.ctrl.tick(f.p,f.s,1);f.set(0,1);f.ctrl.tick(f.p,f.s,10);
 assert.equal(f.impulses.length,0,'double tap window expires');
}
for(const prepare of [f=>f.s.s=9,f=>f.d.isChunkLoaded=()=>false,f=>f.p.applyImpulse=()=>{throw Error()},f=>f.p.getVelocity=()=>({x:1,z:0}),f=>f.p.getViewDirection=()=>({x:0,z:0})]){
 const f=fixture();prepare(f);const before=f.s.s;tap(f,0);assert.equal(f.s.s,before);assert.equal(f.ctrl.evading(f.p,2),false,'unsafe roll grants no immunity');
}
for(const prepare of [f=>f.p.isSneaking=false,f=>f.p.isSwimming=true,f=>f.p.isGliding=true,f=>f.p.isFlying=true,f=>f.p.isOnGround=false,f=>f.p.getComponent=()=>({}),f=>f.p.getGameMode=()=>GameMode.Spectator,f=>f.s.menu=true,f=>f.s.busy=true,f=>f.p.inputInfo.getMovementVector=()=>{throw Error()},f=>f.p.inputPermissions.isPermissionCategoryEnabled=()=>false,f=>f.p.inputPermissions.isPermissionCategoryEnabled=()=>{throw Error()}]){
 const f=fixture();prepare(f);tap(f,0);assert.equal(f.impulses.length,0);assert.equal(f.s.s,50);
}
{
 const f=fixture();f.set(.9,1);f.ctrl.tick(f.p,f.s,0);f.set(0,0);f.ctrl.tick(f.p,f.s,1);f.set(.9,1);f.ctrl.tick(f.p,f.s,2);assert.equal(f.impulses.length,0,'diagonal strafe does not trigger');
}
{
 const f=fixture();tap(f,0);const other={...f.p,id:'other'};assert.equal(f.ctrl.evading(other,2),false);
 f.p.dimension={...f.d,id:'another'};assert.equal(f.ctrl.evading(f.p,3),false,'old dimension cannot retain immunity');
 f.ctrl.clear(f.p.id);assert.equal(f.ctrl.evading(f.p,3),false);
}
{
 const f=fixture(),ctrl=setupCombatRoll({notice:()=>{},safe:()=>false});f.set(0,1);ctrl.tick(f.p,f.s,0);f.set(0,0);ctrl.tick(f.p,f.s,1);f.set(0,1);ctrl.tick(f.p,f.s,2);
 assert.equal(f.impulses.length,0,'ledge or blocked path cancels');assert.equal(f.s.s,50);
}
{
 const f=fixture();f.p.getGameMode=()=>GameMode.Creative;f.s.s=0;tap(f,0);
 assert.equal(f.impulses.length,1,'creative can preview roll');assert.equal(f.s.s,0);assert.equal(f.ctrl.evading(f.p,2),true);
}
console.log('Roll: double tap, safety, stamina, attack-only immunity, expiration, modes and isolation OK (mocked)');
