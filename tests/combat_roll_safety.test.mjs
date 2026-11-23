import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {setupCombatRoll} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_roll.js';
import {GameMode} from '@minecraft/server';
// Use the real ground/headroom validator from main, with simulated blocks.
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const floorCode=source.slice(source.indexOf('function safeFloor('),source.indexOf('function campfireNearby('));
const safeCode=source.slice(source.indexOf('function safe(d,l){'),source.indexOf('function safeNear('));
const context={LiquidType:{Water:'water'}};vm.createContext(context);vm.runInContext(floorCode+'\n'+safeCode,context);
const solid={typeId:'minecraft:stone',isAir:false,isLiquid:false,isLiquidBlocking:()=>true},air={typeId:'minecraft:air',isAir:true},blocks=new Map();
const dim={id:'realm',isChunkLoaded:()=>true,getBlock:({x,y,z})=>blocks.get(`${x},${y},${z}`)??(y===79?solid:air),spawnParticle:()=>{}};
let y=0;const s={s:30},impulses=[];
const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:true,isOnGround:true,dimension:dim,location:{x:.5,y:80,z:.5},getComponent:()=>undefined,getGameMode:()=>GameMode.Survival,inputPermissions:{isPermissionCategoryEnabled:()=>true},inputInfo:{getMovementVector:()=>({x:0,y})},getVelocity:()=>({x:0,z:0}),getViewDirection:()=>({x:1,z:0}),applyImpulse:v=>impulses.push(v),playSound:()=>{},playAnimation:()=>{}};
function attempt(t){const c=setupCombatRoll({notice:()=>{},safe:context.safe});y=1;c.tick(p,s,t);y=0;c.tick(p,s,t+1);y=1;c.tick(p,s,t+2);return c;}
blocks.set('2,80,0',solid);let c=attempt(0);assert.equal(impulses.length,0,'blocked headroom cancels');assert.equal(s.s,30);assert.equal(c.evading(p,2),false);
blocks.clear();blocks.set('2,79,0',air);c=attempt(10);assert.equal(impulses.length,0,'no roll toward an unprotected drop');
blocks.clear();c=attempt(20);assert.equal(impulses.length,1);assert.equal(s.s,20);assert.equal(c.evading(p,22),true);
console.log('Roll ground/headroom preflight through actual safe() OK (mocked blocks)');
