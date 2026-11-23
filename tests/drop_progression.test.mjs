import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wildlife, home, biomes, families } from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import { mobContent } from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import { recycledAttribute } from '../Hakkai_v7.1.0/BehaviorPack/scripts/drop_recycling.js';
import { pickRealmWildlife } from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_selection.js';
const bp='Hakkai_v7.1.0/BehaviorPack';
const read=path=>JSON.parse(fs.readFileSync(`${bp}/${path}`,'utf8'));
const recipe=name=>read(`recipes/${name}.json`)['minecraft:recipe_shapeless'];
const attributes=new Set();
for (const m of wildlife) {
 const profile=mobContent.get(`hakkai:${m.id}`);
 assert.ok(profile, m.id);
 const attr=recycledAttribute(profile,home);
 assert.ok(home[m.dim].includes(attr),m.id);attributes.add(attr);
 const creature=read(`entities/${m.id}.json`)['minecraft:entity'];
 const table=read(creature.components['minecraft:loot'].table);
 const entries=table.pools.flatMap(p=>p.entries??[]);
 assert.ok(entries.some(e=>e.type==='item'&&e.name===profile.dropId),m.id+' missing loot');
 const salvage=recipe(`recycle_drop_${m.id}`);
 assert.deepEqual(salvage.ingredients,[{item:profile.dropId}],m.id);
 assert.deepEqual(salvage.result,{item:`hakkai:shard_${attr}`,count:2},m.id);
 const forge=recipe(`forge_crystal_${attr}`);
 assert.equal(forge.ingredients.filter(x=>x.item===`hakkai:shard_${attr}`).length,2);
 assert.ok(forge.ingredients.some(x=>x.item==='minecraft:amethyst_shard'));
 assert.deepEqual(forge.result,{item:`hakkai:crystal_${attr}`,count:1});
}
assert.equal(attributes.size,20);
for(let realm=0;realm<8;realm++)for(let i=0;i<12;i++){
 const biome=`hakkai:seed_${realm}_${String(i).padStart(2,'0')}`;
 const profile=families[biomes[biome]];
 assert.ok(profile,biome);
 for(const id of [profile.species,profile.rareSpecies]){
  const m=wildlife.find(x=>x.id===id);
  assert.ok(m && m.dim===realm,`${biome} points outside its realm: ${id}`);
 }
}
for(const m of wildlife){
 const entity=read(`entities/${m.id}.json`)['minecraft:entity'];
 assert.ok(entity.description.is_summonable, m.id);
 assert.ok(entity.events['hakkai:wild'], m.id+' missing spawn event');
 assert.ok(entity.components['minecraft:collision_box'].height<=2,m.id+' exceeds checked headroom');
}

assert.equal(recycledAttribute({id:'foe_2_1',realm:1},home),undefined);
assert.equal(recycledAttribute({id:'fake',realm:0},home),undefined);
// A successful series of encounters exhausts all eligible species before
// repeats; failed spawn attempts must not add to the caller's recorded set.
for(let realm=0;realm<8;realm++)for(const peaceful of [false,true]){
 const eligible=wildlife.filter(x=>x.dim===realm&&(!peaceful||x.temper!=='hostile'));
 const seen=new Set();
 for(let i=0;i<eligible.length;i++){
  const next=pickRealmWildlife(wildlife,realm,x=>seen.has(x.id),peaceful,()=>0);
  assert.ok(next&&!seen.has(next.id));seen.add(next.id);
 }
 assert.equal(seen.size,eligible.length);
 assert.ok(pickRealmWildlife(wildlife,realm,x=>seen.has(x.id),peaceful,()=>0));
}
console.log('120 creature loot → shard → crystal paths and realm encounter selection OK (static/pure checks)');
