import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {MACHINE_RECIPES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/machine_recipe_guide.js';
const dir='Hakkai_v7.1.0/BehaviorPack/items/';
test('all guide recipe custom item IDs exist in the pack',()=>{
 const ids=new Set(fs.readdirSync(dir).filter(x=>x.endsWith('.json')).map(x=>JSON.parse(fs.readFileSync(dir+x,'utf8'))['minecraft:item'].description.identifier));
 const blocks='Hakkai_v7.1.0/BehaviorPack/blocks/';for(const f of fs.readdirSync(blocks).filter(x=>x.endsWith('.json')))ids.add(JSON.parse(fs.readFileSync(blocks+f,'utf8'))['minecraft:block'].description.identifier);
 for(const r of MACHINE_RECIPES)for(const id of [r.out,...r.costs.map(c=>c.id),...(r.block?[r.block]:[])])if(id.startsWith('hakkai:'))assert.ok(ids.has(id),`${r.kind}: ${id}`);
});
