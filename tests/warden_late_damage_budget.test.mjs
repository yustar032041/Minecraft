import {test} from 'node:test';
import assert from 'node:assert/strict';
import {wardenPatterns,wardenAttackDamage} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {wardenModeDamage} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_modes.js';
import {wardenBladeScale} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_swords.js';
const total=(a,p)=>wardenAttackDamage(a,false,p)*(a.strikes??1);
test('late patterns are individually no weaker than their corresponding earlier form, with lower peaks',()=>{
 const forms=Array.from({length:5},(_,p)=>wardenPatterns(p));
 assert.deepEqual(forms.map(x=>x.length),[42,42,42,42,210]);
 for(let i=0;i<42;i++){
  assert.ok(total(forms[3][i],3)+1e-8>=total(forms[2][i],2),`fourth index ${i}`);
  for(let source=0;source<5;source++)assert.ok(total(forms[4][i*5+source],4)+1e-8>=total(forms[3][i],3),`final index ${i} source ${source}`);
 }
 const values=forms.map((a,p)=>a.map(x=>total(x,p)));
 const averages=values.map(a=>a.reduce((x,y)=>x+y,0)/a.length);
 assert.ok(averages.every((v,i)=>i===0||v>averages[i-1]));
 assert.ok(Math.max(...values[3])<=55&&Math.max(...values[4])<=56);
 assert.ok(Math.max(...values[3])<63&&Math.max(...values[4])<72);
 for(const p of [3,4])for(const a of forms[p])assert.equal(wardenAttackDamage(a,true,p),wardenAttackDamage(a,false,p)/2);
});
test('fourth/final special attacks are reduced while their shared moves increase in the final form',()=>{
 assert.equal(wardenModeDamage('lightning',1),33);
 assert.equal(wardenModeDamage('lightning',4),24);assert.equal(wardenModeDamage('fire',4),20);
 for(const kind of ['slash','combo'])assert.ok(wardenModeDamage(kind,4)>wardenModeDamage(kind,3));
 assert.ok(wardenBladeScale(3)<wardenBladeScale(4)&&wardenBladeScale(4)<wardenBladeScale(2));
});
