import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const start=source.indexOf('     if(isCreative(p)){s.s=max;s.m=max;}else{',source.indexOf('const guarding=shieldStance'));
const end=source.indexOf('\n     // The trial dimension',start);
assert.ok(start>=0&&end>start);
const code=source.slice(start,end);
function run(p={},guarding=false,creative=false,campResting=false){
 const ctx={p:{isSprinting:false,isSwimming:false,...p},s:{s:50,m:50,campResting},max:100,guarding,isCreative:()=>creative,hasUltimateArmor:()=>false,ultimateRegen:n=>n,bounds:(n,min,max)=>Math.max(min,Math.min(max,n))};
 vm.runInNewContext(code,ctx);return ctx.s;
}
assert.equal(run({isSprinting:true}).s,52.5,'normal sprint regenerates instead of spending');
assert.equal(run().s,52.5);
assert.equal(run({isSprinting:true,isSwimming:true}).s,48.6,'swimming still spends stamina');
assert.equal(run({},true).s,50,'guarding suppresses regeneration');
assert.equal(run({},false,false,true).s,54.5,'camp recovery is preserved');
assert.equal(run({},false,true).s,100,'creative retains maximum');
console.log('Actual recovery loop: sprint, swimming, guard and camp (mocked)');
