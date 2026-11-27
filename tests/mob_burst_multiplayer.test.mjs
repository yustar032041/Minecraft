// Multiplayer/geometry simulation; no claim about live client synchronization.
import {test} from 'node:test';import assert from 'node:assert/strict';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import {BURST_DESIGNS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_burst_wave.js';
import {fixture} from './mob_burst_fixture.mjs';
const bursts=mobContentList.filter(p=>p.temper==='hostile'&&p.talent==='burst');
function point(shape,r){const a=shape==='side'?Math.PI/2:shape==='diagonal'?Math.PI/4:0;return {x:r*Math.cos(a),z:r*Math.sin(a)};}
for(const profile of bursts){
 test(`${profile.id}: current multiplayer targets respect wave angle, height and reach`,()=>{
  for(const y of [78.5,81.5,78.499,81.501]){
   const f=fixture(profile),r=4+profile.variant,at=point(BURST_DESIGNS[profile.id],r-.01);
   const q=f.make('second',at.x,at.z);q.location.y=y;f.players.push(q);f.p.location.x=19;f.advance(173);
   assert.equal(f.hits.some(([,id])=>id==='second'),y>=78.5&&y<=81.5,`${profile.id}/${y}`);
  }
 });
 test(`${profile.id}: release position, late arrival, dimension and delay`,()=>{
  const f=fixture(profile);f.mob.location.x=8;f.p.location.x=19;
  const late=f.make('late',8,0),outside=f.make('outside',19,0);f.players.push(late,outside);f.advance(173);
  assert.ok(f.hits.some(([,id])=>id==='late'));assert.ok(!f.hits.some(([,id])=>id==='outside'));
  assert.ok(!f.particles.some(([,id])=>id==='hakkai:warning_marker'));
  const other=fixture(profile);other.p.dimension={id:'other'};other.advance(173);assert.deepEqual(other.hits,[]);
  const delayed=fixture(profile);delayed.tick(170);delayed.advance(180);assert.deepEqual(delayed.hits,[]);
 });
}
