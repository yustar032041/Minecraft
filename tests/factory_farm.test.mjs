import assert from 'node:assert/strict';
import {farmStep,farmCrop,farmSeed,farmGuideCrops} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_farm.js';
import {tankState} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_fluids.js';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';
class Item {constructor(typeId,amount=1){this.typeId=typeId;this.amount=amount;this.maxAmount=64;}clone(){const a=new Item(this.typeId,this.amount);a.nameTag=this.nameTag;return a;}isStackableWith(o){return this.typeId===o.typeId&&this.nameTag===o.nameTag;}}
class Container {constructor(items){this.items=items;this.size=items.length;}getItem(i){return this.items[i]?.clone();}setItem(i,v){this.items[i]=v?.clone();if(this.fail){this.fail=false;throw Error('write failed after mutation');}}}
const perm=(states,id)=>({id,getState:k=>states[k],withState:(k,v)=>perm({...states,[k]:v},id)});
const p=(x,y,z)=>({x,y,z}),key=p=>`${p.x},${p.y},${p.z}`;
function setup(){const map=new Map(),d={id:'overworld',isChunkLoaded:q=>!d.unloaded?.has(key(q)),getBlock:q=>map.get(key(q))??{typeId:'minecraft:air'}};
 const put=(q,id,states={})=>{const b={...q,typeId:id,dimension:d,location:q,permutation:perm(states,id),setPermutation(v){this.permutation=v;if(v.id)this.typeId=v.id;if(this.fail){this.fail=false;throw Error('block write failed after mutation');}}};map.set(key(q),b);return b;};
 const crop=(q,id,age,state='growth')=>{put(p(q.x,q.y-1,q.z),'minecraft:farmland');return put(q,id,{[state]:age});};
 const b=put(p(0,80,0),'hakkai:farm_harvester'),cursors=new Map();
 const run=(mode,input,output)=>farmStep({block:b,mode,input,output,ItemStack:Item,factoryTransaction,cursors,resolve:id=>perm({},id)});return {d,put,crop,b,cursors,run};}
