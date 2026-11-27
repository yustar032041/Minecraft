import assert from 'node:assert/strict';
import {itemDuctStep} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_ducts.js';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';
class Item {constructor(typeId,amount=1,nameTag=''){Object.assign(this,{typeId,amount,nameTag,maxAmount:64});}clone(){return new Item(this.typeId,this.amount,this.nameTag);}isStackableWith(o){return this.typeId===o.typeId&&this.nameTag===o.nameTag;}}
class Container {constructor(items){this.items=items;this.size=items.length;}getItem(i){return this.items[i]?.clone();}setItem(i,v){this.items[i]=v?.clone();if(this.fail){this.fail=false;throw Error('write failure');}}}
const P=(x,y,z)=>({x,y,z}),key=p=>`${p.x},${p.y},${p.z}`;
function setup(name='item_extractor'){
 const map=new Map(),d={id:'d',isChunkLoaded:p=>!d.unloaded?.has(key(p)),getBlock:p=>map.get(key(p))??{typeId:'minecraft:air'}};
 const put=(p,id,c)=>{const b={...p,location:p,dimension:d,typeId:id,getComponent:()=>({container:c})};map.set(key(p),b);return b;};
 const ext=put(P(0,0,0),'hakkai:'+name),run=maxDucts=>itemDuctStep(ext,{factoryTransaction,maxDucts});return {d,put,ext,run};
}
for(const [name,v] of Object.entries({item_extractor:[1,0,0],item_extractor_west:[-1,0,0],item_extractor_north:[0,0,-1],item_extractor_south:[0,0,1],item_extractor_up:[0,1,0],item_extractor_down:[0,-1,0]})){
 const f=setup(name),src=new Container([new Item('minecraft:diamond',2,'marked')]),dst=new Container([undefined]);f.put(P(...v.map(x=>-x)),'minecraft:barrel',src);f.put(P(...v),'minecraft:barrel',dst);
 assert.ok(f.run(),name);assert.equal(src.getItem(0).amount,1);assert.equal(dst.getItem(0).nameTag,'marked');
}
{
 const f=setup(),src=new Container([new Item('minecraft:diamond',2,'named')]),full=new Container([new Item('minecraft:stone',64)]),dst=new Container([undefined]);
 f.put(P(-1,0,0),'minecraft:barrel',src);for(const q of [P(1,0,0),P(2,0,0),P(1,0,1),P(2,0,1)])f.put(q,'hakkai:item_duct');
 f.put(P(3,0,0),'minecraft:barrel',full);f.put(P(3,0,1),'minecraft:barrel',dst);
 assert.ok(f.run());assert.equal(dst.getItem(0).nameTag,'named');assert.equal(src.getItem(0).amount,1);
 f.d.unloaded=new Set([key(P(1,1,0))]);assert.equal(f.run(),false);assert.equal(src.getItem(0).amount,1);f.d.unloaded.clear();
 assert.equal(f.run(1),false);assert.equal(src.getItem(0).amount,1);
 dst.fail=true;assert.equal(f.run(),false);assert.equal(src.getItem(0).amount,1);assert.equal(dst.getItem(0).amount,1);
}
{
 const f=setup(),src=new Container([new Item('minecraft:wheat')]),dst=new Container([undefined]);f.put(P(-1,0,0),'minecraft:barrel',src);for(let x=1;x<=64;x++)f.put(P(x,0,0),'hakkai:item_duct');f.put(P(65,0,0),'minecraft:barrel',dst);assert.ok(f.run());
 src.items=[new Item('minecraft:wheat')];f.put(P(65,0,0),'hakkai:item_duct');const far=new Container([undefined]);f.put(P(66,0,0),'minecraft:barrel',far);assert.equal(f.run(),false);assert.equal(src.getItem(0).amount,1);assert.equal(far.getItem(0),undefined);
}
console.log('Six extractor directions, duct branches, metadata, full, chunks, cap and rollback OK (simulated)');
for(const fault of ['extractor','source','destination','path','unloaded']){
 const f=setup(),src=new Container([new Item('minecraft:diamond',2,'marked')]),dst=new Container([undefined]);
 const source=f.put(P(-1,0,0),'minecraft:barrel',src),duct=f.put(P(1,0,0),'hakkai:item_duct'),destination=f.put(P(2,0,0),'minecraft:barrel',dst);
 const write=dst.setItem.bind(dst);let first=true;dst.setItem=(i,v)=>{write(i,v);if(!first)return;first=false;
  if(fault==='extractor')f.ext.typeId='minecraft:stone';if(fault==='source')source.typeId='minecraft:stone';
  if(fault==='destination')destination.typeId='minecraft:stone';if(fault==='path')duct.typeId='minecraft:stone';
  if(fault==='unloaded')f.d.unloaded=new Set([key(P(1,0,0))]);
 };
 assert.equal(f.run(),false,fault);assert.equal(src.getItem(0).amount,2,fault);assert.equal(src.getItem(0).nameTag,'marked');assert.equal(dst.getItem(0),undefined,fault);
}
// Inventory conflicts during a real duct step must not erase a changed barrel.
{
 const f=setup(),src=new Container([new Item('minecraft:diamond',2,'marked')]),dst=new Container([undefined]);
 f.put(P(-1,0,0),'minecraft:barrel',src);f.put(P(1,0,0),'minecraft:barrel',dst);
 const set=src.setItem.bind(src);let first=true;src.setItem=(i,v)=>{set(i,v);if(first){first=false;dst.items[0]=new Item('minecraft:gold_ingot',3,'other');}};
 assert.equal(f.run(),false);assert.equal(src.getItem(0).amount,2);assert.equal(src.getItem(0).nameTag,'marked');assert.equal(dst.getItem(0).typeId,'minecraft:gold_ingot');assert.equal(dst.getItem(0).amount,3);
}
