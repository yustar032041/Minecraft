// Actual cast extracted from main, with mock Bedrock state and imported hooks.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {WARDEN_BLADES,wardenBladeOnCast,wardenBladeOnHit} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_blades.js';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const code=source.slice(source.indexOf('function cast(p,g,charged=false){'),source.indexOf('function castElement('));
test('each actual cast spends resources and invokes its blade effect on accepted hit',()=>{
 for(const g of WARDEN_BLADES){
  const own=[],enemy=[];const d={id:'test',spawnParticle(){}};const p={id:'p',isValid:true,dimension:d,location:{x:0,y:0,z:0},getViewDirection:()=>({x:1,y:0,z:0}),addEffect:id=>own.push(id),playAnimation(){},playSound(){}};
  const e={id:'z',isValid:true,typeId:'minecraft:zombie',dimension:d,location:{x:2,y:0,z:0},getHeadLocation:()=>({x:2,y:1,z:0}),addEffect:id=>enemy.push(id)};
  const s={m:100,s:100,cd:new Map()};const ctx={wardenBladeOnCast,wardenBladeOnHit,system:{currentTick:100,runTimeout(){}},state:()=>s,notice(){},isCreative:()=>false,combatResonance:undefined,num:()=>0,property(){},currentPlace:()=>undefined,world:{getTimeOfDay:()=>0},home:[],aspect:()=>0,enemies:()=>[e],visibleFrom:()=>true,hit:()=>true,combatEffectAllowed:()=>true,effects:Array(20).fill('speed'),ns:'hakkai:',dist:()=>0,along(){}};
  vm.createContext(ctx);vm.runInContext(code,ctx);ctx.cast(p,g);assert.equal(s.m,84);assert.equal(s.s,95);assert.equal(s.cd.get(g.id),340);assert.ok(own.length>=2,g.id);
  if([1,2,3,5,7].includes(g.wardenBlade))assert.equal(enemy.length,1,g.id);
 }
});
