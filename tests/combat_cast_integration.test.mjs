// Exercise the actual cast function with fake Bedrock objects. This is not a
// test of Minecraft's event, animation, rendering, collision or networking.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {setupCombatResonance} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_resonance.js';
import {GameMode,EntityDamageCause} from '@minecraft/server';
import {setupCombatGuard} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_guard.js';
import {prepareWindRay,renderWindRay} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_wind_ray.js';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const code=source.slice(source.indexOf('function cast(p,g,charged=false){'),source.indexOf('function castElement('));
const system={currentTick:0,runTimeout:()=>{}};const damage=[],particles=[],notices=[],props=[];
const dimension={id:'hakkai:realm_0',spawnParticle:(...v)=>particles.push(v)};
const p={id:'player',typeId:'minecraft:player',isValid:true,isSneaking:false,selectedSlotIndex:0,dimension,location:{x:0,y:80,z:0},getGameMode:()=>GameMode.Survival,getViewDirection:()=>({x:1,y:0,z:0}),playAnimation:()=>{},playSound:()=>{},addEffect:()=>{}};
const target={id:'zombie',typeId:'minecraft:zombie',isValid:true,dimension,location:{x:2,y:80,z:0},getHeadLocation:()=>({x:2,y:81,z:0}),getComponent:()=>({hasTypeFamily:t=>t==='monster'})};
const g={id:'gear_002',kind:'剣',cost:5,seconds:3,damage:10,power:0,a:0,modifier:0,skill:'風の技',rank:1,defense:0,number:2};
const s={m:100,s:100,cd:new Map()},notice=(...v)=>notices.push(v);
const combatResonance=setupCombatResonance({system,notice});
for(const t of [0,10,20]){system.currentTick=t;combatResonance.onHurt(p,target,g,2);}
assert.equal(combatResonance.level(p,g),3);system.currentTick=30;
const context={system,combatResonance,notice,prepareWindRay,renderWindRay,state:()=>s,isCreative:()=>false,num:()=>0,property:(...v)=>props.push(v),home:[],aspect:()=>0,currentPlace:()=>undefined,world:{getTimeOfDay:()=>6000},enemies:()=>[target],visibleFrom:()=>true,hit:(...v)=>damage.push(v),effects:Array(20).fill('speed'),ns:'hakkai:',dist:()=>0,along:()=>{}};
vm.createContext(context);vm.runInContext(code,context);
s.m=0;context.cast(p,g);assert.equal(combatResonance.level(p,g),3,'insufficient resources must not consume charge');
s.m=100;s.cd.set(g.id,31);context.cast(p,g);assert.equal(combatResonance.level(p,g),3,'cooldown must not consume charge');
s.cd.clear();context.cast(p,g);assert.equal(combatResonance.level(p,g),0);
assert.equal(s.m,95);assert.equal(s.s,95);assert.equal(s.cd.get(g.id),90);
assert.equal(damage.length,1);assert.equal(damage[0][2],9,'actual skill damage receives 25% rounded multiplier');
assert.equal(particles.filter(v=>v[0]==='hakkai:wind_burst').length,20,'ring and impact effects');
assert.ok(notices.some(x=>x[1].includes('風紋解放')));
// A charged skill with full marks uses a single aimed ray. Preparation
// failure must leave resources, cooldown and resonance untouched.
for(const t of [100,110,120]){system.currentTick=t;combatResonance.onHurt(p,target,g,2);}
system.currentTick=130;s.cd.clear();p.getHeadLocation=()=>({x:0,y:81,z:0});
dimension.isChunkLoaded=()=>false;dimension.getBlockFromRay=()=>undefined;dimension.getEntitiesFromRay=()=>[{entity:target,distance:2}];
const priorMana=s.m,priorStamina=s.s,priorHits=damage.length;
context.cast(p,g,true);assert.equal(combatResonance.level(p,g),3);assert.equal(s.m,priorMana);assert.equal(s.s,priorStamina);assert.equal(s.cd.size,0);
dimension.isChunkLoaded=()=>true;context.cast(p,g,true);
assert.equal(combatResonance.level(p,g),0);assert.equal(s.m,priorMana-8);assert.equal(s.s,priorStamina-8);
assert.equal(damage.length,priorHits+1);assert.equal(damage.at(-1)[1],target);
assert.ok(notices.some(x=>x[1].includes('風紋閃')));
// Paid defence and a focused attack share the same stamina pool. Casting
// doesn't cancel a paid guard window or grant an unpaid one.
for(const t of [200,210,220]){system.currentTick=t;combatResonance.onHurt(p,target,g,2);}
system.currentTick=230;s.cd.clear();p.isSneaking=true;const guard=setupCombatGuard({notice});
const staminaBeforeGuard=s.s;guard.tick(p,g,s,230);assert.equal(s.s,staminaBeforeGuard-5);
context.cast(p,g,true);assert.equal(s.s,staminaBeforeGuard-13);
assert.equal(guard.scale(p,g,{cause:EntityDamageCause.entityAttack,damagingEntity:target},231,10),3);
assert.equal(guard.scale(p,g,{cause:EntityDamageCause.entityAttack,damagingEntity:target},250,10),10);
// Two confirmed strikes lead to a charged finisher, independently of the
// three-mark beam. Failing resource or cooldown checks leaves both marks.
p.isSneaking=false;for(const t of [300,310]){system.currentTick=t;combatResonance.onHurt(p,target,g,2);}
system.currentTick=320;s.cd.clear();p.isSneaking=true;const savedStamina=s.s;s.s=7;
context.cast(p,g,true);assert.equal(combatResonance.level(p,g),2);assert.equal(s.cd.size,0);s.s=savedStamina;
s.cd.set(g.id,330);context.cast(p,g,true);assert.equal(combatResonance.level(p,g),2);s.cd.clear();
const beforeDamage=damage.length;context.cast(p,g,true);
assert.equal(combatResonance.level(p,g),0);assert.equal(damage.length,beforeDamage+1);
assert.equal(damage.at(-1)[2],11,'two-hit finisher damage is boosted');
assert.equal(damage.at(-1)[5],.65*1.5);assert.equal(s.s,savedStamina-8);
assert.ok(notices.some(x=>x[1].includes('二連終撃')));
// Charged axe finishers require line of sight even in the nondirectional area.
p.isSneaking=false;g.kind='斧';for(const t of [400,410]){system.currentTick=t;combatResonance.onHurt(p,target,g,2);}
system.currentTick=420;s.cd.clear();p.isSneaking=true;context.visibleFrom=()=>false;
const beforeBlocked=damage.length;context.cast(p,g,true);assert.equal(damage.length,beforeBlocked);
assert.equal(combatResonance.level(p,g),0,'a missed finisher still consumes marks');
// Weapon finishers retain their distinct target limits, and all use the
// same paid two-hit state rather than multiplying with full resonance.
for(const [index,kind,cap,push] of [[0,'剣',3,.65*1.5],[1,'斧',6,1.5*1.5],[2,'槍',2,.54*1.5]]){
 const foes=Array.from({length:7},(_,i)=>({...target,id:`foe-${i}`,location:{x:2+i*.2,y:80,z:0}}));
 context.enemies=()=>foes;context.visibleFrom=()=>true;g.kind=kind;s.s=100;s.m=100;s.cd.clear();p.isSneaking=false;
 const start=500+index*100;for(const tick of [start,start+10]){system.currentTick=tick;combatResonance.onHurt(p,target,g,2);}
 system.currentTick=start+20;p.isSneaking=true;const from=damage.length;context.cast(p,g,true);
 const strikes=damage.slice(from);assert.equal(strikes.length,cap,`${kind} finisher target limit`);
 assert.ok(strikes.every(v=>v[2]===11&&v[5]===push),`${kind} damage and knockback`);
}
console.log('Combat integration: real cast resource/cooldown checks, charge spend, multiplier and impact effects OK (mocked)');
