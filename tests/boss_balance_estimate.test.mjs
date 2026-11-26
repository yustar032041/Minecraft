// Deterministic design-model checks, not Bedrock armor or encounter simulation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GUARDIAN_TECHNIQUES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_boss.js';
import {CHIEF_ATTACKS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';
import {wardenPatterns,wardenAttackDamage,WARDEN_HEAL_PER_SECOND} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
const hpAfterTwo=(damage,armor)=>20-2*damage*(1-Math.min(20,armor)*.04);
const root='Hakkai_v7.1.0/BehaviorPack/entities';
test('guardian health and warned attacks use the chosen design budget',()=>{
 const hp=Array.from({length:8},(_,i)=>JSON.parse(fs.readFileSync(`${root}/guardian_${i}.json`))['minecraft:entity'].components['minecraft:health']);
 assert.deepEqual(hp.map(x=>x.value),[192,200,208,216,224,232,240,248]);
 assert.ok(hp.every(x=>x.value===x.max));
 assert.deepEqual(GUARDIAN_TECHNIQUES.map(x=>x.damage),[10,14,9]);
 assert.ok(GUARDIAN_TECHNIQUES.every(x=>hpAfterTwo(x.damage,15)>0));
});
test('chieftain charge, shot and mist two-hit model with fifteen armor',()=>{
 assert.deepEqual(CHIEF_ATTACKS.map(x=>x.damage),[12,11,7]);
 assert.ok(CHIEF_ATTACKS.every(x=>hpAfterTwo(x.damage,15)>0));
});
test('all warden patterns have bounded per-cast damage including warned triples',()=>{
 for(let phase=0;phase<5;phase++){
  const patterns=wardenPatterns(phase);
  assert.equal(patterns.length,phase===4?210:42);
  for(const attack of patterns){
   const perHit=wardenAttackDamage(attack),total=perHit*(attack.strikes??1);
   assert.ok(Number.isFinite(total)&&total>0&&total<=44,`${attack.attack}: ${total}`);
   // Strong but deliberately bounded for two complete copies of one pattern,
   // under the documented 20-point no-enchantment model only.
   assert.ok(hpAfterTwo(total,20)>0,`${attack.attack}: ${total}`);
   assert.equal(wardenAttackDamage(attack,true),perHit/2);
  }
 }
 assert.equal(WARDEN_HEAL_PER_SECOND,12);
});
