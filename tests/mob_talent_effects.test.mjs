import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {talentImpact} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_talent_effects.js';

test('all hostile talents have bounded, registered cosmetic impacts',()=>{
 const impacts=new Set();
 for(const profile of mobContentList.filter(x=>x.temper==='hostile')){
  const emitted=[];const mob={location:{x:0,y:5,z:0},dimension:{spawnParticle:(id,loc)=>emitted.push({id,loc})}};
  talentImpact(mob,profile,{aim:{x:4,y:5,z:6},radius:2});
  assert.equal(emitted.length,3,profile.id);
  const center=['ward','armor'].includes(profile.talent)?mob.location:{x:4,y:5,z:6};
  for(const {id,loc} of emitted){
   assert.ok(Math.hypot(loc.x-center.x,loc.z-center.z)<=.45+1e-9,profile.id);
   const particle=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/ResourcePack/particles/${id.slice(7)}.json`));
   assert.equal(particle.particle_effect.description.identifier,id);
   assert.equal(particle.particle_effect.components['minecraft:emitter_rate_instant'].num_particles,1);
   impacts.add(id);
  }
 }
 assert.equal(impacts.size,9);
});
test('malformed input or unavailable cosmetic effects cannot interrupt gameplay',()=>{
 const bad={location:{x:0,y:0,z:0},dimension:{spawnParticle:()=>{throw Error('unavailable')}}};
 assert.doesNotThrow(()=>talentImpact(bad,{talent:'time'},{aim:{x:1,y:2,z:3},radius:1}));
 for(const input of [undefined,{}, {aim:{x:NaN,y:0,z:0}}])assert.doesNotThrow(()=>talentImpact(bad,{talent:'time'},input));
});

test('king attacks select a pose appropriate to their existing technique',async()=>{
 const {bossVisualAnimation}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/mob_system.js');
 const styles={cleave:'cleave',starfall:'cast',time_snare:'cast',star_collapse:'cast',summon:'cast',eclipse_burst:'wave',rift_wave:'wave',roar:'wave',rewind:'wave'};
 for(const [kind,style] of Object.entries(styles))for(const phase of ['windup','strike'])assert.equal(bossVisualAnimation(kind,phase),`animation.hakkai.eclipse_${style}_${phase}`);
});

test('web and burst palettes follow the eight realms without changing their mechanics',()=>{
 const expected={web:['shadow','spore','sand','frost','spark','shadow','wind','time'],burst:['wind','spore','sand','frost','spark','shadow','wind','time']};
 for(const [talent,palettes] of Object.entries(expected))for(let realm=0;realm<8;realm++){
  const ids=[],e={location:{x:0,y:0,z:0},dimension:{spawnParticle:id=>ids.push(id)}};
  talentImpact(e,{talent,realm},{aim:{x:2,y:0,z:0},radius:2});
  assert.deepEqual(ids,Array(3).fill(`hakkai:mob_${palettes[realm]}`));
 }
});
