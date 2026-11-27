// Current moving guardian waves: impact origin, height and boundary checks.
// Mock scheduler and rays; not proof of live rendering or multiplayer behavior.
import assert from 'node:assert/strict';
import {fixture} from './guardian_wave_fixture.mjs';
import {GUARDIAN_REALM_ATTACKS,KING_GUARDIAN_REALM_ATTACKS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_attacks.js';
for(let realm=0;realm<8;realm++)for(const special of [false,true]){
 const f=fixture({realm,special});f.primary.location.x=1;f.advance(30);
 // Position at launch, not at the start of the windup.
 f.guardian.location.x=5;
 const shape=(special?KING_GUARDIAN_REALM_ATTACKS:GUARDIAN_REALM_ATTACKS)[realm][0].shape;
 const a=shape==='side'?Math.PI/2:['double','diagonal'].includes(shape)?Math.PI/4:0,x=5+Math.cos(a),z=Math.sin(a);
 f.primary.location.x=x;f.primary.location.z=z;
 const upper=f.make('upper',x,81.5,z),lower=f.make('lower',x,78.5,z),outside=f.make('outside',x,81.501,z);
 f.players.push(upper,lower,outside);f.advance(75);
 assert.deepEqual(f.hits.map(([,id])=>id).sort(),['lower','primary','upper'],`${realm}/${special}`);
 const wave=f.particles.filter(([t,id])=>t>70&&id.startsWith('hakkai:shot_'));
 assert.ok(wave.length);assert.ok(wave.every(([,id,p])=>p.x>=5-3.5-1e-6));
 assert.ok(!f.particles.some(([,id])=>id==='hakkai:warning_marker'));
}
console.log('Guardian waves start at the actual source and enforce vertical bounds (mocked)');
