// Moving ranged contact checks: simulated server APIs, not Bedrock physics.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {scaledMobDamage} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_balance.js';
import {isMovingProjectileTalent} from '../Hakkai_v7.1.0/BehaviorPack/scripts/attack_warning.js';
import {talentContact} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_talent_effects.js';
import {start,fixture} from './moving_attack_fixture.mjs';
const profiles=mobContentList.filter(p=>p.temper==='hostile'&&isMovingProjectileTalent(p.talent)&&p.talent!=='leech');assert.equal(profiles.length,57);
const maximum={thorns:8,web:11,spore:12,frost:11,shock:13,time:14,gust:14,mark:16};
const damage=p=>({thorns:3+p.variant*2,web:2+p.variant,spore:2+p.variant,frost:3+p.variant,shock:4+p.variant*2,time:2+p.variant,gust:2+p.variant,mark:p.variant===2?4:2})[p.talent];
const effects={thorns:['slowness'],web:['slowness'],spore:['poison'],frost:['slowness','mining_fatigue'],shock:['weakness'],time:['slowness','weakness'],gust:[],mark:['weakness']};
for(const profile of profiles){
 test(`${profile.id}: no ground warning; accepted moving contact preserves damage and primary effects`,()=>{
  const f=start(profile);f.advance(170);assert.deepEqual(f.hits.map(x=>x[1]),[scaledMobDamage(damage(profile),profile.realm)]);
  for(const effect of effects[profile.talent])assert.ok(f.effects.includes(effect),effect);
  assert.equal(f.messages.length,0);assert.ok(!f.particles.some(([,id])=>id==='hakkai:warning_marker'));
  assert.ok(f.particles.some(([t,id])=>t>160&&id.startsWith('hakkai:shot_')));
  const guide=f.ctrl.fieldGuide(f.p,mobContentList.indexOf(profile));assert.match(guide,/弾は壁や他の生物で止まり/);
 });
 test(`${profile.id}: reject or movement before contact cannot apply secondary effects`,()=>{
  const denied=start(profile,{reject:true});denied.advance(170);assert.equal(denied.hits.length,1);assert.deepEqual(denied.effects,[]);
  for(const offset of [{x:0,y:0,z:3},{x:0,y:4,z:0}]){
   const f=start(profile);f.p.location={x:5+offset.x,y:80+offset.y,z:offset.z};f.advance(170);assert.deepEqual(f.hits,[]);assert.deepEqual(f.effects,[]);
  }
 });
 test(`${profile.id}: ray segment cannot reach beyond its maximum and walls stop it`,()=>{
  const f=fixture(profile);f.p.location.x=maximum[profile.talent]+1;f.tick(0);f.tick(120);f.advance(190);assert.deepEqual(f.hits,[]);
  const g=start(profile);g.wall(2);g.advance(170);assert.deepEqual(g.hits,[]);
 });
 test(`${profile.id}: contact particles use the pre-hit position even if damage moves the victim`,()=>{
  const f=start(profile);f.p.applyDamage=n=>{f.hits.push([f.system.currentTick,n]);f.p.location.x=100;return true;};f.advance(170);
  assert.equal(f.hits.length,1);assert.ok(f.particles.some(([,id,p])=>id.startsWith('hakkai:mob_')&&p.x===5&&p.y===80.8));
 });
}
test('cosmetic contact rejects unknown palette and invalid positions',()=>{
 let count=0;const d={spawnParticle:()=>count++};
 talentContact(d,{x:NaN,y:1,z:1},{talent:'web',realm:0});talentContact(d,{x:1,y:1,z:1},{talent:'unmapped'});assert.equal(count,0);
 assert.doesNotThrow(()=>talentContact({spawnParticle(){throw Error('unavailable')}},{x:1,y:2,z:3},{talent:'web',realm:0}));
});
