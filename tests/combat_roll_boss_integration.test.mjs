import assert from 'node:assert/strict';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {GameMode} from '@minecraft/server';
const events=[];
const p=(id)=>({id,typeId:'minecraft:player',isValid:true,location:{x:2,y:80,z:0},getGameMode:()=>GameMode.Survival,sendMessage:()=>{},applyDamage:()=>{events.push(id+':damage');return true;},applyImpulse:()=>events.push(id+':push'),addEffect:()=>events.push(id+':effect')});
const rolling=p('rolling'),other=p('other');
const boss={id:'boss',typeId:'hakkai:eclipse_colossus',isValid:true,location:{x:0,y:80,z:0},getComponent:()=>({currentValue:5000,effectiveMax:5000})};
const d={id:'hakkai:realm_7',getEntities:()=>[boss],getPlayers:()=>[rolling,other],spawnParticle:()=>{}};rolling.dimension=other.dimension=boss.dimension=d;
const system={currentTick:0},world={getDifficulty:()=> 'normal',getAllPlayers:()=>[rolling,other]};
const ctrl=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:()=>assert.fail(),isEvading:p=>p.id==='rolling'});
for(const t of [0,95,135]){system.currentTick=t;ctrl.tick(rolling,t);}
assert.deepEqual(events,['other:damage','other:push','other:effect'],'only rolling player avoids all scripted attack parts');
// A release parry intercepts only its recipient in the same shared attack.
events.length=0;const parryCalls=[];
const boss2={...boss,id:'boss2'},d2={...d,getEntities:()=>[boss2]};boss2.dimension=d2;rolling.dimension=other.dimension=d2;
const parryCtrl=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:()=>assert.fail(),tryParry:(player,source)=>{parryCalls.push([player.id,source.id]);return player.id==='rolling';}});
for(const t of [0,95,135]){system.currentTick=t;parryCtrl.tick(rolling,t);}
assert.deepEqual(events,['other:damage','other:push','other:effect']);assert.deepEqual(parryCalls,[['rolling','boss2'],['other','boss2']]);
// A stagger cancels an already warned scripted boss attack without moving it.
events.length=0;const boss3={...boss,id:'boss3'},d3={...d,getEntities:()=>[boss3]};boss3.dimension=d3;rolling.dimension=other.dimension=d3;
const staggerCtrl=setupMobSystem({ns:'hakkai:',world,system,num:()=>0,property:()=>{},report:()=>assert.fail()});
for(const t of [0,95]){system.currentTick=t;staggerCtrl.tick(rolling,t);}staggerCtrl.stagger(boss3,100);
system.currentTick=135;staggerCtrl.tick(rolling,121);assert.deepEqual(events,[]);
console.log('Roll and eclipse boss: per-player scripted damage, debuff and push immunity OK (mocked)');
