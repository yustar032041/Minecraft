import assert from 'node:assert/strict';
import {fluidPumpStep,fluidBasinStep,fluidLoaderStep,fluidRecipe,tankState,consumeTankWater} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_fluids.js';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';
class Item {constructor(typeId,amount=1){this.typeId=typeId;this.amount=amount;this.maxAmount=typeId.endsWith('_bucket')?1:64;}clone(){return Object.assign(new Item(this.typeId,this.amount),{nameTag:this.nameTag});}isStackableWith(o){return this.typeId===o.typeId&&this.nameTag===o.nameTag;}}
class Container {constructor(items){this.items=items;this.size=items.length;}getItem(i){return this.items[i]?.clone();}setItem(i,v){this.items[i]=v?.clone();if(this.fail){this.fail=false;throw Error('failed after write');}}}
const perm=states=>({getState:k=>states[k],withState:(k,v)=>perm({...states,[k]:v})});
const key=p=>`${p.x},${p.y},${p.z}`,P=(x,y,z)=>({x,y,z});
function setup(){
 const blocks=new Map(),d={id:'overworld',isChunkLoaded:p=>!d.unloaded?.has(key(p)),getBlock:p=>blocks.get(key(p))??{typeId:'minecraft:air'}};
 function put(p,id,states={}){const b={...p,location:p,dimension:d,typeId:id,permutation:perm(states),setPermutation(v){this.permutation=v;if(this.fail){this.fail=false;throw Error('failed after write');}}};blocks.set(key(p),b);return b;}
 const tank=(p,kind=0,n=0)=>put(p,'hakkai:fluid_tank',{'hakkai:fluid':kind,'hakkai:level':n});return {d,put,tank};
}
{
 const f=setup(),pump=f.put(P(0,0,0),'hakkai:fluid_pump');f.put(P(-1,0,0),'minecraft:water',{liquid_depth:0});f.put(P(1,0,0),'hakkai:fluid_pipe');f.put(P(2,0,0),'hakkai:fluid_pipe');f.put(P(2,1,0),'hakkai:fluid_pipe');const t=f.tank(P(2,2,0));
 for(let i=0;i<8;i++)assert.equal(fluidPumpStep(pump),true);assert.deepEqual(tankState(t),{kind:1,n:8});assert.equal(fluidPumpStep(pump),false);assert.equal(f.d.getBlock(P(-1,0,0)).typeId,'minecraft:water');
}
for(const [kind,v] of Object.entries({fluid_pump:[1,0,0],fluid_pump_west:[-1,0,0],fluid_pump_north:[0,0,-1],fluid_pump_south:[0,0,1],fluid_pump_up:[0,1,0],fluid_pump_down:[0,-1,0]})){
 const f=setup(),pump=f.put(P(0,0,0),'hakkai:'+kind),source=f.tank(P(...v.map(x=>-x)),2,1),dest=f.tank(P(...v));assert.ok(fluidPumpStep(pump));assert.deepEqual(tankState(source),{kind:0,n:0});assert.deepEqual(tankState(dest),{kind:2,n:1});
}
{
 const f=setup(),pump=f.put(P(0,0,0),'hakkai:fluid_pump'),source=f.tank(P(-1,0,0),2,2);f.put(P(1,0,0),'hakkai:fluid_pipe');const dest=f.tank(P(2,0,0),1,1);
 assert.equal(fluidPumpStep(pump),false);assert.deepEqual(tankState(source),{kind:2,n:2});assert.deepEqual(tankState(dest),{kind:1,n:1});
 dest.permutation=perm({'hakkai:level':0,'hakkai:fluid':0});f.d.unloaded=new Set([key(P(1,1,0))]);assert.equal(fluidPumpStep(pump),false);assert.equal(tankState(source).n,2);
 f.d.unloaded.clear();assert.equal(fluidPumpStep(pump,()=>{},0),false);assert.equal(tankState(source).n,2);
 dest.fail=true;assert.equal(fluidPumpStep(pump),false);assert.deepEqual(tankState(source),{kind:2,n:2});assert.deepEqual(tankState(dest),{kind:0,n:0});
 source.fail=true;assert.equal(fluidPumpStep(pump),false);assert.deepEqual(tankState(source),{kind:2,n:2});assert.deepEqual(tankState(dest),{kind:0,n:0});
}
{
 const f=setup(),pump=f.put(P(0,0,0),'hakkai:fluid_pump');f.put(P(-1,0,0),'minecraft:water',{liquid_depth:2});const t=f.tank(P(1,0,0));assert.equal(fluidPumpStep(pump),false);assert.equal(tankState(t).n,0);
}
const f=setup(),tank=f.tank(P(0,1,0));
const invoke=(method,inputs,outputs=[undefined,undefined])=>{const input=new Container(inputs),output=new Container(outputs);const args={dimension:f.d,p:P(0,0,0),input,output,ItemStack:Item,factoryTransaction};return {input,output,args,run:()=>method(args)};};
{
 const x=invoke(fluidLoaderStep,[new Item('minecraft:lava_bucket')]);assert.ok(x.run());assert.equal(x.output.items[0].typeId,'minecraft:bucket');assert.deepEqual(tankState(tank),{kind:2,n:4});
 const bad=invoke(fluidLoaderStep,[new Item('minecraft:water_bucket')]);assert.equal(bad.run(),false);assert.equal(bad.input.items[0].typeId,'minecraft:water_bucket');
 const fill=invoke(fluidBasinStep,[new Item('minecraft:bucket')]);assert.ok(fill.run());assert.equal(fill.output.items[0].typeId,'minecraft:lava_bucket');assert.deepEqual(tankState(tank),{kind:0,n:0});
}
{
 const x=invoke(fluidLoaderStep,[new Item('minecraft:water_bucket')]);x.output.fail=true;assert.equal(x.run(),false);assert.equal(x.input.items[0].typeId,'minecraft:water_bucket');assert.deepEqual(tankState(tank),{kind:0,n:0});
 tank.fail=true;assert.equal(x.run(),false);assert.equal(x.input.items[0].typeId,'minecraft:water_bucket');assert.deepEqual(tankState(tank),{kind:0,n:0});
 assert.equal(x.run(),true);assert.deepEqual(tankState(tank),{kind:1,n:4});
 const full=invoke(fluidBasinStep,[new Item('minecraft:dirt')],[new Item('minecraft:stone',64)]);assert.equal(full.run(),false);assert.equal(tankState(tank).n,4);
 const mud=invoke(fluidBasinStep,[new Item('minecraft:dirt')]);tank.fail=true;assert.equal(mud.run(),false);assert.equal(mud.input.items[0].typeId,'minecraft:dirt');assert.equal(tankState(tank).n,4);assert.ok(mud.run());assert.equal(mud.output.items[0].typeId,'minecraft:mud');assert.equal(tankState(tank).n,3);consumeTankWater(tank,1);assert.equal(tankState(tank).n,2);
}
for(const color of 'white orange magenta light_blue yellow lime pink gray light_gray cyan purple blue brown green red black'.split(' '))assert.deepEqual(fluidRecipe('minecraft:'+color+'_concrete_powder',1),{output:'minecraft:'+color+'_concrete',units:1});
assert.equal(fluidRecipe('minecraft:dirt',2),undefined);assert.deepEqual(fluidRecipe('minecraft:cobblestone',2),{output:'minecraft:stone',units:1});
console.log('Water/lava tank persistence, six pumps, bounded branching, loader/basin and rollback OK (simulated)');
{
 // Multiple disjoint and mixed branches, bounded cycles; no accidental mixing.
 const w=setup(),pump=w.put(P(0,0,0),'hakkai:fluid_pump'),source=w.tank(P(-1,0,0),1,8);
 for(const p of [P(1,0,0),P(2,0,0),P(1,0,1),P(2,0,1)])w.put(p,'hakkai:fluid_pipe');
 const wrong=w.tank(P(3,0,0),2,4),empty=w.tank(P(3,0,1));assert.ok(fluidPumpStep(pump));assert.equal(tankState(wrong).n,4);assert.deepEqual(tankState(empty),{kind:1,n:1});assert.equal(tankState(source).n,7);
}
{
 const w=setup(),pump=w.put(P(0,0,0),'hakkai:fluid_pump'),source=w.tank(P(-1,0,0),1,1);
 for(let x=1;x<=64;x++)w.put(P(x,0,0),'hakkai:fluid_pipe');const target=w.tank(P(65,0,0));assert.ok(fluidPumpStep(pump));assert.equal(tankState(target).n,1);
 source.permutation=perm({'hakkai:fluid':1,'hakkai:level':1});target.permutation=perm({'hakkai:fluid':0,'hakkai:level':0});w.put(P(65,0,0),'hakkai:fluid_pipe');const far=w.tank(P(66,0,0));assert.equal(fluidPumpStep(pump),false);assert.equal(tankState(source).n,1);assert.equal(tankState(far).n,0);
}
for(const [name,v] of Object.entries({fluid_pump:[1,0,0],fluid_pump_west:[-1,0,0],fluid_pump_north:[0,0,-1],fluid_pump_south:[0,0,1],fluid_pump_up:[0,1,0],fluid_pump_down:[0,-1,0]})){
 const f=setup(),pump=f.put(P(0,0,0),'hakkai:'+name),lava=f.put(P(...v.map(x=>-x)),'minecraft:lava',{liquid_depth:0}),target=f.tank(P(...v));
 lava.setType=function(id){this.typeId=id;this.permutation=perm({});};lava.setPermutation=function(p){this.typeId='minecraft:lava';this.permutation=p;};
 assert.equal(fluidPumpStep(pump),true,name);assert.equal(lava.typeId,'minecraft:air');assert.deepEqual(tankState(target),{kind:2,n:4});assert.equal(fluidPumpStep(pump),false,'cannot duplicate lava source');
}
for(const fault of ['space','different','flowing','unloaded','source_write','target_write']){
 const f=setup(),pump=f.put(P(0,0,0),'hakkai:fluid_pump'),lava=f.put(P(-1,0,0),'minecraft:lava',{liquid_depth:fault==='flowing'?1:0}),target=f.tank(P(1,0,0),fault==='different'?1:2,fault==='space'?5:1);
 lava.setType=function(id){this.typeId=id;this.permutation=perm({});if(fault==='source_write')throw Error('write failed after source removal');};lava.setPermutation=function(p){this.typeId='minecraft:lava';this.permutation=p;};
 if(fault==='target_write')target.fail=true;if(fault==='unloaded')f.d.unloaded=new Set([key(P(1,0,0))]);
 const prior=tankState(target);assert.equal(fluidPumpStep(pump),false,fault);assert.equal(lava.typeId,'minecraft:lava',fault);assert.deepEqual(tankState(target),prior,fault);
}
console.log('Finite lava source extraction, six directions, blocked/full/unloaded and rollback OK (simulated)');
