// Moving drain shots: mocked timing and raycasts, not engine collision/render.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {scaledMobDamage} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_balance.js';
import {start,fixture} from './moving_attack_fixture.mjs';
const drains=mobContentList.filter(p=>p.temper==='hostile'&&p.talent==='leech');assert.equal(drains.length,8);
for(const profile of drains){
 test(`${profile.id}: drain travels visibly and heals only after contact`,()=>{
  const f=start(profile);assert.deepEqual(f.hits,[]);assert.deepEqual(f.heals,[]);f.advance(170);
  assert.deepEqual(f.hits.map(x=>x[1]),[scaledMobDamage(5+profile.variant,profile.realm)]);assert.ok(f.heals.includes(12+profile.variant*2));assert.ok(f.selfEffects.includes('speed'));
  assert.ok(f.particles.some(([t,id])=>t>160&&id==='hakkai:shot_shadow'));assert.equal(f.messages.length,0);
 });
 for(const mode of ['wall','unloaded','solid','rayError','sidestep','range','parry','reject','particle'])test(`${profile.id}: ${mode} is handled at the moving shot`,()=>{
  const options=mode==='parry'?{onParry:p=>{p.location.z=10}}:mode==='reject'?{reject:true}:{};
  const f=fixture(profile,options);
  if(mode==='range')f.p.location.x=9;
  f.tick(0);f.tick(120);f.advance(160);
  if(mode==='wall')f.wall(2);if(mode==='unloaded')f.loaded(false);
  if(mode==='solid')f.d.getBlock=()=>({isAir:false});if(mode==='rayError')f.d.getBlockFromRay=()=>{throw Error('ray')};
  if(mode==='sidestep')f.p.location.z=3;if(mode==='particle')f.particlesFail(true);
  f.advance(180);
  if(mode==='particle'){assert.equal(f.hits.length,1);assert.ok(f.heals.length);}
  else {assert.equal(f.hits.length,mode==='reject'?1:0);assert.deepEqual(f.heals,[]);assert.ok(!f.selfEffects.includes('speed'));}
 });
}
