import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {caveInterval} from '../Hakkai_v7.1.0/BehaviorPack/scripts/terrain_features.js';
import {seedFunctions} from './seed_terrain_helpers.mjs';
import {setupAirDash} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_air_dash.js';
import {EntityDamageCause as Cause} from '@minecraft/server';
const {hash}=seedFunctions('731');let oldCount=0,newCount=0,maxHeight=0,minFloor=999,openings=0;
for(let x=-256;x<256;x+=2)for(let z=-256;z<256;z+=2){
 const old=caveInterval(5,x,z,76,58,hash),now=caveInterval(5,x,z,76,0,hash);
 if(old)oldCount++;if(now){newCount++;minFloor=Math.min(minFloor,now.lower);maxHeight=Math.max(maxHeight,now.upper-now.lower+1);if(now.upper===76)openings++;assert.ok(now.lower>0&&now.upper<=76);}
 const near=caveInterval(5,x+1,z,76,0,hash);if(now&&near)assert.ok(Math.abs(now.lower-near.lower)<=1,'deep cave walkable slope');
}
assert.ok(newCount>oldCount*1.5,`${oldCount} ${newCount}`);assert.ok(maxHeight>=20);assert.ok(minFloor<40);assert.ok(openings>0);
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
assert.ok(source.includes("p.dimension.id===ns+'realm_5'?-52:40"),'deep realm rescue threshold');
const terrain=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/seeded_worlds.js','utf8');assert.ok(terrain.includes('sectorMin=realm===5?-48:MIN_Y'));assert.ok(terrain.includes('if(d.containsBlock(column'));assert.ok(terrain.includes('playersNear(d,{x:x+.5,y:at.y,z:z+.5},4)'));
// Real pre-damage subscription with a real dash controller, including
// both engine orders (fall event before and after the ground tick).
for(const groundFirst of [false,true]){
 let input=0,handler;const d={id:'r',isChunkLoaded:()=>true,spawnParticle:()=>{}},p={id:'p',typeId:'minecraft:player',isValid:true,isOnGround:true,isSneaking:false,dimension:d,location:{x:0,y:90,z:0},getComponent:()=>undefined,getGameMode:()=> 'survival',getVelocity:()=>({x:1,y:-1,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),inputPermissions:{isPermissionCategoryEnabled:()=>true},inputInfo:{getMovementVector:()=>({x:0,y:input})},applyImpulse:()=>{},playAnimation:()=>{},playSound:()=>{}};
 const s={s:50},airDash=setupAirDash({notice:()=>{}});airDash.tick(p,s,0);p.isOnGround=false;airDash.tick(p,s,1);input=1;airDash.tick(p,s,2);input=0;airDash.tick(p,s,3);input=1;airDash.tick(p,s,4);assert.equal(s.s,35);
 const system={currentTick:5},ctx={safeSub:(_,__,___,fn)=>handler=fn,airDash,EntityDamageCause:Cause,system,combatRoll:undefined,combatUltimate:undefined,fushiTotem:undefined,customShield:{blocks:()=>false},combatParry:undefined,isCreative:()=>false,armorItems:()=>[],gear:new Map(),selected:()=>undefined,state:()=>s,num:()=>0,_melee:/$^/};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf("safeSub('world','before','entityHurt'"),source.indexOf('const _melee=')),ctx);
 if(groundFirst){p.isOnGround=true;airDash.tick(p,s,5);}const fall={hurtEntity:p,damageSource:{cause:Cause.fall},cancel:false};handler(fall);assert.equal(fall.cancel,true);const next={...fall,cancel:false};handler(next);assert.equal(next.cancel,false,'only the landing damage is blocked');
}
console.log(`Deep cavern ${oldCount}->${newCount} cells, ${maxHeight} high, floor ${minFloor}; dash landing event orders (mocked)`);
