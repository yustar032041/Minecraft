import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
test('combat inventory stays synchronized and explicitly does not claim runtime verification',()=>{
 const result=execFileSync(process.execPath,['--experimental-default-type=module','tools/audit_mob_combat.mjs','--check'],{encoding:'utf8'});assert.match(result,/143 entities/);
 const text=fs.readFileSync('追加MOB攻撃演出の棚卸し.md','utf8');assert.equal(text.split('\n').filter(x=>x.startsWith('| hakkai:')).length,143);
 for(const id of ['hakkai:time_warden','hakkai:eclipse_colossus','hakkai:fushi','hakkai:fushi_chief','hakkai:guardian_7','hakkai:ender_7','hakkai:village_watch','hakkai:village_mage','hakkai:village_archer','hakkai:foe_7_11','hakkai:wild_7_2'])assert.ok(text.includes(`| ${id} |`),id);
 assert.match(text,/実機未検証/);assert.match(text,/画像そのものを個別確認/);
});

test('anatomy motion sources and all client aliases are reproducible',()=>{
 for(const file of ['tools/sync_mob_anatomy.mjs','tools/sync_talent_attack_visuals.mjs','tools/sync_guardian_attack_visuals.mjs']){
  assert.match(execFileSync(process.execPath,['--experimental-default-type=module',file,'--check'],{encoding:'utf8'}),/104|Eight/);
 }
 assert.match(execFileSync('python3',['tools/build_mob_anatomy_animations.py','--check'],{encoding:'utf8'}),/24/);
});