for(const [id,state,max,item,amount] of [
 ['minecraft:wheat','growth',7,'minecraft:wheat',1],['minecraft:carrots','growth',7,'minecraft:carrot',2],['minecraft:potatoes','growth',7,'minecraft:potato',2],['minecraft:beetroot','growth',7,'minecraft:beetroot',1],
 ...['spring_tulip','summer_corn','autumn_squash','ice_blossom','summer_sunflower'].map(n=>['hakkai:'+n,'hakkai:age',3,'hakkai:'+n+'_produce',2])]){
 const f=setup(),crop=f.crop(p(1,80,0),id,max,state),out=new Container([undefined]);assert.ok(f.run('harvest',undefined,out),id);assert.equal(out.getItem(0).typeId,item);assert.equal(out.getItem(0).amount,amount);assert.equal(crop.permutation.getState(state),0);assert.equal(f.run('harvest',undefined,out),false);
}
for(const fault of ['full','output_write','crop_write','unloaded','no_farmland']){
 const f=setup(),crop=f.crop(p(1,80,0),'minecraft:wheat',7),out=new Container([fault==='full'?new Item('minecraft:stone',64):undefined]);
 if(fault==='output_write')out.fail=true;if(fault==='crop_write')crop.fail=true;if(fault==='unloaded')f.d.unloaded=new Set([key(p(1,80,0))]);if(fault==='no_farmland')f.put(p(1,79,0),'minecraft:dirt');
 assert.equal(f.run('harvest',undefined,out),false,fault);assert.equal(crop.permutation.getState('growth'),7);if(fault!=='full')assert.equal(out.getItem(0),undefined);
}
for(const fault of ['none','input_write','water_write','crop_write','empty_water','wrong_liquid']){
 const f=setup(),crop=f.crop(p(1,80,0),'hakkai:summer_corn',1,'hakkai:age'),tank=f.put(p(0,81,0),'hakkai:fluid_tank',{'hakkai:fluid':fault==='wrong_liquid'?2:fault==='empty_water'?0:1,'hakkai:level':fault==='empty_water'?0:4}),input=new Container([new Item('minecraft:bone_meal',2)]);
 if(fault==='input_write')input.fail=true;if(fault==='water_write')tank.fail=true;if(fault==='crop_write')crop.fail=true;
 const ok=f.run('fertilize',input);if(fault==='none'){assert.ok(ok);assert.equal(crop.permutation.getState('hakkai:age'),2);assert.equal(input.getItem(0).amount,1);assert.equal(tankState(tank).n,3);}
 else {assert.equal(ok,false,fault);assert.equal(crop.permutation.getState('hakkai:age'),1);assert.equal(input.getItem(0).amount,2);assert.equal(tankState(tank).n,fault==='empty_water'?0:4);}
}
{
 const f=setup(),crop=f.crop(p(1,80,0),'minecraft:carrots',0),tank=f.put(p(0,81,0),'hakkai:fluid_tank',{'hakkai:fluid':1,'hakkai:level':1}),input=new Container([new Item('minecraft:bone_meal',1)]);
 assert.ok(f.run('fertilize',input));assert.equal(input.getItem(0),undefined);assert.equal(tankState(tank).n,0);assert.equal(crop.permutation.getState('growth'),1);
}
{
 const f=setup(),a=f.crop(p(1,80,0),'minecraft:wheat',7),b=f.crop(p(2,80,0),'minecraft:wheat',7),out=new Container([undefined]);assert.ok(f.run('harvest',undefined,out));assert.ok(f.run('harvest',undefined,out));assert.equal(a.permutation.getState('growth'),0);assert.equal(b.permutation.getState('growth'),0);assert.equal(out.getItem(0).amount,2);
}
assert.equal(farmCrop('minecraft:pumpkin_stem'),undefined);assert.equal(farmCrop('minecraft:bamboo'),undefined);
console.log('Four vanilla and five seasonal crops, finite fertilizer/water, fairness, chunk and rollback OK (simulated)');
for(const [seed,crop] of [['minecraft:wheat_seeds','minecraft:wheat'],['minecraft:carrot','minecraft:carrots'],['minecraft:potato','minecraft:potatoes'],['minecraft:beetroot_seeds','minecraft:beetroot'],...['spring_tulip','summer_corn','autumn_squash','ice_blossom','summer_sunflower'].map(n=>['hakkai:'+n+'_seed','hakkai:'+n])]){
 const f=setup(),pos=p(1,80,0);f.put(p(1,79,0),'minecraft:farmland');const air=f.put(pos,'minecraft:air'),input=new Container([new Item(seed,2)]);assert.equal(farmSeed(seed),crop);assert.ok(f.run('plant',input),seed);assert.equal(air.typeId,crop);assert.equal(input.getItem(0).amount,1);assert.equal(air.permutation.getState(farmCrop(crop).state),0);
}
for(const fault of ['input_write','block_write','no_farmland','occupied','unloaded']){
 const f=setup(),pos=p(1,80,0);f.put(p(1,79,0),fault==='no_farmland'?'minecraft:dirt':'minecraft:farmland');const target=f.put(pos,fault==='occupied'?'minecraft:stone':'minecraft:air'),input=new Container([new Item('minecraft:wheat_seeds')]);
 if(fault==='input_write')input.fail=true;if(fault==='block_write')target.fail=true;if(fault==='unloaded')f.d.unloaded=new Set([key(pos)]);
 assert.equal(f.run('plant',input),false,fault);assert.equal(input.getItem(0).amount,1);assert.equal(target.typeId,fault==='occupied'?'minecraft:stone':'minecraft:air',fault);
}
console.log('Seed planting on empty farmland, nine crop types and rollback OK (simulated)');
// Native callbacks or adjacent updates can change a target during a write.
// Reject the old snapshot and do not restore over somebody else's block.
for(const changed of ['crop','age','soil','unloaded']){
 const f=setup(),q=p(1,80,0),crop=f.crop(q,'minecraft:wheat',7),out=new Container([undefined]),set=out.setItem.bind(out);let once=true;
 out.setItem=(i,v)=>{set(i,v);if(once){once=false;if(changed==='crop')f.put(q,'minecraft:stone');if(changed==='age')crop.setPermutation(perm({growth:2},'minecraft:wheat'));if(changed==='soil')f.put(p(1,79,0),'minecraft:dirt');if(changed==='unloaded')f.d.unloaded=new Set([key(q)]);}};
 assert.equal(f.run('harvest',undefined,out),false,changed);assert.equal(out.getItem(0),undefined,changed);
 if(changed==='crop')assert.equal(f.d.getBlock(q).typeId,'minecraft:stone');
 if(changed==='age')assert.equal(crop.permutation.getState('growth'),2);
 if(changed==='soil')assert.equal(f.d.getBlock(p(1,79,0)).typeId,'minecraft:dirt');
}
for(const changed of ['crop','soil','unloaded']){
 const f=setup(),q=p(1,80,0);f.put(p(1,79,0),'minecraft:farmland');f.put(q,'minecraft:air');const input=new Container([new Item('minecraft:wheat_seeds')]),set=input.setItem.bind(input);let once=true;
 input.setItem=(i,v)=>{set(i,v);if(once){once=false;if(changed==='crop')f.put(q,'minecraft:stone');if(changed==='soil')f.put(p(1,79,0),'minecraft:dirt');if(changed==='unloaded')f.d.unloaded=new Set([key(q)]);}};
 assert.equal(f.run('plant',input),false,changed);assert.equal(input.getItem(0).amount,1);if(changed==='crop')assert.equal(f.d.getBlock(q).typeId,'minecraft:stone');
}
for(const changed of ['crop','age','soil','tank','unloaded']){
 const f=setup(),q=p(1,80,0),crop=f.crop(q,'minecraft:wheat',2),tank=f.put(p(0,81,0),'hakkai:fluid_tank',{'hakkai:fluid':1,'hakkai:level':4}),input=new Container([new Item('minecraft:bone_meal')]),set=input.setItem.bind(input);let once=true;
 input.setItem=(i,v)=>{set(i,v);if(once){once=false;if(changed==='crop')f.put(q,'minecraft:stone');if(changed==='age')crop.setPermutation(perm({growth:3},'minecraft:wheat'));if(changed==='soil')f.put(p(1,79,0),'minecraft:dirt');if(changed==='tank')tank.setPermutation(perm({'hakkai:fluid':1,'hakkai:level':2},'hakkai:fluid_tank'));if(changed==='unloaded')f.d.unloaded=new Set([key(q)]);}};
 assert.equal(f.run('fertilize',input),false,changed);assert.equal(input.getItem(0).amount,1);assert.equal(tankState(tank).n,changed==='tank'?2:4);if(changed==='crop')assert.equal(f.d.getBlock(q).typeId,'minecraft:stone');if(changed==='age')assert.equal(crop.permutation.getState('growth'),3);
}
// A tank write can itself trigger a crop update. Restore only the water and
// bone meal, leaving the other actor's crop intact.
{
 const f=setup(),q=p(1,80,0);f.crop(q,'minecraft:wheat',2);const tank=f.put(p(0,81,0),'hakkai:fluid_tank',{'hakkai:fluid':1,'hakkai:level':4}),input=new Container([new Item('minecraft:bone_meal')]),set=tank.setPermutation.bind(tank);let once=true;
 tank.setPermutation=v=>{set(v);if(once){once=false;f.put(q,'minecraft:stone')}};
 assert.equal(f.run('fertilize',input),false);assert.equal(f.d.getBlock(q).typeId,'minecraft:stone');assert.equal(tankState(tank).n,4);assert.equal(input.getItem(0).amount,1);
}
// A selected seed or bone-meal slot may change while the field is inspected;
// never turn the replacement stack into the selected ingredient.
for(const mode of ['plant','fertilize']){
 const f=setup(),q=p(1,80,0);if(mode==='plant'){f.put(p(1,79,0),'minecraft:farmland');f.put(q,'minecraft:air');}else{f.crop(q,'minecraft:wheat',2);f.put(p(0,81,0),'hakkai:fluid_tank',{'hakkai:fluid':1,'hakkai:level':4});}
 const input=new Container([new Item(mode==='plant'?'minecraft:wheat_seeds':'minecraft:bone_meal')]),get=f.d.getBlock;let once=true;
 f.d.getBlock=pos=>{if(once&&key(pos)===key(q)){once=false;input.items[0]=new Item('minecraft:diamond',3)}return get(pos)};
 assert.equal(f.run(mode,input),false,mode);assert.equal(input.getItem(0).typeId,'minecraft:diamond');assert.equal(input.getItem(0).amount,3);
 assert.equal(f.d.getBlock(q).typeId,mode==='plant'?'minecraft:air':'minecraft:wheat');
}
// The crop identity is captured when its recipe/age is inspected, before the
// ingredient slot is read a second time.
{
 const f=setup(),q=p(1,80,0),crop=f.crop(q,'minecraft:wheat',2),tank=f.put(p(0,81,0),'hakkai:fluid_tank',{'hakkai:fluid':1,'hakkai:level':4}),input=new Container([new Item('minecraft:bone_meal')]);const get=input.getItem.bind(input);let reads=0;
 input.getItem=i=>{if(++reads===2){crop.typeId='minecraft:carrots';crop.permutation=perm({growth:2},'minecraft:carrots')}return get(i)};
 assert.equal(f.run('fertilize',input),false);assert.equal(input.getItem(0).amount,1);assert.equal(crop.typeId,'minecraft:carrots');assert.equal(crop.permutation.getState('growth'),2);assert.equal(tankState(tank).n,4);
}

// Each guide entry's crop also grows through the actual fertilizer operation.
for(const c of farmGuideCrops()){
 const f=setup(),crop=f.crop(p(1,80,0),c.crop,0,c.state),tank=f.put(p(0,81,0),'hakkai:fluid_tank',{'hakkai:fluid':1,'hakkai:level':1}),input=new Container([new Item('minecraft:bone_meal')]);
 assert.equal(f.run('fertilize',input),true,c.crop);assert.equal(crop.permutation.getState(c.state),1);assert.equal(input.getItem(0),undefined);assert.equal(tankState(tank).n,0);
}
