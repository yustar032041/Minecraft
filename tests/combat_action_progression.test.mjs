import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import {WARDEN_BLADES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/warden_blades.js';
import {ULTIMATE_WEAPONS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/ultimate_weapons.js';
import {isActionWeapon} from '../Hakkai_v7.1.0/BehaviorPack/scripts/combat_action.js';

test('69 action weapons use the same catalog damage stat as their item JSON',()=>{
 const entries=[...catalog,...WARDEN_BLADES,...ULTIMATE_WEAPONS].filter(isActionWeapon);
 assert.equal(entries.length,69);
 for(const g of entries){
  const item=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/items/${g.id}.json`,'utf8'));
  assert.equal(item['minecraft:item'].components['minecraft:damage'],g.damage,g.id);
  assert.ok(Number.isFinite(g.damage)&&g.damage>0&&g.damage<=40,g.id);
 }
 const byId=new Map(catalog.map(g=>[g.id,g]));
 for(const g of entries.filter(x=>x.prev&&byId.has(x.prev)))assert.ok(g.damage>byId.get(g.prev).damage,`${g.id} does not improve on ${g.prev}`);
});
