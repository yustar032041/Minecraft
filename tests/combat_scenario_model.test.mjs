import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('hypothetical combat scenarios include all realms, mode alternatives and overlap sensitivity',()=>{
 const x=JSON.parse(execFileSync(process.execPath,['--no-warnings','--experimental-default-type=module','--experimental-loader','./tests/minecraft_stub_loader.mjs','tools/model_combat_scenarios.mjs'],{encoding:'utf8'}));
 assert.equal(x.guardians.length,8);
 for(const [i,g] of x.guardians.entries()){
  assert.equal(g.realm,i+1);assert.equal(g.scenarios.length,4);
  const ready=g.scenarios.find(s=>s.name==='careful and stocked');assert.equal(ready.result,'win',`realm ${g.realm}`);
  for(const s of g.scenarios){assert.ok(['win','defeat','timeout'].includes(s.result));assert.ok(s.seconds>0);}
 }
 assert.deepEqual(x.otherBosses.map(s=>s.name),['chief careful','chief careless','king careful','king pressured']);
 assert.equal(x.otherBosses[0].result,'win');assert.equal(x.otherBosses[2].result,'win');
 assert.equal(x.warden.length,16);
 for(const p of ['exceptional avoidance','careful','pressured','poor avoidance'])for(const mode of ['traditional','special'])for(const coalesce of [true,false])assert.ok(x.warden.some(s=>s.name===p&&s.mode===mode&&s.coalesce===coalesce));
 assert.match(x.assumptions,/not actual immunity/);assert.match(x.assumptions,/not victory probabilities/);
});
