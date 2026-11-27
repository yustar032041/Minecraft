// Mock-only tests: distinct normal-guardian wave speeds and unchanged king shadows.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GUARDIAN_WAVE_SPEEDS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_boss.js';
import {fixture} from './guardian_wave_fixture.mjs';

test('eight realm guardians launch at their individual rates, without changing king shadows',()=>{
 assert.equal(GUARDIAN_WAVE_SPEEDS.length,8);
 assert.equal(new Set(GUARDIAN_WAVE_SPEEDS).size,8);
 for(let i=0;i<8;i++)for(const special of [false,true]){
  const f=fixture({realm:i,special});f.primary.location.x=4;f.advance(71);
  const first=f.particles.filter(([t,id])=>t===71&&id.startsWith('hakkai:shot_'));
  assert.ok(first.length,`${i}/${special} visible first wave`);
  for(const [,id,p] of first){
   assert.ok(Math.abs(Math.hypot(p.x,p.z)-(special?.65:GUARDIAN_WAVE_SPEEDS[i]))<1e-8,`${id} ${i}/${special}`);
  }
 }
});
