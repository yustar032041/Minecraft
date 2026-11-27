// Configuration and mocked design estimates only; not Bedrock balance proof.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {scaledMobDamage,scaledRealmDamage,REALM_GUARDIAN_MULTIPLIERS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_balance.js';
import {GUARDIAN_TECHNIQUES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_boss.js';
import {ENDER_ABILITIES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
const base=p=>{const v=p.variant;return ({thorns:3+v*2,web:2+v,spore:2+v,frost:3+v,shock:4+v*2,time:2+v,gust:2+v,mark:v===2?4:2,leech:5+v,leap:5+v*2,charge:6+v*2,ward:2+v,armor:2+v,burst:5+v*2})[p.talent];};
test('all 104 hostile entity definitions keep increasing native HP and nondecreasing melee by corresponding group',()=>{
 execFileSync('python3',['tools/sync_realm_entity_progression.py','--check']);
 for(const [kind,i] of [...Array.from({length:12},(_,i)=>['foe',i]),['wild',2]]){
  let previous;
  for(let realm=0;realm<8;realm++){
   const c=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/entities/${kind}_${realm}_${i}.json`))['minecraft:entity'].components;
   const now=[c['minecraft:health'].value,c['minecraft:attack'].damage];
   if(previous){assert.ok(now[0]>previous[0]);assert.ok(now[1]>=previous[1]);}previous=now;
  }
 }
});
test('hostile profile damage has increasing aggregate by realm and finite bounds',()=>{
 let previous=0;
 for(let realm=0;realm<8;realm++){
  const profiles=mobContentList.filter(p=>p.realm===realm&&p.temper==='hostile');assert.equal(profiles.length,13);
  const attacks=profiles.map(p=>{const damage=base(p);assert.ok(Number.isFinite(damage),p.id);return scaledMobDamage(damage,realm);});
  const avg=attacks.reduce((a,b)=>a+b,0)/attacks.length;assert.ok(avg>previous,`realm ${realm}: ${avg} vs ${previous}`);previous=avg;
  assert.ok(attacks.every(a=>a>0&&a<=16),'individual moves stay within design bound');
 }
 assert.equal(scaledMobDamage(3,8),3);assert.equal(scaledMobDamage(-1,7),-1);
});
test('each ordinary guardian technique and traveler attack grows by realm',()=>{
 for(const attack of GUARDIAN_TECHNIQUES){const values=REALM_GUARDIAN_MULTIPLIERS.map((_,i)=>scaledRealmDamage(attack.damage,i,REALM_GUARDIAN_MULTIPLIERS));assert.ok(values.every((n,i)=>!i||n>values[i-1]));}
 assert.ok(ENDER_ABILITIES.every((a,i)=>!i||a.damage>ENDER_ABILITIES[i-1].damage));
});
