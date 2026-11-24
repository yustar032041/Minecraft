import assert from 'node:assert/strict';
import {setupCombatRoll} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_roll.js';
import {EntityDamageCause as Cause,GameMode} from '@minecraft/server';
function fixture(){
 const moves=[],animations=[],particles=[],notes=[],checks=[];let input={x:0,y:0};
 const d={id:'realm',isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),spawnParticle:(...v)=>particles.push(v)};
 const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:true,isSwimming:false,isGliding:false,isFlying:false,isOnGround:true,
  dimension:d,location:{x:.5,y:80,z:.5},getGameMode:()=>GameMode.Survival,getComponent:()=>undefined,
  inputPermissions:{isPermissionCategoryEnabled:()=>true},inputInfo:{getMovementVector:()=>input},getViewDirection:()=>({x:1,y:.9,z:0}),
  clearVelocity:()=>{},tryTeleport(pos,opts){assert.equal(opts.checkForBlocks,true);moves.push({...pos});this.location={...pos};return true;},
  playAnimation:(...v)=>animations.push(v),playSound:()=>{}};
 const s={s:50,busy:false,menu:false},ctrl=setupCombatRoll({notice:(...v)=>notes.push(v),safe:(dim,pos)=>{checks.push(pos);return true;}});
 return {p,s,d,ctrl,moves,animations,particles,notes,checks,set:(x,y)=>input={x,y}};
}
function tap(f,t){f.set(0,1);f.ctrl.tick(f.p,f.s,t);f.set(0,0);f.ctrl.tick(f.p,f.s,t+1);f.set(0,1);f.ctrl.tick(f.p,f.s,t+2);}
{
 const f=fixture();tap(f,10);assert.equal(f.s.s,40);assert.ok(Math.abs(f.p.location.x-2.9)<1e-8);
 assert.equal(f.animations[0][0],'animation.hakkai.dodge_roll');assert.equal(f.particles.length,8);
 for(const cause of [Cause.entityAttack,Cause.projectile,Cause.entityExplosion,Cause.magic,Cause.sonicBoom])assert.equal(f.ctrl.blocks(f.p,{cause},12),true);
 assert.equal(f.ctrl.blocks(f.p,{cause:Cause.fall},12),false);assert.equal(f.ctrl.blocks(f.p,{cause:Cause.entityAttack},22),false);
 for(let t=13;t<=21;t++)f.ctrl.tick(f.p,f.s,t);
 assert.ok(Math.abs(f.p.location.x-24.5)<1e-8,'24 checked blocks on clear ground');
 f.ctrl.tick(f.p,f.s,22);assert.equal(f.moves.length,10,'held input never repeats');
}
{
 const f=fixture();tap(f,0);f.set(0,0);f.ctrl.tick(f.p,f.s,3);tap(f,4);assert.equal(f.s.s,30,'no cooldown: second double tap consumes stamina');assert.equal(f.animations.length,2);
}
{
 const f=fixture();f.set(0,1);f.ctrl.tick(f.p,f.s,0);f.set(0,0);f.ctrl.tick(f.p,f.s,1);f.set(0,1);f.ctrl.tick(f.p,f.s,10);
 assert.equal(f.moves.length,0,'double tap window expires');
}
for(const prepare of [f=>f.s.s=9,f=>f.d.isChunkLoaded=()=>false,f=>f.p.tryTeleport=()=>false,f=>f.p.clearVelocity=()=>{throw Error()},f=>f.p.getViewDirection=()=>({x:0,z:0})]){
 const f=fixture();prepare(f);const before=f.s.s;tap(f,0);assert.equal(f.s.s,before);assert.equal(f.ctrl.evading(f.p,2),false,'failed roll grants no immunity');
}
for(const prepare of [f=>f.p.isSneaking=false,f=>f.p.isSwimming=true,f=>f.p.isGliding=true,f=>f.p.isFlying=true,f=>f.p.getComponent=()=>({}),f=>f.p.getGameMode=()=>GameMode.Spectator,f=>f.s.menu=true,f=>f.s.busy=true,f=>f.p.inputInfo.getMovementVector=()=>{throw Error()},f=>f.p.inputPermissions.isPermissionCategoryEnabled=()=>false]){
 const f=fixture();prepare(f);tap(f,0);assert.equal(f.moves.length,0);assert.equal(f.s.s,50);
}
{
 const f=fixture();tap(f,0);const other={...f.p,id:'other'};assert.equal(f.ctrl.evading(other,2),false);f.p.dimension={...f.d,id:'another'};assert.equal(f.ctrl.evading(f.p,3),false);f.ctrl.clear(f.p.id);
}
{
 const f=fixture();f.p.getGameMode=()=>GameMode.Creative;f.s.s=0;tap(f,0);assert.equal(f.moves.length,1);assert.equal(f.s.s,0);assert.equal(f.ctrl.evading(f.p,2),true);
}
console.log('Roll: checked 24-block target, no cooldown, stamina, attack immunity and invalid contexts (mocked)');
