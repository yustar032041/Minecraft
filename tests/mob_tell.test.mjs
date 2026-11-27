// Unit tests for the cosmetic source flash; no Bedrock rendering is simulated.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {talentTell} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_talent_effects.js';
import {mobContentList} from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';

function flash(profile,aim={x:10,y:80,z:0},style='forward'){
 const marks=[],entity={location:{x:0,y:80,z:0},dimension:{spawnParticle:(id,pos)=>marks.push({id,pos})}};
 talentTell(entity,profile,aim,style);return marks;
}
test('every hostile talent has a bounded source-centred flash, with realm palettes',()=>{
 for(const p of mobContentList.filter(p=>p.temper==='hostile')){
  const marks=flash(p);assert.equal(marks.length,8,p.id);
  for(const {id,pos} of marks){
   assert.match(id,/^hakkai:tell_(impact|spore|frost|spark|shadow|sand|wind|time|ward)$/);
   assert.ok(Math.hypot(pos.x,pos.z)<=1.21,p.id);assert.ok(pos.y>80&&pos.y<82,p.id);
  }
 }
 assert.deepEqual(Array.from({length:8},(_,realm)=>flash({talent:'burst',realm})[0].id),
 ['hakkai:tell_wind','hakkai:tell_spore','hakkai:tell_sand','hakkai:tell_frost','hakkai:tell_spark','hakkai:tell_shadow','hakkai:tell_wind','hakkai:tell_time']);
});
test('forward points toward the snapshotted aim, radial is distinct and zero heading remains finite',()=>{
 const p={talent:'charge'},forward=flash(p),radial=flash(p,undefined,'radial');
 assert.ok(forward[7].pos.x>1);assert.ok(Math.abs(forward[7].pos.z)<1e-9);
 assert.notDeepEqual(forward.map(m=>m.pos),radial.map(m=>m.pos));
 assert.ok(flash(p,{x:0,y:80,z:0}).every(m=>Object.values(m.pos).every(Number.isFinite)));
});
test('invalid inputs and individual particle errors never throw',()=>{
 assert.deepEqual(flash({talent:'unknown'}),[]);
 assert.deepEqual(flash({talent:'charge'},{x:NaN,y:80,z:0}),[]);
 let attempts=0;const e={location:{x:0,y:80,z:0},dimension:{spawnParticle(){attempts++;throw Error('particle unavailable');}}};
 assert.doesNotThrow(()=>talentTell(e,{talent:'charge'},{x:1,y:80,z:0}));assert.equal(attempts,8);
 assert.doesNotThrow(()=>talentTell(null,{talent:'charge'},{x:1,y:80,z:0}));
});
