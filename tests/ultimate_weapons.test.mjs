import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
import {GameMode} from '@minecraft/server';
import {ULTIMATE_WEAPONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_weapons.js';
import {setupCombatCharge} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_charge.js';
import {setupCombatResonance} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_resonance.js';
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
assert.ok(main.includes('[...catalog,...ULTIMATE_WEAPONS,...WARDEN_BLADES].map'));
assert.ok(main.includes('const g=gear.get(id);if(g){'));assert.ok(main.includes('cast(p,g);'));assert.ok(main.includes('combatUltimate?.cast(p,s,g)'));
const code=main.slice(main.indexOf('function cast(p,g,charged=false){'),main.indexOf('function castElement('));
const system={currentTick:0,runTimeout:()=>{},run:()=>{}};const particles=[],damage=[],animations=[],notices=[],s={m:100,s:100,cd:new Map(),useTick:-100};
const dimension={id:'realm',spawnParticle:(id)=>particles.push(id)};
const p={id:'p',typeId:'minecraft:player',isValid:true,isSneaking:false,selectedSlotIndex:0,dimension,location:{x:0,y:80,z:0},getGameMode:()=>GameMode.Survival,getViewDirection:()=>({x:1,y:0,z:0}),playAnimation:id=>animations.push(id),playSound:()=>{},addEffect:()=>{}};
const enemy={id:'z',typeId:'minecraft:zombie',isValid:true,dimension,location:{x:2,y:80,z:0},getHeadLocation:()=>({x:2,y:81,z:0}),getComponent:()=>({hasTypeFamily:x=>x==='monster'})};
const notice=(_,text)=>notices.push(text),combatResonance=setupCombatResonance({system,notice});
const ctx={system,combatResonance,notice,prepareWindRay:()=>undefined,renderWindRay:()=>{},state:()=>s,isCreative:()=>false,num:()=>0,property:()=>{},home:[],aspect:()=>0,currentPlace:()=>undefined,world:{getTimeOfDay:()=>6000},enemies:()=>[enemy],visibleFrom:()=>true,hit:(...v)=>damage.push(v),effects:Array(20).fill('speed'),ns:'hakkai:',dist:()=>0,along:()=>{}};
vm.createContext(ctx);vm.runInContext(code,ctx);
const gear=new Map(ULTIMATE_WEAPONS.map(g=>['hakkai:'+g.id,g]));let held;
for(const g of ULTIMATE_WEAPONS){const item=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/items/${g.id}.json`))['minecraft:item'];assert.equal(item.components['minecraft:damage'],g.damage);}
const charge=setupCombatCharge({system,gear,selected:()=>({typeId:held}),state:()=>s,cast:(p,g,c)=>ctx.cast(p,g,c)});
for(const [i,g] of ULTIMATE_WEAPONS.entries()){
 held='hakkai:'+g.id;system.currentTick=i*500+100;s.s=100;s.m=100;s.cd.clear();s.useTick=-100;p.isSneaking=false;
 let before=damage.length;ctx.cast(p,g);assert.equal(damage.length,before+1,`${g.id} normal skill hit`);assert.equal(s.m,100-g.cost);assert.equal(s.s,95);assert.equal(s.cd.get(g.id),system.currentTick+g.seconds*20);assert.ok(particles.includes('hakkai:'+g.visualId));assert.ok(animations.includes('animation.hakkai.cast.'+g.visualId));
 // Two legitimate ordinary strikes collect marks, and the paid release spends them.
 system.currentTick+=g.seconds*20+1;s.cd.clear();s.m=100;s.s=100;
 combatResonance.onHurt(p,enemy,g,5);system.currentTick+=10;combatResonance.onHurt(p,enemy,g,5);assert.equal(combatResonance.level(p,g),2);
 p.isSneaking=true;charge.start(p,{typeId:held});system.currentTick+=23;assert.equal(charge.release(p,{typeId:held}),false);
 charge.start(p,{typeId:held});system.currentTick+=24;before=damage.length;assert.equal(charge.release(p,{typeId:held}),true);
 assert.equal(damage.length,before+1);assert.equal(s.m,100-g.cost-3);assert.equal(s.s,92);assert.equal(combatResonance.level(p,g),0);assert.ok(notices.some(n=>n.includes('二連終撃')));assert.equal(charge.release(p,{typeId:held}),false);
 // Insufficient resources cannot consume the markers, even after a release.
 p.isSneaking=false;system.currentTick+=200;combatResonance.onHurt(p,enemy,g,5);system.currentTick+=10;combatResonance.onHurt(p,enemy,g,5);
 p.isSneaking=true;s.m=0;s.cd.clear();charge.start(p,{typeId:held});system.currentTick+=24;before=damage.length;charge.release(p,{typeId:held});assert.equal(damage.length,before);assert.equal(combatResonance.level(p,g),2);
 combatResonance.clear(p.id);
}
console.log('Final sword/axe use existing cast, two-hit charged finisher, costs and visual fallback (mocked)');
