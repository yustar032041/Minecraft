// Per-realm normal and king guardians: controller simulations, not Bedrock QA.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Difficulty,GameMode} from '@minecraft/server';
import {GUARDIAN_REALM_ATTACKS,KING_GUARDIAN_REALM_ATTACKS,guardianShapeContains} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_attacks.js';
import {GUARDIAN_TECHNIQUES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_boss.js';
import {scaledRealmDamage,REALM_GUARDIAN_MULTIPLIERS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_balance.js';
import {fixture} from './guardian_wave_fixture.mjs';
const starts=[30,120,210],impacts=[70,160,250];
assert.equal(new Set(GUARDIAN_REALM_ATTACKS.map(row=>row.map(x=>x.shape).join(','))).size,8);
assert.equal(new Set(KING_GUARDIAN_REALM_ATTACKS.map(row=>row.map(x=>x.shape).join(','))).size,8);
for(let realm=0;realm<8;realm++)assert.notDeepEqual(GUARDIAN_REALM_ATTACKS[realm].map(x=>x.shape),KING_GUARDIAN_REALM_ATTACKS[realm].map(x=>x.shape));
for(let realm=0;realm<8;realm++)for(const special of [false,true])for(let slot=0;slot<3;slot++)test(`${special?'king ':''}guardian ${realm}/${slot}: unique moving pattern, accurate region, once per target`,()=>{
 const f=fixture({realm,special});
 f.advance(starts[slot]);f.hits.length=0;f.effects.length=0;
 const victims=[];
 for(let i=0;i<8;i++){
  const a=Math.PI*i/4,p=f.make('p'+i,2.6*Math.cos(a),80,2.6*Math.sin(a));victims.push(p);f.players.push(p);
 }
 f.advance(impacts[slot]);assert.equal(f.hits.length,0,'no instantaneous impact or floor warning');
 f.advance(impacts[slot]+12);
 const design=(special?KING_GUARDIAN_REALM_ATTACKS:GUARDIAN_REALM_ATTACKS)[realm][slot],shape=design.shape;
 const expected=victims.filter(p=>guardianShapeContains(shape,p.location.x,p.location.z)).map(p=>p.id).sort();
 const isVictim=id=>/^p[0-7]$/.test(id);
 const got=f.hits.filter(([,id])=>isVictim(id)).map(([,id])=>id).sort();
 assert.deepEqual(got,expected);assert.ok(got.length>0);assert.equal(new Set(got).size,got.length);
 const expectedDamage=special?GUARDIAN_TECHNIQUES[slot].damage:scaledRealmDamage(GUARDIAN_TECHNIQUES[slot].damage,realm,REALM_GUARDIAN_MULTIPLIERS);
 assert.ok(f.hits.filter(([,id])=>isVictim(id)).every(([,id,n])=>n===expectedDamage));
 const effects=f.effects.filter(([,id])=>isVictim(id));assert.equal(effects.length,got.length);
 assert.ok(effects.every(([,id,e])=>e===design.effect));
 const wave=f.particles.filter(([t,id])=>t>impacts[slot]&&t<=impacts[slot]+12&&id.startsWith('hakkai:shot_'));
 assert.ok(wave.length);assert.ok(wave.every(([,id,p])=>guardianShapeContains(shape,p.x,p.z)),'render and hit use the same angular region');
 assert.ok(!f.particles.some(([,id])=>id==='hakkai:warning_marker'));
});
test('wall clips both a guardian wave and its hits; unloaded terrain fails closed',()=>{
 for(const mode of ['wall','unloaded']){
  const f=fixture();f.primary.location.x=3;if(mode==='wall')f.wall(1.5);else f.loaded(false);
  f.advance(85);assert.deepEqual(f.hits,[]);
  if(mode==='wall')assert.ok(f.particles.filter(([t,id])=>t>70&&id.startsWith('hakkai:shot_')).every(([,id,p])=>p.x<=1.50001));
 }
});
test('obstacles at the target height block hits and the corresponding visual layer',()=>{
 const f=fixture(),old=f.d.getBlockFromRay;
 f.d.getBlockFromRay=(a,v,opts)=>{
  if(a.y>81.2){const k=(1-a.x)/v.x;if(Number.isFinite(k)&&k>=0&&k<=opts.maxDistance)return {block:{location:{x:1,y:a.y,z:a.z+k*v.z}},faceLocation:{x:0,y:0,z:0}};}
  return old(a,v,opts);
 };
 const upper=f.make('upper',2,81,0);f.players.push(upper);f.advance(85);
 assert.ok(!f.hits.some(([,id])=>id==='upper'));
 assert.ok(f.particles.filter(([t,id,p])=>t>70&&id.startsWith('hakkai:shot_')&&p.y>81.2).every(([,id,p])=>p.x<=1.00001));
});
test('wave can be dodged or parried and damage rejection cannot apply a secondary effect',()=>{
 for(const spec of [{evade:()=>true},{parry:()=>true},{reject:true}]){
  const f=fixture(spec);f.primary.location.x=1;f.advance(85);
  assert.equal(f.hits.length,spec.reject?1:0);assert.deepEqual(f.effects,[]);
 }
 const f=fixture();f.primary.location.x=3;f.advance(71);f.primary.location.z=8;f.advance(85);assert.deepEqual(f.hits,[]);
});
test('stagger, late callbacks, peaceful and invalid players cannot cause stale hits',()=>{
 for(const mode of ['stagger','late','peaceful','creative','disconnect','source']){
  const f=fixture();f.primary.location.x=3;f.advance(71);
  if(mode==='stagger')f.ctrl.stagger(f.guardian,71);
  if(mode==='late'){const task=f.queue.shift();f.system.currentTick=80;task.fn();}
  if(mode==='peaceful')f.world.difficulty=Difficulty.Peaceful;
  if(mode==='creative')f.primary.getGameMode=()=>GameMode.Creative;
  if(mode==='disconnect')f.primary.isValid=false;
  if(mode==='source')f.guardian.isValid=false;
  f.advance(85);assert.deepEqual(f.hits,[],mode);
 }
});
test('parry callback cannot move source or target into a stale hit',()=>{
 for(const move of [(p)=>p.location.z=9,(_,g)=>g.location.x=9]){
  const f=fixture({parry:(p,g)=>{move(p,g);return false;}});f.primary.location.x=1;f.advance(85);assert.deepEqual(f.hits,[]);
 }
});
