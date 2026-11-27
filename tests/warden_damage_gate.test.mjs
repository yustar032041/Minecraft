import {test} from 'node:test';import assert from 'node:assert/strict';
import {createWardenDamageGate} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_damage_gate.js';
import {readFileSync} from 'node:fs';
test('late-form damage gate isolates boss/player, expires, and ignores early forms',()=>{
 const g=createWardenDamageGate(),a={id:'a'},b={id:'b'},p={id:'p'},q={id:'q'};
 g.record(a,p,2,10);assert.equal(g.allows(a,p,4,11),true);
 g.record(a,p,3,10);assert.equal(g.allows(a,p,3,17),false);assert.equal(g.allows(a,p,3,18),true);
 assert.equal(g.allows(a,q,4,11),true);assert.equal(g.allows(b,p,4,11),true);assert.equal(g.allows(a,p,2,11),true);
 g.clear('a');assert.equal(g.allows(a,p,4,11),true);
});
test('boss, blades and special modes actually share the gate',()=>{
 const root='Hakkai_v7.1.0/BehaviorPack/scripts/';
 for(const file of ['warden_boss.js','warden_swords.js','warden_modes.js']){
  const s=readFileSync(root+file,'utf8');assert.match(s,/damageGate\.allows/);assert.match(s,/damageGate(?:\?\.)?\.?(?:record)/);
 }
 const s=readFileSync(root+'warden_boss.js','utf8');assert.match(s,/setupWardenSwords\(\{[^\n]*damageGate/);assert.match(s,/setupWardenModes\(\{[^\n]*damageGate/);
});
