// Seven distinct expanding creature abilities, using mocked Script APIs.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {fixture} from './mob_burst_fixture.mjs';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {BURST_DESIGNS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_burst_wave.js';
import {guardianShapeContains} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_attacks.js';
import {scaledMobDamage} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_balance.js';
const bursts=mobContentList.filter(p=>p.temper==='hostile'&&p.talent==='burst');assert.equal(bursts.length,7);
assert.deepEqual(Object.keys(BURST_DESIGNS).sort(),bursts.map(p=>p.id).sort());
assert.equal(new Set(Object.values(BURST_DESIGNS)).size,7);

for(const profile of bursts){
 test(`${profile.id}: unique expanding front uses its visible geometry and hits once`,()=>{
  const f=fixture(profile),victims=[];
  for(let i=0;i<8;i++){const a=i*Math.PI/4,p=f.make('p'+i,2.6*Math.cos(a),2.6*Math.sin(a));f.players.push(p);victims.push(p);}
  f.advance(160);assert.equal(f.hits.length,0);f.advance(171);
  const shape=BURST_DESIGNS[profile.id],expect=victims.filter(p=>guardianShapeContains(shape,p.location.x,p.location.z)).map(p=>p.id).sort();
  assert.deepEqual(f.hits.filter(([,id])=>/^p[0-7]$/.test(id)).map(([,id])=>id).sort(),expect);
  assert.equal(new Set(f.hits.map(([,id])=>id)).size,f.hits.length);
  assert.ok(f.hits.every(([,id,damage])=>damage===scaledMobDamage(5+profile.variant*2,profile.realm)));
  const wave=f.particles.filter(([t,id])=>t>160&&id.startsWith('hakkai:shot_'));assert.ok(wave.length);
  assert.ok(wave.every(([,id,p])=>guardianShapeContains(shape,p.x,p.z)));
  assert.ok(!f.particles.some(([,id])=>id==='hakkai:warning_marker'));
 });
 test(`${profile.id}: wall, evade, parry and rejected damage cannot push or hit through terrain`,()=>{
  for(const mode of ['wall','unloaded','evade','parry','rejected']){
   const f=fixture(profile,{reject:mode==='rejected',evade:()=>mode==='evade',parry:()=>mode==='parry'});
   f.p.location.x=0;if(mode==='wall'){f.p.location.x=2;f.wall(1);}if(mode==='unloaded')f.loaded(false);
   f.advance(171);assert.equal(f.hits.length,mode==='rejected'?1:0,mode);assert.equal(f.impulses.length,0,mode);
  }
 });
}
test('burst obstacle clipping uses the victim height rather than only the caster height',()=>{
 const profile=bursts.find(p=>p.id==='foe_0_10'),f=fixture(profile),old=f.p.dimension.getBlockFromRay;
 f.p.dimension.getBlockFromRay=(a,v,opts)=>{
  if(a.y>81.2){const k=(1-a.x)/v.x;if(Number.isFinite(k)&&k>=0&&k<=opts.maxDistance)return {block:{location:{x:1,y:a.y,z:a.z+k*v.z}},faceLocation:{x:0,y:0,z:0}};}
  return old(a,v,opts);
 };
 const q=f.make('upper',2,0);q.location.y=81;f.players.push(q);f.advance(172);
 assert.ok(!f.hits.some(([,id])=>id==='upper'));
 assert.ok(f.particles.filter(([t,id,p])=>t>160&&id.startsWith('hakkai:shot_')&&p.y>81.2).every(([,id,p])=>p.x<=1.00001));
});
test('one player parrying does not hide another participant',()=>{
 for(const profile of bursts){
  const f=fixture(profile,{parry:p=>p.id==='primary'});f.p.location.x=0;
  const second=f.make('second',0,0);f.players.push(second);f.advance(172);
  assert.deepEqual(f.hits.map(([,id])=>id),['second'],profile.id);
 }
});
test('wing attack uses its stronger upward impulse only on accepted damage',()=>{
 const profile=bursts.find(p=>p.id==='foe_6_8');
 for(const reject of [false,true]){
  const f=fixture(profile,{reject});f.p.location.x=0;f.p.location.z=2;f.advance(172);
  assert.equal(f.hits.length,1);assert.equal(f.impulses.length,reject?0:1);
  if(!reject){assert.equal(f.impulses[0][1].y,.35);assert.ok(Math.abs(f.impulses[0][1].z-1.35)<1e-9);}
 }
});
test('visual failure is cosmetic and stale scheduled waves cancel',()=>{
 for(const mode of ['visual','stagger','peaceful','late']){
  const f=fixture(bursts[0]);f.p.location.x=0;if(mode==='visual')f.failVisual(true);f.advance(160);
  if(mode==='stagger')f.ctrl.stagger(f.mob,160);
  if(mode==='peaceful')f.world.difficulty=Difficulty.Peaceful;
  if(mode==='late'){const task=f.queue.shift();f.system.currentTick=170;task.fn();}
  f.advance(172);assert.equal(f.hits.length,mode==='visual'?1:0,mode);
 }
});
