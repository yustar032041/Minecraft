import assert from 'node:assert/strict';
import {GameMode} from '@minecraft/server';
import {setupAirDash} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_air_dash.js';
import {setupCombatRoll} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_roll.js';
let input=0,impulses=0,moves=0;
const d={id:'r',isChunkLoaded:()=>true,getBlock:()=>({isAir:true}),getBlockFromRay:({x,z})=>({block:{location:{x:Math.floor(x),y:79,z:Math.floor(z)}},face:'Up',faceLocation:{y:1}}),spawnParticle:()=>{}};
const p={id:'p',typeId:'minecraft:player',isValid:true,isOnGround:true,isSneaking:false,isSwimming:false,isFlying:false,isGliding:false,dimension:d,location:{x:.5,y:80,z:.5},getGameMode:()=>GameMode.Survival,getComponent:()=>undefined,getVelocity:()=>({x:0,y:-.2,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),inputPermissions:{isPermissionCategoryEnabled:()=>true},inputInfo:{getMovementVector:()=>({x:0,y:input})},applyImpulse:()=>impulses++,clearVelocity:()=>{},tryTeleport(pos){moves++;this.location={...pos};return true;},playAnimation:()=>{},playSound:()=>{}};
const s={s:50},roll=setupCombatRoll({notice:()=>{}}),dash=setupAirDash({notice:()=>{}});
function frame(t){roll.tick(p,s,t);dash.tick(p,s,t);}
frame(0);p.isOnGround=false;p.isSneaking=true;input=1;frame(1);input=0;frame(2);input=1;frame(3);
assert.equal(s.s,50);assert.equal(moves,0);assert.equal(impulses,0);assert.equal(roll.evading(p,3),false,'airborne crouch gesture is not a roll');
p.isSneaking=false;input=0;frame(4);input=1;frame(5);input=0;frame(6);input=1;frame(7);
assert.equal(impulses,1);assert.equal(s.s,35);assert.equal(roll.evading(p,7),false,'air dash costs only its own stamina and gives no roll evasion');
p.isOnGround=true;p.isSneaking=true;input=0;frame(8);input=1;frame(9);input=0;frame(10);input=1;frame(11);
assert.equal(moves,1);assert.equal(s.s,25);assert.equal(roll.evading(p,11),true,'fresh grounded gesture works after air dash');
console.log('Ground roll and air dash: gesture, costs and evasion separation (mocked)');
