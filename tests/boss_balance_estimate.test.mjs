// Design-model checks only: engine mitigation, enchantments, regeneration,
// timing, shields, overlap, and actual difficulty are not simulated here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GUARDIAN_TECHNIQUES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_boss.js';
import {scaledRealmDamage,REALM_GUARDIAN_MULTIPLIERS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_balance.js';
import {CHIEF_ATTACKS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';
import {wardenPatterns,wardenAttackDamage,WARDEN_HEAL_PER_SECOND} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {WARDEN_MODE_DAMAGE} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_modes.js';
import {WARDEN_BLADE_DAMAGE,WARDEN_BLADE_PULSE_DAMAGE} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_swords.js';
const hpAfter=(damage,hits,{health=20,armor=20,resistance=0}={})=>health-hits*damage*(1-Math.min(20,armor)*.04)*(1-resistance*.2);
const root='Hakkai_v7.1.0/BehaviorPack/entities';
test('guardian HP and attack budgets increase as the eight realms advance',()=>{
 const hp=Array.from({length:8},(_,i)=>JSON.parse(fs.readFileSync(`${root}/guardian_${i}.json`))['minecraft:entity'].components['minecraft:health']);
 assert.deepEqual(hp.map(x=>x.value),[800,850,900,1200,1300,1400,1500,1600]);
 assert.ok(hp.every(x=>x.value===x.max));assert.deepEqual(GUARDIAN_TECHNIQUES.map(x=>x.damage),[10,14,9]);
 for(const [realm,mult] of REALM_GUARDIAN_MULTIPLIERS.entries()){
  const high=scaledRealmDamage(14,realm,REALM_GUARDIAN_MULTIPLIERS);
  assert.ok(hpAfter(high,2,{armor:20})>0);assert.ok(high>=16&&high<30);
 }
});
test('chief charge, shot and mist use late-realm design values',()=>{
 assert.deepEqual(CHIEF_ATTACKS.map(x=>x.damage),[18,16.5,10.5]);
 assert.ok(CHIEF_ATTACKS.every(x=>hpAfter(x.damage,2,{armor:20})>0));
});
test('warden patterns, combos, modes and blades have deliberate separate budgets',()=>{
 const strongest={health:28,armor:20,resistance:2}; // gear_213 supplies Resistance II and Health Boost II.
 for(let phase=0;phase<5;phase++){
  const patterns=wardenPatterns(phase);assert.equal(patterns.length,phase===4?210:42);
  for(const attack of patterns){
   const perHit=wardenAttackDamage(attack,false,phase),total=perHit*(attack.strikes??1);
   assert.ok(Number.isFinite(total)&&total>0&&total<=72,`${attack.attack}: ${total}`);
   assert.ok(hpAfter(total,2,strongest)>0,`${attack.attack}: ${total}`);
   assert.equal(wardenAttackDamage(attack,true,phase),perHit/2);
  }
 }
 assert.equal(WARDEN_HEAL_PER_SECOND,8);
 assert.ok(Object.values(WARDEN_MODE_DAMAGE).every(n=>n>0&&n<=33));
 assert.ok(WARDEN_BLADE_DAMAGE.every(n=>n>0&&n<=18));
 assert.ok(Object.values(WARDEN_BLADE_PULSE_DAMAGE).every(n=>n>0&&n<=15));
 const gear=JSON.parse(fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/items/gear_213.json'))['minecraft:item'].components;
 assert.equal(gear['minecraft:wearable'].protection,20);
 const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 assert.match(main,/chest\.typeId===ns\+'gear_213'[\s\S]{0,150}resistance[\s\S]{0,100}health_boost/);
});
