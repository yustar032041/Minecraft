import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
test('appearance inventory covers all creatures without claiming visual quality',()=>{
 const out=execFileSync(process.execPath,['--experimental-default-type=module','tools/audit_mob_appearance.mjs','--check'],{encoding:'utf8'});
 assert.match(out,/143 entities; 140 review candidates; 3 protected/);
 const rows=fs.readFileSync('追加MOB見た目の棚卸し.md','utf8').split('\n').filter(s=>s.startsWith('| hakkai:'));
 assert.equal(rows.length,143);
 for(const id of ['hakkai:time_warden','hakkai:fushi','hakkai:fushi_chief'])assert.match(rows.find(s=>s.startsWith(`| ${id} |`)),/保護（変更しない）/);
 for(const id of ['hakkai:eclipse_colossus','hakkai:guardian_0','hakkai:ender_0','hakkai:foe_0_0','hakkai:wild_0_0','hakkai:village_archer'])assert.match(rows.find(s=>s.startsWith(`| ${id} |`)),/要現物確認/);
 for(const id of ['hakkai:time_train','hakkai:shore_ferry','hakkai:kinetic_visual'])assert.ok(!rows.some(s=>s.startsWith(`| ${id} |`)));
 assert.match(rows.find(s=>s.startsWith('| hakkai:time_warden |')),/form0:.*form4:/);
});
