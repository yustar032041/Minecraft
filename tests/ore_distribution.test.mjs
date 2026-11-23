import assert from 'node:assert/strict';
import fs from 'node:fs';
import { realmOres, oreColumn } from '../Hakkai_v7.1.0/BehaviorPack/scripts/ore_distribution.js';

const bp = 'Hakkai_v7.1.0/BehaviorPack';
assert.deepEqual(realmOres.flat().sort((a,b)=>a-b), Array.from({length:20},(_,i)=>i));
for (const id of realmOres.flat()) {
 const block = JSON.parse(fs.readFileSync(`${bp}/blocks/ore_${id}.json`));
 const path = block['minecraft:block'].components['minecraft:loot'];
 const loot = JSON.parse(fs.readFileSync(`${bp}/${path}`));
 assert.equal(loot.pools[0].entries[0].name, `hakkai:crystal_${id}`);
 assert.ok(fs.existsSync(`${bp}/items/crystal_${id}.json`));
}
function hash(x,z,r,salt=0) {
 let h=(2166136261 ^ Math.imul(x,0x9e3779b1) ^ Math.imul(z,0x85ebca6b) ^ Math.imul(r+1,0xc2b2ae35) ^ salt)>>>0;
 h=Math.imul(h^(h>>>16),0x7feb352d)>>>0;
 h=Math.imul(h^(h>>>15),0x846ca68b)>>>0;
 return ((h^(h>>>16))>>>0)/4294967295;
}
for (let r=0;r<8;r++) {
 const seen=new Set(); let count=0;
 for(let x=-128;x<128;x++) for(let z=-128;z<128;z++) {
  const bottom=r===6?95:70, top=100;
  const ore=oreColumn(r,x,z,top,bottom,hash);
  if (!ore) continue;
  assert.deepEqual(ore,oreColumn(r,x,z,top,bottom,hash));
  assert.ok(ore.lower>bottom && ore.upper<top-1 && ore.lower<=ore.upper);
  assert.ok(realmOres[r].includes(ore.id));
  seen.add(ore.id); count++;
 }
 assert.deepEqual([...seen].sort((a,b)=>a-b),[...realmOres[r]].sort((a,b)=>a-b));
 assert.ok(count>500 && count<2000, `unexpected density ${count}`);
}
assert.equal(oreColumn(8,0,0,100,70,hash),undefined);
console.log('Ore distribution, bounds, and all 20 loot paths OK');
