import assert from 'node:assert/strict';
import {LINE_RECIPES,RECYCLE_DROPS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_line_recipes.js';
import {findLineRecipe,filteredDestination,recycleProduct} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_lines.js';
const inventory=items=>({size:items.length,getItem:i=>items[i]});
const total=(c,id)=>c.items?.filter(x=>x.typeId===id).reduce((n,x)=>n+x.amount,0)??0;
for(const [kind,recipes] of Object.entries(LINE_RECIPES)){
 assert.ok(recipes.length>=6);
 for(const r of recipes){
  const c={items:r.costs.map(x=>({typeId:x.id,amount:x.count}))};
  assert.ok(findLineRecipe(kind,c,total));
  assert.ok(r.amount>=1&&r.costs.length>=1);
 }
}
assert.equal(Object.keys(RECYCLE_DROPS).length,20);
for(const [key,value] of Object.entries(RECYCLE_DROPS)){assert.equal(recycleProduct(key),value);assert.match(value,/^hakkai:shard_\d+$/);}
assert.equal(recycleProduct('hakkai:crystal_0'),undefined);
const stack=(typeId,nameTag)=>({typeId,nameTag,amount:4,clone(){return {...this,clone:this.clone};}});
const accepted={},rejected={},input=inventory([stack('minecraft:diamond','named')]),filter=inventory([stack('minecraft:diamond')]);
let route=filteredDestination(input,filter,accepted,rejected);assert.equal(route.output,accepted);assert.equal(route.product.amount,1);assert.equal(route.product.nameTag,'named');
route=filteredDestination(input,inventory([stack('minecraft:stone')]),accepted,rejected);assert.equal(route.output,rejected);
assert.equal(filteredDestination(input,inventory([undefined]),accepted,rejected),undefined);
assert.equal(filteredDestination(input,{size:1,getItem(){throw Error('unloaded');}},accepted,rejected),undefined);
console.log('Production line recipe priority, 20 attribute materials and metadata-preserving filter planning OK');
