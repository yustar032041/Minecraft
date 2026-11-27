// Controller, clock and raycast simulations. These do not establish Bedrock
// rendering, collision geometry, network synchronization or particle load.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {setupMobSystem} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js';
import {setupRealmEnders,ENDER_ABILITIES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_ender.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {isMovingProjectileTalent} from '../Hakkai_v7.1.0/BehaviorPack/scripts/attack_warning.js';
const profiles=mobContentList.filter(p=>p.temper==='hostile'&&isMovingProjectileTalent(p.talent));
assert.equal(profiles.length,65);
import {fixture,start} from './moving_attack_fixture.mjs';
for(const profile of profiles){
 test(`${profile.id}: moving shot replaces floor warning and applies its actual contact effects`,()=>{
  const f=start(profile);assert.equal(f.hits.length,0);assert.equal(f.messages.length,0);assert.ok(!f.particles.some(([,id])=>id==='hakkai:warning_marker'));
  f.advance(170);assert.equal(f.hits.length,1);assert.ok(f.hits[0][0]>160);assert.ok(f.particles.some(([t,id])=>t>160&&id.startsWith('hakkai:shot_')));
  if(profile.talent!=='leech')assert.ok(f.effects.length||profile.talent==='gust');
 });
 test(`${profile.id}: shot misses a sidestep, stops at wall and tolerates missing particles`,()=>{
  const side=start(profile);side.p.location.z=3;side.advance(170);assert.deepEqual(side.hits,[]);
  const wall=start(profile);wall.wall(2);wall.advance(170);assert.deepEqual(wall.hits,[]);
  const cosmetic=start(profile);cosmetic.particlesFail(true);cosmetic.advance(170);assert.equal(cosmetic.hits.length,1);
 });
}
for(let realm=0;realm<8;realm++)test(`traveler ${realm}: source tell, moving shot, realm effect and sidestep`,()=>{
 const f=start({realm},{ender:true});assert.equal(f.messages.length,0);assert.equal(f.hits.length,0);assert.ok(!f.particles.some(([,id])=>id==='hakkai:warning_marker'));
 f.advance(70);assert.deepEqual(f.hits.map(x=>x[1]),[ENDER_ABILITIES[realm].damage]);assert.ok(f.effects.includes(ENDER_ABILITIES[realm].effect));
 const side=start({realm},{ender:true});side.p.location.z=2;side.advance(70);assert.deepEqual(side.hits,[]);
});
test('moving shots stop at a nearer entity, invalid terrain, stagger, difficulty or dimension change',()=>{
 const profile=profiles[0];
 for(const mode of ['entity','unloaded','stagger','peaceful','dimension','invalid']){
  const f=start(profile);
  if(mode==='entity')f.other([{id:'blocker',isValid:true,location:{x:2,y:80,z:0}}]);
  if(mode==='unloaded')f.loaded(false);
  if(mode==='stagger')f.ctrl.stagger(f.mob,160);
  if(mode==='peaceful')f.difficulty(Difficulty.Peaceful);
  if(mode==='dimension')f.p.dimension={id:'other'};
  if(mode==='invalid')f.mob.isValid=false;
  f.advance(170);assert.deepEqual(f.hits,[],mode);
 }
});
test('parry callbacks cannot move combatants and leave a stale hit',()=>{
 for(const ender of [false,true])for(const change of [(p)=>p.location.x=30,(p)=>p.dimension={id:'other'},(_,e)=>e.isValid=false]){
  const f=start(ender?{realm:0}:profiles[0],{ender,onParry:change});f.advance(ender?70:170);assert.deepEqual(f.hits,[]);
 }
});
test('rejected damage has no secondary effects; delayed callback does not catch up',()=>{
 const f=start(profiles.find(p=>p.talent==='frost'),{reject:true});f.advance(170);assert.equal(f.hits.length,1);assert.deepEqual(f.effects,[]);
 const g=start(profiles[0]);const task=g.queue.shift();assert.ok(task);g.system.currentTick=170;task.fn();assert.deepEqual(g.hits,[]);assert.equal(g.queue.length,0);
});
for(const profile of profiles)test(`${profile.id}: parry and rendering callbacks cannot create a stale shot hit`,()=>{
 for(const change of [(p)=>p.location.x=30,(p)=>p.dimension={id:'other'},(_,mob)=>mob.isValid=false]){
  const f=start(profile,{onParry:change});f.advance(175);assert.deepEqual(f.hits,[]);
 }
 const f=start(profile),spawn=f.d.spawnParticle;let moved=false;
 f.d.spawnParticle=(id,at)=>{spawn(id,at);if(id.startsWith('hakkai:shot_')&&at.x>4&&!moved){moved=true;f.p.location.z=5;}};
 f.advance(175);assert.ok(moved);assert.deepEqual(f.hits,[]);
});
for(const spec of [{profile:profiles[0],ender:false},...Array.from({length:8},(_,realm)=>({profile:{realm},ender:true}))])test(`${spec.ender?'traveler '+spec.profile.realm:spec.profile.id}: no scheduler, disconnect or source dimension change cannot hit`,()=>{
 for(const mode of ['scheduler','disconnect','source_dimension','player_mode','death']){
  const f=fixture(spec.profile,{ender:spec.ender});
  if(spec.ender)f.tick(20);else{f.tick(0);f.tick(120);}
  if(mode==='scheduler')f.system.runTimeout=()=>{throw Error('unavailable')};
  f.advance(spec.ender?60:160);
  if(mode==='disconnect')f.p.isValid=false;
  if(mode==='source_dimension')f.mob.dimension={id:'other'};
  if(mode==='player_mode')f.p.getGameMode=()=>GameMode.Creative;
  if(mode==='death'){f.mob.isValid=false;f.ctrl.onDeath({deadEntity:f.mob});}
  f.advance(spec.ender?75:175);assert.deepEqual(f.hits,[],mode);
 }
});
test('multiplayer scans cannot duplicate a single projectile launch',()=>{
 const f=fixture(profiles[0]);f.tick(0);f.tick(120);f.tick(120);f.advance(160);f.tick(160);
 assert.equal(f.queue.length,1);f.advance(175);assert.equal(f.hits.length,1);
});
