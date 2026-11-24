import assert from 'node:assert/strict';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {ULTIMATE_WEAPONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_weapons.js';
import {isTraceWeapon,setupWeaponTrace} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_trace.js';
import {setupAirStrike} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_air_strike.js';
import {setupCombatUltimate} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_ultimate.js';
import {setupBowTrail} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_bow_trail.js';
const weapons=[...catalog,...ULTIMATE_WEAPONS].filter(isTraceWeapon);assert.equal(weapons.length,97);
const mkPlayer=(d)=>({id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:0,y:0,z:0},selectedSlotIndex:0,isOnGround:true,isSneaking:false,getVelocity:()=>({x:0,y:-.2,z:0}),getGameMode:()=> 'survival',getComponent:()=>undefined,getHeadLocation:()=>({x:0,y:1,z:0}),getViewDirection:()=>({x:1,y:0,z:0}),playAnimation:()=>{},playSound:()=>{}});
const enemy=(d,id,x,type='minecraft:zombie')=>({id,typeId:type,isValid:true,dimension:d,location:{x,y:0,z:0},getHeadLocation:()=>({x,y:1,z:0}),getComponent:()=>({hasTypeFamily:()=>type==='minecraft:zombie'}),applyDamage:()=>{},applyKnockback:()=>{},addEffect:()=>{},setOnFire:()=>{}});
for(const g of weapons){
 const d={id:'d',spawnParticle:()=>{}},p=mkPlayer(d),s={s:50},air=setupAirStrike({notice:()=>{},visibleFrom:()=>true});
 air.tick(p,1);p.isOnGround=false;assert.equal(air.beginSwing(p,s,g,2),true,g.id);assert.equal(s.s,41);assert.equal(air.beginSwing(p,s,g,3),false,'once in air');
 p.isOnGround=true;air.tick(p,4);p.isOnGround=false;assert.equal(air.beginSwing(p,s,g,5),true,'landing resets');
}
for(const change of [p=>p.isSneaking=true,p=>p.isSwimming=true,p=>p.isFlying=true,p=>p.getVelocity=()=>({y:.1}),p=>p.getComponent=()=>({})]){
 const d={id:'d'},p=mkPlayer(d),s={s:50},air=setupAirStrike({notice:()=>{},visibleFrom:()=>true});air.tick(p,1);p.isOnGround=false;change(p);assert.equal(air.beginSwing(p,s,weapons[0],2),false);assert.equal(s.s,50);
}
for(const g of weapons){
 const hits=[],particles=[],d={id:'d',spawnParticle:(id)=>particles.push(id),isChunkLoaded:()=>true,getEntitiesFromRay:()=>[]},p=mkPlayer(d),s={s:20,m:20},system={currentTick:1};
 const z=enemy(d,'z',2);z.applyDamage=n=>hits.push(n);d.getEntities=()=>[z];
 const ctrl=setupCombatUltimate({system,notice:()=>{},visibleFrom:()=>true});assert.equal(ctrl.cast(p,s,g),true,g.id);assert.deepEqual(hits,[20],g.id);assert.equal(s.s,0);assert.equal(s.m,10);assert.ok(particles.includes(`hakkai:${g.visualId??g.id}`));assert.equal(ctrl.cast(p,{s:20,m:20},g),false,'cooldown');
}
// The new weapon cost has no upper resource threshold; insufficient
// resources never pay for a failed ultimate.
for(const [stamina,mana,ok] of [[100,100,true],[19,100,false],[20,9,false]]){
 const d={id:'d',spawnParticle:()=>{},isChunkLoaded:()=>true,getEntitiesFromRay:()=>[]},p=mkPlayer(d),s={s:stamina,m:mana},g=weapons[0],z=enemy(d,'z',2),system={currentTick:1};d.getEntities=()=>[z];
 const ctrl=setupCombatUltimate({system,notice:()=>{},visibleFrom:()=>true});assert.equal(ctrl.cast(p,s,g),ok);
 if(ok){assert.equal(s.s,80);assert.equal(s.m,90);}else{assert.equal(s.s,stamina);assert.equal(s.m,mana);}
}
// Weapon ultimates do not consume stamina when a friend or unloaded path blocks the target.
for(const obstacle of ['friend','unloaded','wall','outside']){
 const hits=[],d={id:'d',spawnParticle:()=>{},isChunkLoaded:()=>obstacle!=='unloaded'},p=mkPlayer(d),g=weapons.find(g=>g.kind==='槍'),s={s:20,m:20},system={currentTick:1};
 const z=enemy(d,'z',obstacle==='outside'?-2:4);z.applyDamage=n=>hits.push(n);const cow=enemy(d,'cow',2,'minecraft:cow');d.getEntities=()=>[z,cow];d.getEntitiesFromRay=()=>obstacle==='friend'?[{entity:cow,distance:2}]:[];
 const ctrl=setupCombatUltimate({system,notice:()=>{},visibleFrom:()=>obstacle!=='wall'});assert.equal(ctrl.cast(p,s,g),false,obstacle);assert.equal(s.s,20);assert.equal(hits.length,0);
}
// A player joining in midair must land before aerial attacks can arm.
{
 const d={id:'d'},p=mkPlayer(d),s={s:50},air=setupAirStrike({notice:()=>{},visibleFrom:()=>true});p.isOnGround=false;assert.equal(air.beginSwing(p,s,weapons[0],1),false);assert.equal(s.s,50);
}
// Real stepping of a 16-block staff shot: collision with wall, friend, target,
// cancellation and native melee events; the only damage is on the first hit.
function staffFixture(){
 const g=weapons.find(g=>g.kind==='杖'),jobs=[],hits=[],particles=[];let at=0,block=false,friend=false,loaded=true;
 const system={currentTick:100,runTimeout:(fn,n)=>jobs.push(fn)};
 const d={id:'d',spawnParticle:(id,pos)=>particles.push([id,pos]),isChunkLoaded:()=>loaded,getBlockFromRay:()=>block?{block:{location:{x:at+1,y:1,z:0}},faceLocation:{x:0,y:0,z:0}}:undefined,getEntitiesFromRay:(pos)=>{at=pos.x;if(friend&&pos.x>=4)return [{entity:enemy(d,'cow',5,'minecraft:cow'),distance:1}];if(pos.x>=10)return [{entity:target,distance:1}];return [];},getEntities:()=>[]};
 const target=enemy(d,'z',11);target.applyDamage=n=>hits.push(n);const p=mkPlayer(d),s={s:50};let selectedId='hakkai:'+g.id;
 const ctrl=setupWeaponTrace({system,gear:new Map([[selectedId,g]]),selected:()=>({typeId:selectedId}),state:()=>s,visibleFrom:()=>true,report:(...x)=>assert.fail(String(x))});
 return {g,ctrl,p,target,s,hits,particles,jobs,swing:()=>ctrl.swing({player:p,heldItemStack:{typeId:selectedId},swingSource:'Attack'}),step:()=>jobs.shift()?.(),setBlock:v=>block=v,setFriend:v=>friend=v,setLoaded:v=>loaded=v};
}
{
 const f=staffFixture();f.swing();f.step();assert.equal(f.hits.length,0,'not instant');while(f.jobs.length)f.step();assert.deepEqual(f.hits,[f.g.damage]);assert.ok(f.particles.some(([id,pos])=>id==='hakkai:wind_trace'&&pos.x>8));
}
for(const stop of [f=>f.setBlock(true),f=>f.setFriend(true),f=>f.setLoaded(false),f=>f.ctrl.clear(f.p.id)]){const f=staffFixture();f.swing();stop(f);while(f.jobs.length)f.step();assert.equal(f.hits.length,0);}
{
 const f=staffFixture();f.swing();f.ctrl.record(f.p,f.target);while(f.jobs.length)f.step();assert.equal(f.hits.length,0,'native hit consumes staff shot');
}
// Arrow observer produces cosmetic trails only, and invokes air eligibility.
{
 const jobs=[],particles=[],system={currentTick:1,runTimeout:fn=>jobs.push(fn)},d={id:'d',spawnParticle:id=>particles.push(id)},p=mkPlayer(d),g=weapons.find(g=>g.kind==='弓');let calls=0,damage=0;
 const arrow={typeId:'minecraft:arrow',isValid:true,dimension:d,location:{x:1,y:1,z:0},getVelocity:()=>({x:1,y:0,z:0}),getComponent:()=>({owner:p}),applyDamage:()=>damage++};
 const trail=setupBowTrail({system,gear:new Map([['hakkai:'+g.id,g]]),selected:()=>({typeId:'hakkai:'+g.id}),state:()=>({s:30}),airAttack:()=>calls++});
 trail.spawned(arrow);jobs.shift()();assert.equal(calls,1);assert.ok(particles.includes('hakkai:wind_trace'));assert.equal(damage,0);arrow.isValid=false;jobs.shift()();assert.equal(jobs.length,0);
}
console.log('97 aerial attacks and weapon ultimates, flying staff, native bow trails (mocked)');
