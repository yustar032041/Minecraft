import assert from 'node:assert/strict';
import {setupAirDash} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_air_dash.js';
import {setupCombatRoll} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_roll.js';
import {GameMode} from '@minecraft/server';
function fixture(){
 let mv={x:0,y:0};const impulses=[],notices=[],particles=[],animations=[],checks=[];
 const d={id:'realm',isChunkLoaded:()=>true,getBlock:pos=>{checks.push(pos);return {isAir:true};},spawnParticle:(...v)=>particles.push(v)};
 const p={id:'p',typeId:'minecraft:player',isValid:true,isOnGround:true,isSneaking:false,isSwimming:false,isGliding:false,isFlying:false,dimension:d,location:{x:.5,y:80,z:.5},getGameMode:()=>GameMode.Survival,getComponent:()=>undefined,inputPermissions:{isPermissionCategoryEnabled:()=>true},inputInfo:{getMovementVector:()=>mv},getVelocity:()=>({x:0,y:-.2,z:0}),getViewDirection:()=>({x:2,y:-.5,z:0}),applyImpulse:x=>impulses.push(x),playAnimation:(...x)=>animations.push(x),playSound:()=>{}};
 const s={s:50,menu:false,busy:false},ctrl=setupAirDash({notice:(...args)=>notices.push(args)});
 const set=(x,y)=>mv={x,y};return {p,s,d,ctrl,set,impulses,notices,particles,animations,checks};
}
function arm(f,t=0){f.p.isOnGround=true;f.ctrl.tick(f.p,f.s,t);f.p.isOnGround=false;f.set(0,0);f.ctrl.tick(f.p,f.s,t+1);}
function tap(f,t=2){f.set(0,1);f.ctrl.tick(f.p,f.s,t);f.set(0,0);f.ctrl.tick(f.p,f.s,t+1);f.set(0,1);f.ctrl.tick(f.p,f.s,t+2);}
{
 const f=fixture();arm(f);tap(f);assert.equal(f.s.s,35);assert.deepEqual(f.impulses,[{x:1.50,y:0,z:0}]);assert.equal(f.checks.length,0);
 assert.equal(f.animations[0][0],'animation.hakkai.air_dash');assert.equal(f.particles.length,10);assert.ok(f.ctrl.status(f.p).includes('着地'));
 tap(f,8);assert.equal(f.impulses.length,1,'once per airtime');assert.equal(f.s.s,35);
 arm(f,20);assert.equal(f.ctrl.status({...f.p,isOnGround:true}),'');tap(f,22);assert.equal(f.impulses.length,2);assert.equal(f.s.s,20);
}
{
 const f=fixture();f.ctrl.tick(f.p,f.s,0);f.p.isOnGround=false;f.set(0,1);f.ctrl.tick(f.p,f.s,1);
 f.set(0,0);f.ctrl.tick(f.p,f.s,2);f.set(0,1);f.ctrl.tick(f.p,f.s,3);assert.equal(f.impulses.length,0,'held input on takeoff is not first tap');
 f.set(0,0);f.ctrl.tick(f.p,f.s,4);f.set(0,1);f.ctrl.tick(f.p,f.s,5);assert.equal(f.impulses.length,1);
}
{
 const f=fixture();f.p.isOnGround=false;f.ctrl.tick(f.p,f.s,0);f.set(0,0);f.ctrl.tick(f.p,f.s,1);tap(f,2);
 assert.equal(f.impulses.length,0,'joining while airborne requires landing first');
}
{
 const f=fixture();arm(f);f.set(0,1);f.ctrl.tick(f.p,f.s,2);f.set(0,0);f.ctrl.tick(f.p,f.s,3);f.set(0,1);f.ctrl.tick(f.p,f.s,12);assert.equal(f.impulses.length,0,'late second tap starts a new sequence');
}
for(const change of [f=>f.s.s=14,f=>f.d.isChunkLoaded=()=>false,f=>f.p.applyImpulse=()=>{throw Error('rejected')},f=>f.p.getViewDirection=()=>({x:0,z:0})]){
 const f=fixture();arm(f);change(f);const before=f.s.s;tap(f);assert.equal(f.s.s,before);assert.equal(f.impulses.length,0,'failed dash never consumes');
}
for(const change of [f=>f.p.isSneaking=true,f=>f.p.isSwimming=true,f=>f.p.isGliding=true,f=>f.p.isFlying=true,f=>f.p.getComponent=()=>({}),f=>f.p.getGameMode=()=>GameMode.Spectator,f=>f.s.menu=true,f=>f.s.busy=true,f=>f.p.inputPermissions.isPermissionCategoryEnabled=()=>false,f=>f.p.inputInfo.getMovementVector=()=>{throw Error()}]){
 const f=fixture();arm(f);change(f);tap(f);assert.equal(f.impulses.length,0);assert.equal(f.s.s,50);
}
{
 const f=fixture();arm(f);const other={...f.p,id:'q'};tap(f);assert.equal(f.ctrl.status(other),'','separate player state');
 f.p.dimension={...f.d,id:'elsewhere'};f.ctrl.tick(f.p,f.s,7);assert.equal(f.ctrl.status(f.p),'');f.ctrl.clear('p');
}
{
 const f=fixture(),second=fixture();second.p.id='q';const shared=setupAirDash({notice:()=>{}});f.ctrl=shared;second.ctrl=shared;
 arm(f);arm(second);tap(f);tap(second);assert.equal(f.impulses.length,1);assert.equal(second.impulses.length,1);assert.equal(f.s.s,35);assert.equal(second.s.s,35);
 f.ctrl.clear(f.p.id);tap(second,10);assert.equal(second.impulses.length,1,'one player leaving does not reset another player');
}
{
 // Air dash and roll share neither activation nor invulnerability.
 const f=fixture();arm(f);const roll=setupCombatRoll({notice:()=>{},safe:()=>true});tap(f);roll.tick(f.p,f.s,4);
 assert.equal(roll.evading(f.p,4),false);assert.equal(f.impulses.length,1);
}
{
 const f=fixture();f.p.getGameMode=()=>GameMode.Creative;f.s.s=0;arm(f);tap(f);
 assert.equal(f.impulses.length,1,'creative can preview air dash');assert.equal(f.s.s,0);
}
console.log('Air dash: gesture, rearming, safe path, costs, permissions, isolation and roll separation OK (mocked)');
