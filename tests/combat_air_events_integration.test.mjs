import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {setupAirStrike} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_air_strike.js';
import {EntityDamageCause as Cause} from '@minecraft/server';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const hurt=src.slice(src.indexOf("safeSub('world','after','entityHurt'"),src.indexOf("safeSub('world','after','playerDimensionChange'"));
// Only the after-hurt handler, ending at its own subscription close.
const end=hurt.indexOf("\n});");assert.ok(end>0);
const hit=src.slice(src.indexOf("safeSub('world','after','entityHitEntity'"),src.indexOf("safeSub('world','after','playerSpawn'"));
for(const order of ['hurt-first','hit-first']){
 const handlers={},hits=[],dimension={id:'r',getEntities:()=>[],spawnParticle:()=>{}};
 const p={id:'p',typeId:'minecraft:player',isValid:true,isOnGround:true,isSneaking:false,dimension,location:{x:0,y:0,z:0},getGameMode:()=> 'survival',getComponent:()=>undefined,getVelocity:()=>({y:-.2}),playAnimation:()=>{},playSound:()=>{}};
 const e={id:'z',typeId:'minecraft:zombie',isValid:true,dimension,location:{x:1,y:0,z:0},getComponent:()=>({hasTypeFamily:()=>true}),getHeadLocation:()=>({x:1,y:1,z:0}),applyDamage:n=>hits.push(n),applyKnockback:()=>{},addEffect:()=>{}};
 const s={s:50,cd:new Map()},g={kind:'剣',a:0},system={currentTick:5},airStrike=setupAirStrike({notice:()=>{},visibleFrom:()=>true});airStrike.tick(p,4);p.isOnGround=false;
 const context={safeSub:(_,__,name,fn)=>handlers[name]=fn,airStrike,combatResonance:{onHurt:()=>{}},mobSystem:undefined,realmEnders:undefined,fushiSystem:undefined,system,EntityDamageCause:Cause,gear:new Map([['hakkai:g',g]]),selected:()=>({typeId:'hakkai:g'}),state:()=>s,isCreative:()=>false,wardenBoss:undefined,report:(...x)=>assert.fail(String(x)),_melee:/_sword$/,ns:'hakkai:',permit:()=>false};
 vm.createContext(context);vm.runInContext(hurt.slice(0,end+4),context);vm.runInContext(hit,context);
 const a=()=>handlers.entityHurt({hurtEntity:e,damage:7,damageSource:{cause:Cause.entityAttack,damagingEntity:p}}),b=()=>handlers.entityHitEntity({damagingEntity:p,hitEntity:e});
 if(order==='hurt-first'){a();b();}else{b();a();}
 assert.equal(s.s,38,order);assert.deepEqual(hits,[4]);
}
console.log('Actual melee and hurt event wiring: both event orders and total cost (mocked)');
