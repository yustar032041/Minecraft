// This verifies an explicit deterministic equipment/health budget, not real
// Bedrock damage, survival reachability of arbitrary vanilla items, or victory.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const raw=execFileSync(process.execPath,['--no-warnings','--experimental-default-type=module','--experimental-loader','./tests/minecraft_stub_loader.mjs','tools/audit_battle_balance.mjs','--json'],{encoding:'utf8'});
const audit=JSON.parse(raw);
function ids(tree){return [tree.id,...(tree.children??[]).flatMap(ids)];}
test('visited-realm-only baseline enumerates craftable melee and full normal armor from actual recipes',()=>{
 assert.deepEqual(audit.equipmentAudit,{ordinaryGear:141,normalArmorPieces:44,allRealmShardAttributes:20});
 assert.deepEqual(audit.stages.map(s=>s.weapon.damage),[15,15,17,30,30,30,30,31]);
 assert.deepEqual(audit.stages.map(s=>s.guardian.hp),[800,850,900,1200,1300,1400,1500,1600]);
 for(const s of audit.stages){
  assert.ok(s.guardian.hitsAtCatalogDamage>=40&&s.guardian.hitsAtCatalogDamage<=60,`realm ${s.realm}`);
  assert.ok(s.armor?.ids.length===4);assert.ok(s.armor.protection>=20);
  for(const tree of [s.weapon.tree,...s.armor.trees]){
   assert.ok(!ids(tree).some(x=>/warden_core|eclipse_core|guardian_core/.test(x)));
   for(const attr of ids(tree).map(x=>/^hakkai:shard_(\d+)$/.exec(x)).filter(Boolean))assert.ok(s.attributes.includes(Number(attr[1])));
  }
 }
 assert.equal(audit.allRealmsBeforeAnyBoss.damage,31);
 for(const s of audit.stages)assert.ok(Math.ceil(s.guardian.hp/audit.allRealmsBeforeAnyBoss.damage)>=25);
});
test('chief, king and warden budgets include recovery and independent attack paths',()=>{
 const {chief,king,warden}=audit.bosses;
 assert.equal(chief.hp,1000);assert.equal(chief.hits,33);assert.equal(king.hp,1800);assert.equal(king.rewindHeals,145);
 assert.equal(warden.hp,5000);assert.equal(warden.healingPerSecond,8);
 const maxima=warden.patternTotals.map(p=>p.max);
 for(const [i,want] of [36,45,54,54.6,56].entries())assert.ok(Math.abs(maxima[i]-want)<1e-6);
 assert.equal(warden.bladeDamage.length,8);assert.ok(warden.overlapEnvelope>2*warden.patternTotals[4].max);
 assert.ok(warden.hypotheticalWardenTimes.every(t=>t.netDps>0&&Number.isFinite(t.seconds)));
 assert.ok(warden.hypotheticalWardenTimes[0].seconds>warden.hypotheticalWardenTimes[1].seconds);
 assert.match(audit.assumptions,/not DPS or victory odds/);
});
test('final reward is separated from example pre-warden equipment',()=>{
 assert.equal(audit.afterGuardians.exampleChest,'gear_213');assert.equal(audit.afterGuardians.notUniversalBest,true);
 assert.equal(audit.afterGuardians.postWardenArmor.length,7);
 assert.ok(!ids(audit.allRealmsBeforeAnyBoss.recipeTree).includes('hakkai:warden_core'));
});
