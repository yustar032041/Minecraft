// All 97 equipped weapon profiles use the actual skill cast and shared hit.
// Mock damage results are not proof of Bedrock PvP/immunity or balance.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {ULTIMATE_WEAPONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_weapons.js';
import {isTraceWeapon} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_trace.js';
import {applyCombatHit,combatEffectAllowed} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_resonance.js';
const weapons=[...catalog,...ULTIMATE_WEAPONS].filter(isTraceWeapon);assert.equal(weapons.length,97);
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),code=src.slice(src.indexOf('function cast(p,g,charged=false){'),src.indexOf('function castElement('));assert.ok(code.startsWith('function cast('));
function fixture(outcome){
 const calls=[],targetEffects=[],system={currentTick:100,runTimeout:()=>{}},s={m:1000,s:1000,cd:new Map()};
 const d={id:'hakkai:realm_0',spawnParticle:()=>{},getPlayers:()=>[]};
 const p={id:'p',typeId:'minecraft:player',isValid:true,dimension:d,location:{x:0,y:0,z:0},getViewDirection:()=>({x:1,y:0,z:0}),addEffect:()=>{},playAnimation:()=>{},playSound:()=>{}};
 const e={id:'z',typeId:'minecraft:zombie',isValid:true,dimension:d,location:{x:2,y:0,z:0},getHeadLocation:()=>({x:2,y:1,z:0}),applyDamage:n=>{calls.push(n);if(outcome==='throw')throw Error('refused');return outcome},addEffect:(...x)=>targetEffects.push(['effect',...x]),setOnFire:(...x)=>targetEffects.push(['fire',...x]),applyKnockback:(...x)=>targetEffects.push(['push',...x])};
 const ctx={system,state:()=>s,isCreative:()=>false,combatResonance:undefined,notice:()=>{},num:()=>0,property:()=>{},home:[],aspect:()=>0,currentPlace:()=>undefined,world:{getTimeOfDay:()=>6000},enemies:()=>[e],visibleFrom:()=>true,hit:applyCombatHit,combatEffectAllowed,effects:Array(20).fill('speed'),ns:'hakkai:',dist:()=>0,along:()=>{}};
 vm.createContext(ctx);vm.runInContext(code,ctx);return {ctx,p,e,s,calls,targetEffects};
}
for(const g of weapons){
 test(`${g.id}: resisted skill has no hit-dependent enemy effects`,()=>{
  for(const outcome of [false,'throw']){const f=fixture(outcome);f.ctx.cast(f.p,g);assert.equal(f.calls.length,1);assert.deepEqual(f.targetEffects,[]);assert.ok(f.s.m<1000&&f.s.s<1000,'miss is still a paid cast');}
 });
 test(`${g.id}: accepted skill keeps its knockback and hammer slow`,()=>{
  const f=fixture(true);f.ctx.cast(f.p,g);assert.equal(f.calls.length,1);assert.ok(f.targetEffects.some(x=>x[0]==='push'));
  if(g.kind==='ハンマー')assert.ok(f.targetEffects.some(x=>x[0]==='effect'&&x[1]==='slowness'&&x[2]===35));
 });
}
