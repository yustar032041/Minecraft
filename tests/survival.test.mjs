import assert from 'node:assert/strict';
import fs from 'node:fs';
import { wildlife, places } from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
import { mobContent } from '../Hakkai_v7.1.0/BehaviorPack/scripts/mob_content.js';
import { pickRealmWildlife } from '../Hakkai_v7.1.0/BehaviorPack/scripts/wildlife_selection.js';
import { insideWarning } from '../Hakkai_v7.1.0/BehaviorPack/scripts/attack_warning.js';
import { nearestQueuedDistance } from '../Hakkai_v7.1.0/BehaviorPack/scripts/terrain_queue.js';

for(let realm=0;realm<8;realm++) {
 const members=wildlife.filter(m=>m.dim===realm);
 assert.equal(members.length,15);
 // 各種に確率が残ること、および未観察種を選択できることを確認。
 for(let i=0;i<members.length;i++) {
  const m=pickRealmWildlife(wildlife,realm,()=>false,false,()=> (i+.1)/members.length);
  assert.equal(m.id,members[i].id);
  const only=pickRealmWildlife(wildlife,realm,m=>m.id!==members[i].id,false,()=>0);
  assert.equal(only.id,members[i].id);
 }
 const peaceful=pickRealmWildlife(wildlife,realm,()=>false,true,()=>0);
 assert.ok(peaceful && peaceful.temper!=='hostile');
}
assert.equal(pickRealmWildlife(wildlife,99,()=>false,false),undefined);
for (const m of wildlife) {
 const bp='Hakkai_v7.1.0/BehaviorPack', rp='Hakkai_v7.1.0/ResourcePack';
 const content=mobContent.get(`hakkai:${m.id}`);
 assert.ok(content, `missing creature metadata ${m.id}`);
 const entity=JSON.parse(fs.readFileSync(`${bp}/entities/${m.id}.json`))['minecraft:entity'];
 const loot=JSON.parse(fs.readFileSync(`${bp}/${entity.components['minecraft:loot'].table}`));
 assert.ok(loot.pools.some(pool=>pool.entries.some(entry=>entry.name===content.dropId)),`missing drop ${m.id}`);
 assert.ok(fs.existsSync(`${bp}/items/${content.dropId.split(':')[1]}.json`));
 assert.ok(fs.existsSync(`${rp}/entity/${m.id}.entity.json`));
}
for (const site of places.filter(s=>s.id>=9&&s.id<=48))
 assert.ok(fs.existsSync(`Hakkai_v7.1.0/BehaviorPack/structures/hakkai/site_${site.id}.mcstructure`));
const aim={x:-2,y:88,z:4};
assert.equal(insideWarning({x:-2,y:88,z:4},aim,2),true);
assert.equal(insideWarning({x:0,y:88,z:4},aim,2),true);
assert.equal(insideWarning({x:.1,y:88,z:4},aim,2),false);
assert.equal(insideWarning({x:-2,y:92,z:4},aim,2),false);
const players=[{realm:0,cx:0,cz:0},{realm:1,cx:100,cz:100}];
assert.equal(nearestQueuedDistance({realm:0,cx:2,cz:3},players,6),13);
assert.equal(nearestQueuedDistance({realm:1,cx:101,cz:101},players,6),2);
assert.equal(nearestQueuedDistance({realm:0,cx:100,cz:100},players,6),Infinity);
assert.equal(nearestQueuedDistance({realm:0,cx:2,cz:3},[],6),Infinity);
for (const name of [...Array.from({length:8},(_,i)=>`guardian_${i}`),'eclipse_colossus']) {
 const entity=JSON.parse(fs.readFileSync(`Hakkai_v7.1.0/BehaviorPack/entities/${name}.json`))['minecraft:entity'];
 assert.equal(entity.components['minecraft:knockback_resistance'].value,1);
 assert.deepEqual(entity.components['minecraft:pushable'],{is_pushable:false,is_pushable_by_piston:false});
}
console.log('Wildlife selection, multiplayer queue, and boss component checks OK');
