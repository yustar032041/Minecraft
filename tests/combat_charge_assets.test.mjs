import assert from 'node:assert/strict';import fs from 'node:fs';
import {catalog} from '../Hakkai_v7.1.0/BehaviorPack/scripts/data.js';
let n=0;for(const g of catalog){
 const path=`Hakkai_v7.1.0/BehaviorPack/items/${g.id}.json`,components=JSON.parse(fs.readFileSync(path,'utf8'))['minecraft:item'].components;
 if(['剣','斧','槍'].includes(g.kind)){assert.equal(components['minecraft:use_modifiers'].use_duration,15,g.id);n++;}
 else if(g.kind!=='弓')assert.equal(components['minecraft:use_modifiers'].use_duration,1.2,g.id);
}
assert.equal(n,35);console.log('All 35 melee weapons have release window; other use timings preserved (static)');
