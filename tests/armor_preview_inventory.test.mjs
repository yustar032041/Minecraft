// Validate review coverage against the actual set definitions. The images are
// approximate static mannequins and cannot substitute for Bedrock rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GUARDIAN_ARMOR_SETS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guardian_armor_set.js';
import {ENDGAME_ARMOR_SETS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/endgame_armor_set.js';
const bp='Hakkai_v7.1.0/BehaviorPack',folder='art_sources/armor_wear_previews/all_sets';
const rows=JSON.parse(fs.readFileSync(`${folder}/index.json`,'utf8'));
const namespace=id=>id.replace(/^hakkai:/,'');

test('40 review combinations match real set definitions and cover every wearable',()=>{
 const src=fs.readFileSync(`${bp}/scripts/main.js`,'utf8'),start=src.indexOf('const armorSetDefs=['),end=src.indexOf('const armorSetBonusDefs=',start);assert.ok(start>=0&&end>start);
 const ctx={};vm.createContext(ctx);vm.runInContext(src.slice(start,end)+';this.sets=armorSetDefs;',ctx);
 const expected=[];
 for(const [i,def] of ctx.sets.entries())expected.push({label:`series ${String(i).padStart(2,'0')}`,items:[def[2],def[1],def[4],def[3]]});
 for(const def of GUARDIAN_ARMOR_SETS)for(const [i,stage] of ['awaken','ascended','legacy'].entries())expected.push({label:`guardian ${def.index} / ${stage}`,items:[def.companions[0],namespace(def.chests[i]),def.companions[1],def.companions[2]]});
 for(const def of ENDGAME_ARMOR_SETS)for(const id of def.chests)expected.push({label:`${def.key} / ${namespace(id)}`,items:[`${def.key}_armor_helmet`,namespace(id),`${def.key}_armor_leggings`,`${def.key}_armor_boots`]});
 expected.push({label:'ultimate',items:['ult_helmet','ult_chest','ult_leggings','ult_boots']});
 // Values created in the VM have a different realm's Array prototype.
 assert.deepEqual(rows,JSON.parse(JSON.stringify(expected)));
 const wearable=new Map();for(const file of fs.readdirSync(`${bp}/items`))if(file.endsWith('.json')){
  const entry=JSON.parse(fs.readFileSync(`${bp}/items/${file}`,'utf8'))['minecraft:item'];
  const slot=entry.components?.['minecraft:wearable']?.slot;
  if(slot)wearable.set(namespace(entry.description.identifier),slot);
 }
 const seen=new Set();for(const {items} of rows)for(const [i,id] of items.entries()){
  assert.equal(wearable.get(id),['slot.armor.head','slot.armor.chest','slot.armor.legs','slot.armor.feet'][i],id);seen.add(id);
 }
 assert.equal(wearable.size,106);assert.equal(seen.size,106);assert.deepEqual([...seen].sort(),[...wearable.keys()].sort());
 for(let i=1;i<=5;i++)assert.ok(fs.existsSync(`${folder}/armor_sets_${String(i).padStart(2,'0')}.png`));
});
