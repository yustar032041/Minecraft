// Cross-dimension cancellation against mocked APIs. This cannot prove Bedrock
// event ordering, particle visibility or cross-dimension teleport behaviour.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {setupRealmEnders} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
import {setupFushiSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';

function fixture(type){
 let now=0;const notices=[],hits=[],effects=[],selfEffects=[],heals=[],impulses=[],animations=[],summons=[],scheduled=[];
 let mob,p;
 function dimension(id){return {id,
  getEntities:query=>query.families?((query.families.includes('hakkai_guardian')&&type.startsWith('hakkai:guardian_'))||(query.families.includes('hakkai_realm_ender')&&type.startsWith('hakkai:ender_'))||(query.families.includes('hakkai_fushi')&&type==='hakkai:fushi_chief')||(query.families.includes('hakkai_wildlife')&&mobContentList.some(profile=>'hakkai:'+profile.id===type))?[mob]:[]):query.type&&query.type!==type?[]:[mob],
  getPlayers:()=>[p],spawnEntity:(...args)=>summons.push(args),spawnParticle:()=>{}};}
 const a=dimension('a'),b=dimension('b');
 p={id:'p',typeId:'minecraft:player',isValid:true,dimension:a,location:{x:2,y:80,z:0},getGameMode:()=>GameMode.Survival,
  sendMessage:msg=>notices.push([now,msg]),applyDamage:n=>{hits.push(n);return true},addEffect:(...x)=>effects.push(x),applyImpulse:()=>impulses.push('player')};
 mob={id:'mob',typeId:type,isValid:true,dimension:a,location:{x:0,y:80,z:0},playAnimation:id=>animations.push([now,id]),addEffect:(...x)=>selfEffects.push(x),applyImpulse:()=>impulses.push('mob'),
  getComponent:()=>({currentValue:20,effectiveMax:100,setCurrentValue:n=>heals.push(n)})};
 const system={currentTick:0,runTimeout:fn=>{scheduled.push(fn);throw Error('scheduler intentionally unavailable');}},world={getDifficulty:()=>Difficulty.Normal,getAllPlayers:()=>[p]};
 let ctrl;
 if(type==='hakkai:fushi_chief')ctrl=setupFushiSystem({world,system,report:()=>{}});
 else if(type.startsWith('hakkai:ender_'))ctrl=setupRealmEnders({world,system,report:()=>{}});
 else ctrl=setupMobSystem({ns:'hakkai:',world,system,report:()=>{},num:()=>0,property:()=>{},allowKingMelee:()=>false});
 if(type==='hakkai:fushi_chief'||type.startsWith('hakkai:ender_'))ctrl.onHurt({hurtEntity:mob,damageSource:{damagingEntity:p}});
 const tick=t=>{now=system.currentTick=t;if(type.startsWith('hakkai:guardian_'))ctrl.tickBosses(p,t);else ctrl.tick(p,t);};
 const move=()=>{p.dimension=b;mob.dimension=b;};
 const clear=()=>{hits.length=effects.length=selfEffects.length=heals.length=impulses.length=animations.length=summons.length=scheduled.length=0;};
 return {p,mob,a,b,tick,move,clear,notices,hits,effects,selfEffects,heals,impulses,animations,summons,scheduled};
}
function assertCanceled(f,label){
 assert.deepEqual(f.hits,[],label);assert.deepEqual(f.effects,[],label);assert.deepEqual(f.selfEffects,[],label);assert.deepEqual(f.heals,[],label);assert.deepEqual(f.impulses,[],label);assert.deepEqual(f.summons,[],label);assert.deepEqual(f.scheduled,[],label);
 assert.ok(!f.animations.some(([,id])=>id.endsWith('_strike')),label+' must not play strike');
}
for(let realm=0;realm<8;realm++)test(`traveler ${realm}: warning does not follow both combatants to another dimension`,()=>{
 const f=fixture(`hakkai:ender_${realm}`);f.tick(0);f.tick(20);assert.equal(f.notices.length,0);f.clear();f.move();f.tick(60);assertCanceled(f,'traveler');
});
for(let index=0;index<3;index++)test(`chief attack ${index}: moving both combatants cancels the warning before launch`,()=>{
 const f=fixture('hakkai:fushi_chief');for(let i=0;i<index;i++){f.tick(20+80*i);f.tick(60+80*i);}
 const start=20+80*index;f.tick(start);assert.equal(f.notices.length,0);f.clear();f.move();f.tick(start+40);assertCanceled(f,'chief');
});
for(let realm=0;realm<8;realm++)for(let index=0;index<3;index++)test(`guardian ${realm}/${index}: no strike in another dimension`,()=>{
 const f=fixture(`hakkai:guardian_${realm}`);f.tick(0);for(let i=0;i<index;i++){f.tick(30+i*80);f.tick(70+i*80);}
 const start=30+index*80;f.tick(start);assert.equal(f.notices.length,0);f.clear();f.move();f.tick(start+40);assertCanceled(f,'guardian');
});
for(const profile of mobContentList.filter(x=>x.temper==='hostile'))test(`${profile.id}: no warned talent in another dimension`,()=>{
 const f=fixture(`hakkai:${profile.id}`);f.tick(0);f.tick(120);
 assert.equal(f.notices.length,0);
 f.clear();f.move();f.tick(160);assertCanceled(f,profile.id);
});
for(let index=0;index<10;index++)test(`king technique ${index}: no damage, status or minions in another dimension`,()=>{
 const f=fixture('hakkai:eclipse_colossus');const start=100+index*70;for(let t=0;t<start;t+=10)f.tick(t);
 const before=f.notices.length;f.tick(start);assert.equal(f.notices.length,before+(index===9?0:1));f.clear();f.move();f.tick(start+40);assertCanceled(f,'king');
});
