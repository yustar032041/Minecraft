// Deterministic, reproducible design audit, not a Bedrock combat simulation.
// Assumptions: vanilla ingredients are obtainable in unlimited quantities;
// attribute shards are obtainable only from visited realms; no boss rewards,
// player buffs, enchantments, damage resistance, or cooldown are modeled.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {catalog,home} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {GUARDIAN_TECHNIQUES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_boss.js';
import {REALM_GUARDIAN_MULTIPLIERS,scaledRealmDamage} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_balance.js';
import {wardenPatterns,wardenAttackDamage,WARDEN_HEAL_PER_SECOND} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_boss.js';
import {WARDEN_MODE_DAMAGE} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_modes.js';
import {WARDEN_BLADE_DAMAGE,WARDEN_BLADE_PULSE_DAMAGE} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_swords.js';
import {CHIEF_ATTACKS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/fushi_system.js';
const bp='Hakkai_v7.1.0/BehaviorPack', read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const recipes=new Map();
for(const file of fs.readdirSync(`${bp}/recipes`).filter(n=>n.endsWith('.json'))){
 const raw=read(`${bp}/recipes/${file}`);
 for(const kind of ['shaped','shapeless']){
  const r=raw[`minecraft:recipe_${kind}`];if(!r?.tags?.includes('crafting_table'))continue;
  const result=typeof r.result==='string'?r.result:r.result?.item;
  const list=kind==='shapeless'?r.ingredients:r.pattern.flatMap(row=>[...row].filter(ch=>ch!==' ').map(ch=>r.key[ch]));
  const ingredients=list.map(x=>typeof x==='string'?x:x?.item);
  if(!result||ingredients.some(x=>!x))continue;
  if(!recipes.has(result))recipes.set(result,[]);recipes.get(result).push({file,ingredients});
 }
}
// Returns a concrete recipe tree, not just a direct ingredient check. Unknown
// scripted/loot sources are deliberately unavailable except realm shards.
function craftTree(id,attributes,ancestors=new Set()){
 if(id.startsWith('minecraft:'))return {id,assumed:'vanilla'};
 const m=/^hakkai:shard_(\d+)$/.exec(id);
 if(m)return attributes.has(Number(m[1]))?{id,assumed:'visited-realm drop'}:undefined;
 if(ancestors.has(id))return;
 const next=new Set(ancestors);next.add(id);
 for(const r of recipes.get(id)??[]){
  const children=r.ingredients.map(ingredient=>craftTree(ingredient,attributes,next));
  if(children.every(Boolean))return {id,recipe:r.file,children};
 }
}
function allIds(tree){return [tree.id,...(tree.children??[]).flatMap(allIds)];}
function component(id){return read(`${bp}/items/${id}.json`)['minecraft:item'].components;}
const weaponKinds=new Set(['剣','斧','槍']);
const allCraftKinds=new Set(['剣','斧','弓','杖','ハンマー','槍','盾','扇','指輪','首飾り','本','石']);
const armorMain=fs.readFileSync(`${bp}/scripts/main.js`,'utf8');
const block=armorMain.slice(armorMain.indexOf('const armorSetDefs='),armorMain.indexOf('const armorSetBonusDefs='));
const ctx={};vm.createContext(ctx);vm.runInContext(block+'\nthis.sets=armorSetDefs;',ctx);
assert.equal(ctx.sets.length,11);
const stages=[];
for(let realm=0;realm<8;realm++){
 const attributes=new Set(home.slice(0,realm+1).flat());
 const possible=catalog.filter(g=>weaponKinds.has(g.kind)&&craftTree(`hakkai:${g.id}`,attributes));
 possible.sort((a,b)=>b.damage-a.damage||a.id.localeCompare(b.id));
 const best=possible[0];assert.ok(best);const tree=craftTree(`hakkai:${best.id}`,attributes);
 for(const g of possible){assert.equal(component(g.id)['minecraft:damage'],g.damage,g.id);assert.ok(!allIds(craftTree(`hakkai:${g.id}`,attributes)).includes('hakkai:warden_core'));}
 const sets=ctx.sets.map(([name,...ids])=>({name,ids,trees:ids.map(id=>craftTree(`hakkai:${id}`,attributes))})).filter(s=>s.trees.every(Boolean));
 for(const s of sets)s.protection=s.ids.reduce((sum,id)=>sum+component(id)['minecraft:wearable'].protection,0);
 sets.sort((a,b)=>b.protection-a.protection||a.name.localeCompare(b.name));
 const guardian=read(`${bp}/entities/guardian_${realm}.json`)['minecraft:entity'].components;
 const raw=GUARDIAN_TECHNIQUES.map(a=>scaledRealmDamage(a.damage,realm,REALM_GUARDIAN_MULTIPLIERS));
 stages.push({realm:realm+1,attributes:[...attributes].sort((a,b)=>a-b),weapon:{id:best.id,name:best.name,damage:best.damage,tree},armor:sets[0]??null,guardian:{hp:guardian['minecraft:health'].value,melee:guardian['minecraft:attack'].damage,techniques:raw,hitsAtCatalogDamage:Math.ceil(guardian['minecraft:health'].value/best.damage)}});
}
const allAttributes=new Set(home.flat());assert.equal(allAttributes.size,20);
const allCraftGear=catalog.filter(g=>allCraftKinds.has(g.kind));assert.equal(allCraftGear.length,141);
for(const g of allCraftGear){
 const tree=craftTree(`hakkai:${g.id}`,allAttributes);assert.ok(tree,`no shard/vanilla crafting tree for ${g.id}`);
 assert.ok(!allIds(tree).some(id=>/guardian_core|eclipse_core|warden_core/.test(id)));
 assert.equal(component(g.id)['minecraft:damage'],g.damage,g.id);
}
for(const [, ...ids] of ctx.sets)for(const id of ids){
 const tree=craftTree(`hakkai:${id}`,allAttributes);assert.ok(tree,`no ordinary armor crafting tree for ${id}`);
 assert.ok(!allIds(tree).some(x=>/guardian_core|eclipse_core|warden_core/.test(x)));
}
const allMelee=allCraftGear.filter(g=>weaponKinds.has(g.kind)).sort((a,b)=>b.damage-a.damage||a.id.localeCompare(b.id));
const maximum=allMelee[0];assert.ok(maximum);assert.equal(maximum.damage,31);
for(let i=1;i<8;i++){assert.ok(stages[i].guardian.hp>stages[i-1].guardian.hp);assert.ok(stages[i].weapon.damage>=stages[i-1].weapon.damage);}
const chief=read(`${bp}/entities/fushi_chief.json`)['minecraft:entity'].components['minecraft:health'].value;
const king=read(`${bp}/entities/eclipse_colossus.json`)['minecraft:entity'].components['minecraft:health'].value;
const warden=read(`${bp}/entities/time_warden.json`)['minecraft:entity'].components['minecraft:health'].value;
const patternTotals=Array.from({length:5},(_,phase)=>{
 const attacks=wardenPatterns(phase).map(a=>({name:a.attack,perStrike:wardenAttackDamage(a,false,phase),strikes:a.strikes??1,total:wardenAttackDamage(a,false,phase)*(a.strikes??1)}));
 return {phase:phase+1,count:attacks.length,min:Math.min(...attacks.map(x=>x.total)),max:Math.max(...attacks.map(x=>x.total))};
});
// Pure upper envelope, not a claim that these independent paths can all hit at
// exactly the same instant: two warned slots, eight thrusts, two pulses, and
// one mode strike. Player immunity, armor/effects and timing are not simulated.
const overlapEnvelope=2*patternTotals[4].max+WARDEN_BLADE_DAMAGE.reduce((a,b)=>a+b,0)+Object.values(WARDEN_BLADE_PULSE_DAMAGE).reduce((a,b)=>a+b,0)+Math.max(...Object.values(WARDEN_MODE_DAMAGE));
const hypotheticalWardenTimes=[.5,1,2].map(landedHitsPerSecond=>{
 const grossDps=maximum.damage*landedHitsPerSecond,netDps=grossDps-WARDEN_HEAL_PER_SECOND;
 return {landedHitsPerSecond,grossDps,netDps,seconds:netDps>0?warden/netDps:null};
});
const ultimate=['ult_helmet','ult_chest','ult_leggings','ult_boots','ult_sword','ult_axe','ult_pickaxe'];
for(const id of ultimate){
 const options=recipes.get(`hakkai:${id}`);assert.ok(options?.length,id);
 assert.ok(options.every(r=>r.ingredients.includes('hakkai:warden_core')),`${id}: first-kill reward required`);
 assert.equal(craftTree(`hakkai:${id}`,allAttributes),undefined);
}
// Explicit scripted forge, rather than silently inventing a recipe for it.
const forge=armorMain.slice(armorMain.indexOf('async function guardianLegacyForge('),armorMain.indexOf('function applyGuardianLegacyEffects('));
const awaken=armorMain.slice(armorMain.indexOf('async function finalAwakeningTrial('),armorMain.indexOf('async function guardianCoreArchive('));
const ascension=armorMain.slice(armorMain.indexOf('const realmAscendedGear=['),armorMain.indexOf('function applyRealmAwakenedEffects('));
const awakening=armorMain.slice(armorMain.indexOf('const realmAwakenedGear=['),armorMain.indexOf('function applyRealmAwakenedVisual('));
const legacyDefs=armorMain.slice(armorMain.indexOf('const guardianLegacyGear=['),armorMain.indexOf('async function guardianLegacyForge('));
const gearCtx={};vm.createContext(gearCtx);
vm.runInContext(legacyDefs+ascension.slice(0,ascension.indexOf('async function'))+awakening.slice(0,awakening.indexOf('async function'))+'\nthis.legacy=guardianLegacyGear;this.ascended=realmAscendedGear;this.awakened=realmAwakenedGear;',gearCtx);
for(let i=0;i<8;i++){
 assert.equal(gearCtx.awakened[i][2],`gear_${188+i}`);
 assert.equal(gearCtx.ascended[i][3],gearCtx.awakened[i][2]);
 assert.equal(gearCtx.legacy[i][3],gearCtx.ascended[i][2]);
 assert.equal(gearCtx.legacy[i][2],`gear_${204+i}`);
 assert.equal(gearCtx.legacy[i][4],`guardian_core_${i}`);
}
assert.match(forge,/gear_\$\{204\+i\}/);assert.match(forge,/ns\+'gear_212'/);
for(const token of ["guards&255",'realmRankIndex(p)<7',"ns+'gear_212'",'guardian_core_${i}',"'minecraft:emerald',128","'minecraft:netherite_ingot',1","ns+'gear_213'"])assert.ok(awaken.includes(token),token);
assert.ok(!/warden_core|eclipse_core/.test(forge+awaken+ascension+awakening));
assert.match(awakening,/num\(p,'guards',0\)/);assert.match(ascension,/ns\+prev/);
const summary={equipmentAudit:{ordinaryGear:allCraftGear.length,normalArmorPieces:ctx.sets.length*4,allRealmShardAttributes:allAttributes.size},assumptions:'Vanilla materials available; visited-realm shard sources; no boss drops, enchantment, potion or actual combat physics. HP/catalog attack is a hit-count proxy, not DPS or victory odds.',stages,allRealmsBeforeAnyBoss:{weapon:maximum.id,name:maximum.name,damage:maximum.damage,recipeTree:craftTree(`hakkai:${maximum.id}`,allAttributes)},afterGuardians:{exampleChest:'gear_213',notUniversalBest:true,needs:'eight guardian records and cores, rank 7, gear_212, 128 emeralds, netherite ingot',postWardenArmor:ultimate},bosses:{chief:{hp:chief,attacks:CHIEF_ATTACKS.map(a=>a.damage),hits:Math.ceil(chief/maximum.damage)},king:{hp:king,melee:9,skillMultiplier:3,rewindHeals:145,hitsIgnoringHealing:Math.ceil(king/maximum.damage)},warden:{hp:warden,healingPerSecond:WARDEN_HEAL_PER_SECOND,minimumGrossDpsToAdvance:WARDEN_HEAL_PER_SECOND,hitsIgnoringHealing:Math.ceil(warden/maximum.damage),patternTotals,overlapEnvelope,hypotheticalWardenTimes,modeDamage:WARDEN_MODE_DAMAGE,bladeDamage:WARDEN_BLADE_DAMAGE,bladePulseDamage:WARDEN_BLADE_PULSE_DAMAGE}}};
if(process.argv.includes('--json'))console.log(JSON.stringify(summary,null,2));
else {
 console.log('Realm | best craftable melee (visited-realms-only, no boss drops) | armor protection | guardian HP | hits proxy | warned damage');
 for(const s of stages)console.log(`${s.realm} | ${s.weapon.id} ${s.weapon.damage} | ${s.armor?.name??'none'} ${s.armor?.protection??0} | ${s.guardian.hp} | ${s.guardian.hitsAtCatalogDamage} | ${s.guardian.techniques.join('/')}`);
 console.log(`All realms explored before any boss: ${maximum.id} ${maximum.damage}; king ${king} HP; chief ${chief} HP; warden ${warden} HP, ${WARDEN_HEAL_PER_SECOND}/s regeneration.`);
 console.log(`${allCraftGear.length} ordinary weapons/tools and ${ctx.sets.length*4} armor pieces have recipe trees without boss cores under the stated assumptions.`);
 console.log('Ultimate recipes require warden core; scripted gear_213 route excludes warden/king cores. Static design model only.');
}
