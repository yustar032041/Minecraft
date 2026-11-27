import {protectsPlayer} from '../Hakkai_v7.1.0/BehaviorPack/scripts/friendly_fire.js';
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const hurt=src.slice(src.indexOf("safeSub('world','after','entityHurt'"));const hit=src.slice(src.indexOf("safeSub('world','after','entityHitEntity'"),src.indexOf("safeSub('world','after','playerSpawn'"));
for(const order of ['hurt-first','hit-first']){
 let records=[],air=0,casts=0;const handlers={},s={s:30,useTick:0,cd:new Map()},g={kind:'剣',id:'gear_001',damage:6};
 const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:true,getGameMode:()=> 'survival'};const e={id:'z',typeId:'minecraft:zombie',isValid:true};
 const c={protectsPlayer,guardianMultiplayer:{record:()=>{}},bossMultiplayer:{record:()=>{}},safeSub:(_,__,name,fn)=>handlers[name]=fn,weaponTrace:{enabled:()=>true,record:(...v)=>records.push(v)},isTraceWeapon:()=>true,airStrike:{onHurt:()=>air++,chargeMelee:()=>true},combatResonance:{onHurt:()=>{}},mobSystem:undefined,realmEnders:undefined,fushiSystem:undefined,EntityDamageCause:{entityAttack:'attack',projectile:'projectile'},GameMode:{Spectator:'spectator',Survival:'survival'},system:{currentTick:100},gear:new Map([['hakkai:gear_001',g]]),selected:()=>({typeId:'hakkai:gear_001'}),state:()=>s,isCreative:()=>false,wardenBoss:undefined,report:(...v)=>assert.fail(String(v)),_melee:/_sword$/,ns:'hakkai:',cast:()=>casts++,permit:()=>false};
 vm.createContext(c);vm.runInContext(hurt.slice(0,hurt.indexOf('\n});')+4),c);vm.runInContext(hit,c);
 const a=()=>handlers.entityHurt({hurtEntity:e,damageSource:{cause:'attack',damagingEntity:p},damage:6}),b=()=>handlers.entityHitEntity({damagingEntity:p,hitEntity:e});
 if(order==='hurt-first'){a();b();}else{b();a();}
 assert.equal(records.length,2,order);assert.equal(air,0,'no additional airstrike');assert.equal(casts,0,'no automatic skill overlap');
}
assert.ok(src.includes('signal.subscribe(e=>{weaponTrace?.swing(e);vanillaSwingMotion(e,selected,state);})'));assert.ok(src.includes('weaponTrace?.clear(playerId)'));
console.log('Actual trace, native attack and skill integration: both event orders (mocked)');
