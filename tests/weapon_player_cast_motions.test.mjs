// Actual cast function in a VM; verifies the script's dispatch, not rendering.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {ULTIMATE_WEAPONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_weapons.js';
import {WARDEN_BLADES,wardenBladeOnCast,wardenBladeOnHit} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_blades.js';
import {isTraceWeapon} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_trace.js';
import {playWeaponMotion,weaponMotionId} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_weapon_motion.js';
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const code=src.slice(src.indexOf('function cast(p,g,charged=false){'),src.indexOf('function castElement('));
test('actual cast dispatches each of 105 normal and charged weapon animations only after payment',()=>{
 for(const g of [...catalog,...ULTIMATE_WEAPONS,...WARDEN_BLADES].filter(isTraceWeapon)){
  const ids=[],d={id:'d',spawnParticle(){}},p={isValid:true,dimension:d,location:{x:0,y:0,z:0},getViewDirection:()=>({x:1,y:0,z:0}),addEffect(){},playAnimation:id=>ids.push(id),playSound(){}};
  const s={m:0,s:100,cd:new Map()};const ctx={wardenBladeOnCast,wardenBladeOnHit,playWeaponMotion,system:{currentTick:1,runTimeout(){}},state:()=>s,notice(){},isCreative:()=>false,combatResonance:undefined,num:()=>0,property(){},currentPlace:()=>undefined,world:{getTimeOfDay:()=>0},home:[],aspect:()=>0,enemies:()=>[],visibleFrom:()=>true,hit:()=>true,combatEffectAllowed:()=>true,effects:Array(20).fill('speed'),ns:'hakkai:',dist:()=>0,along(){}};
  vm.createContext(ctx);vm.runInContext(code,ctx);ctx.cast(p,g);assert.deepEqual(ids,[],g.id);
  s.m=100;ctx.cast(p,g);const normal=Number.isInteger(g.wardenBlade)?`animation.hakkai.warden_blade_skill_${g.wardenBlade}`:`animation.hakkai.cast.${g.visualId??g.id}`;assert.equal(ids.at(-1),normal,g.id);
  s.cd.clear();s.m=100;s.s=100;ctx.cast(p,g,true);assert.equal(ids.at(-1),weaponMotionId(g,'charged'),g.id);
 }
});
