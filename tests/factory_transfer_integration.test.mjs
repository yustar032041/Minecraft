// Runs the actual transfer function with simulated Minecraft objects.
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {kineticNetwork,hasAdjacentWater,factoryRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js';
import {findLineRecipe,filteredDestination} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_lines.js';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';
class ItemStack {constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64});}clone(){const c=new ItemStack(this.typeId,this.amount);c.nameTag=this.nameTag;return c;}isStackableWith(x){return this.typeId===x.typeId&&this.nameTag===x.nameTag;}}
class Container {constructor(items){this.items=items;this.size=items.length;this.failOnce=false;}getItem(i){return this.items[i]?.clone();}setItem(i,v){this.items[i]=v?.clone();if(this.failOnce){this.failOnce=false;throw Error('write failed');}}}
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const start=src.indexOf('function transfer(b){'),end=src.indexOf("safeSub('system','before','startup'",start);assert.ok(start>=0&&end>start);
function fixture(kind,inputs,outputs=[undefined,undefined]){
 const from=new Container(inputs),to=new Container(outputs),reports=[],produced=[];
 const ore={typeId:'hakkai:ore_3',permutation:{id:'ore'},setType(id){this.typeId=id;if(this.failOnce){this.failOnce=false;throw Error('block failed');}},setPermutation(p){this.typeId=p.id==='ore'?'hakkai:ore_3':p.id;}};
 const barrel=c=>({typeId:'minecraft:barrel',getComponent:()=>({container:c})});
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getBlockFromRay:()=>({})};
 const b={typeId:'hakkai:'+kind,dimension:d,x:0,y:80,z:0};
 d.getBlock=l=>l.y===80&&l.z===0&&l.x===-1?barrel(from):l.y===80&&l.z===0&&l.x===1?barrel(to):l.y===80&&l.z===0&&l.x===0?b:l.x===0&&l.z===0&&l.y<80?ore:{typeId:'minecraft:air'};
 const total=(c,id)=>c.items.reduce((a,v)=>a+(v?.typeId===id?v.amount:0),0);
 const room=(c,s)=>c.items.reduce((a,v)=>a+(!v?s.maxAmount:v.isStackableWith(s)?v.maxAmount-v.amount:0),0)>=s.amount;
 const ctx={ns:'hakkai:',world:{getTimeOfDay:()=>6000},currentWeather:new Map(),WeatherType:{Thunder:'thunder',Rain:'rain'},system:{currentTick:0},ItemStack,total,room,factoryTransaction,kineticNetwork,hasAdjacentWater,factoryRecipe,syncKineticVisual:()=>{},findLineRecipe,filteredDestination,factoryCycleAt:new Map(),production:(_,n)=>produced.push(n),report:(...x)=>reports.push(x)};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
 return {from,to,ore,b,ctx,reports,produced,run:()=>ctx.transfer(b)};
}
const item=(id,n=1)=>new ItemStack(id,n);const snap=c=>c.items.map(v=>v&&[v.typeId,v.amount]);
for(const [kind,raw,out] of [['mill','minecraft:raw_iron','minecraft:iron_ingot'],['kiln','minecraft:sand','minecraft:glass']]){
 const f=fixture(kind,[item('minecraft:coal'),item(raw,3)]);f.run();assert.deepEqual(snap(f.from),[undefined,undefined]);assert.deepEqual(snap(f.to),[[out,3],undefined]);assert.deepEqual(f.produced,[3]);
}
{
 const f=fixture('compressor',[item('hakkai:shard_2',2),item('minecraft:amethyst_shard')]);f.run();assert.deepEqual(snap(f.to),[['hakkai:crystal_2',1],undefined]);
}
{
 const f=fixture('sorter',[item('hakkai:shard_2',2)]);f.run();assert.deepEqual(snap(f.from),[['hakkai:shard_2',1]]);assert.deepEqual(snap(f.to),[['hakkai:shard_2',1],undefined]);
}
{
 const f=fixture('miner',[item('minecraft:coal')]);f.run();assert.equal(f.ore.typeId,'minecraft:air');assert.deepEqual(snap(f.to),[['hakkai:crystal_3',1],undefined]);
}
for(const fail of ['inventory','block']){
 const f=fixture('miner',[item('minecraft:coal')]);if(fail==='inventory')f.to.failOnce=true;else f.ore.failOnce=true;
 f.run();assert.equal(f.ore.typeId,'hakkai:ore_3');assert.deepEqual(snap(f.from),[['minecraft:coal',1]]);assert.deepEqual(snap(f.to),[undefined,undefined]);assert.equal(f.produced.length,0);assert.ok(f.reports.length,fail);
}
console.log('Actual machine transfer: mill, kiln, compressor, sorter and miner with failure rollback OK (simulated)');
// Exercise the real transfer function for every new production branch.
for(const [kind,raw,count,out,amount] of [
 ['crusher','minecraft:cobblestone',1,'minecraft:gravel',1],
 ['crusher','minecraft:bone',1,'minecraft:bone_meal',3],
 ['press','minecraft:clay_ball',4,'minecraft:clay',1],
 ['saw','minecraft:oak_log',1,'minecraft:oak_planks',4],
]){
 const f=fixture(kind,[item('minecraft:coal'),item(raw,count)]);f.run();
 assert.deepEqual(snap(f.to),[[out,amount],undefined],kind);assert.deepEqual(snap(f.from),[undefined,undefined]);
}
{
 const f=fixture('washer',[item('minecraft:coal'),item('minecraft:gravel')]);f.run();
 assert.deepEqual(snap(f.to),[undefined,undefined]);assert.deepEqual(snap(f.from),[['minecraft:coal',1],['minecraft:gravel',1]]);
 const get=f.b.dimension.getBlock;f.b.dimension.getBlock=p=>p.z===1?{typeId:'minecraft:water'}:get(p);f.run();
 assert.deepEqual(snap(f.to),[['minecraft:flint',1],undefined]);
}
{
 const f=fixture('crusher',[item('minecraft:cobblestone')]);
 const get=f.b.dimension.getBlock;f.b.dimension.getBlock=p=>p.x===0&&p.y===80&&p.z===1?{typeId:'hakkai:wind_rotor',x:0,y:80,z:1,location:p}:get(p);
 f.b.dimension.getBlockFromRay=()=>undefined;f.run();assert.deepEqual(snap(f.to),[['minecraft:gravel',1],undefined]);
}
{
 const f=fixture('factory_pipe',[item('minecraft:diamond',2)]);f.run();
 assert.deepEqual(snap(f.from),[['minecraft:diamond',1]]);assert.deepEqual(snap(f.to),[['minecraft:diamond',1],undefined]);
 const blocked=fixture('factory_pipe',[item('minecraft:diamond',2)],[item('minecraft:stone',64)]);blocked.run();
 assert.deepEqual(snap(blocked.from),[['minecraft:diamond',2]]);assert.deepEqual(snap(blocked.to),[['minecraft:stone',64]]);
}
console.log('Crusher, washer, press, saw and pipe transactions OK (simulated)');

{
 const a=item('minecraft:diamond',2),b=item('minecraft:diamond',2);a.nameTag='first';b.nameTag='second';
 const f=fixture('factory_pipe',[a,b],[undefined,undefined]);f.run();
 assert.equal(f.to.getItem(0).nameTag,'first');assert.equal(f.from.getItem(0).amount,1);assert.equal(f.from.getItem(1).nameTag,'second');
}
for(const kind of ['factory_pipe','crusher']){
 const f=fixture(kind,kind==='crusher'?[item('minecraft:coal'),item('minecraft:cobblestone')]:[item('minecraft:diamond',2)]);
 const before=snap(f.from);f.to.failOnce=true;f.run();assert.deepEqual(snap(f.from),before);assert.deepEqual(snap(f.to),[undefined,undefined]);assert.ok(f.reports.length);
}
// Network speed actually changes operation cadence. Capacity failure takes
// precedence even when fuel is available; neither items nor fuel are spent.
{
 const f=fixture('crusher',[item('minecraft:cobblestone',4)]),get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=p=>p.x===0&&p.y===80&&p.z===1?{typeId:'hakkai:wind_rotor',...p,location:p}:get(p);
 f.b.dimension.getBlockFromRay=()=>undefined;
 f.run();assert.equal(f.to.getItem(0).amount,1);f.ctx.system.currentTick=39;f.run();assert.equal(f.to.getItem(0).amount,1);
 f.ctx.system.currentTick=40;f.run();assert.equal(f.to.getItem(0).amount,2);
}
{
 const f=fixture('crusher',[item('minecraft:coal'),item('minecraft:cobblestone')]);
 // Inject an overloaded real network. Connected machines reserve load.
 const get=f.b.dimension.getBlock,blocks=new Map([
  ['0,80,1','wind_rotor'],['0,80,2','gear_up'], // gear side-only; replace with direct heavy loads
  ['0,80,-1','miner'],['0,81,0','press'],['0,79,0','kiln']]);
 blocks.delete('0,80,2');f.b.dimension.getBlock=p=>{
  const name=blocks.get(`${p.x},${p.y},${p.z}`);return name?{typeId:'hakkai:'+name,...p,location:p}:get(p);
 };
 f.b.dimension.getBlockFromRay=()=>undefined;f.run();
 assert.deepEqual(snap(f.from),[['minecraft:coal',1],['minecraft:cobblestone',1]]);assert.deepEqual(snap(f.to),[undefined,undefined]);
}
{
 const f=fixture('crusher',[item('minecraft:coal'),item('hakkai:crystal_5')]);f.run();assert.deepEqual(snap(f.to),[['hakkai:shard_5',2],undefined]);
}
{
 const f=fixture('crusher',[item('minecraft:cobblestone',3)]),get=f.b.dimension.getBlock;
 const blocks=new Map([['0,81,0','shaft'],['-1,81,0','gear_up'],['-2,81,0','wind_rotor']]);
 f.b.dimension.getBlock=p=>{const name=blocks.get(`${p.x},${p.y},${p.z}`);return name?{typeId:'hakkai:'+name,...p,location:p}:get(p);};f.b.dimension.getBlockFromRay=()=>undefined;
 assert.equal(kineticNetwork(f.b.dimension,{x:0,y:80,z:0}).rpm,-32);
 f.run();f.ctx.system.currentTick=19;f.run();assert.equal(f.to.getItem(0).amount,1);
 f.ctx.system.currentTick=20;f.run();assert.equal(f.to.getItem(0).amount,2);
}
// Mixer/assembly use actual crafting ingredients and stop without usable kinetic power.
for(const [kind,inputs,output,amount] of [
 ['mixer',['minecraft:glass_bottle','minecraft:glow_berries','hakkai:crystal_1'],'hakkai:mana_tonic',1],
 ['assembler',['hakkai:cloth','hakkai:cloth','minecraft:paper'],'hakkai:bandage',2],
]){
 const f=fixture(kind,inputs.map(x=>item(x))),before=snap(f.from);f.run();assert.deepEqual(snap(f.from),before);assert.deepEqual(snap(f.to),[undefined,undefined]);
 const get=f.b.dimension.getBlock;f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?{typeId:'hakkai:wind_rotor',...p,location:p}:get(p);f.b.dimension.getBlockFromRay=()=>undefined;
 f.run();assert.deepEqual(snap(f.to),[[output,amount],undefined]);assert.equal(f.from.items.filter(Boolean).length,0);
}
{
 const f=fixture('mixer',[item('minecraft:glass_bottle'),item('minecraft:glow_berries'),item('hakkai:crystal_1')],[item('minecraft:stone',64)]);
 const get=f.b.dimension.getBlock;f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?{typeId:'hakkai:wind_rotor',...p,location:p}:get(p);f.b.dimension.getBlockFromRay=()=>undefined;
 const before=snap(f.from);f.run();assert.deepEqual(snap(f.from),before);assert.deepEqual(snap(f.to),[['minecraft:stone',64]]);
}
{
 const f=fixture('mixer',[item('minecraft:glass_bottle'),item('minecraft:glow_berries'),item('hakkai:crystal_1')]);
 const get=f.b.dimension.getBlock;f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?{typeId:'hakkai:wind_rotor',...p,location:p}:get(p);f.b.dimension.getBlockFromRay=()=>undefined;
 const before=snap(f.from);f.to.failOnce=true;f.run();assert.deepEqual(snap(f.from),before);assert.deepEqual(snap(f.to),[undefined,undefined]);assert.ok(f.reports.length);
}
for(const match of [true,false]){
 const named=item('minecraft:diamond',2);named.nameTag='kept';const f=fixture('filter_router',[named]);
 const samples=new Container([item(match?'minecraft:diamond':'minecraft:stone')]),reject=new Container([undefined]);const barrel=c=>({typeId:'minecraft:barrel',getComponent:()=>({container:c})});
 const get=f.b.dimension.getBlock;f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?{typeId:'hakkai:wind_rotor',...p,location:p}:p.x===0&&p.y===80&&p.z===-1?barrel(samples):p.x===0&&p.y===80&&p.z===1?barrel(reject):get(p);
 f.b.dimension.getBlockFromRay=()=>undefined;f.run();
 const result=match?f.to:reject;assert.equal(result.getItem(0).nameTag,'kept');assert.equal(result.getItem(0).amount,1);assert.equal(f.from.getItem(0).amount,1);assert.equal(samples.getItem(0).amount,1);assert.equal(f.produced.length,0);
}
{
 const f=fixture('crusher',[item('minecraft:coal'),item('hakkai:drop_foe_0_0')]);f.run();assert.deepEqual(snap(f.to),[['hakkai:shard_0',2],undefined]);
}
console.log('Powered mixing, assembly, routing, rollback and mob-material recycling integration OK (simulated)');
for(const problem of ['no_source','empty_filter','full_output','write_failure']){
 const f=fixture('filter_router',[item('minecraft:diamond',2)]),samples=new Container(problem==='empty_filter'?[undefined]:[item('minecraft:diamond')]);
 const reject=new Container([undefined]),barrel=c=>({typeId:'minecraft:barrel',getComponent:()=>({container:c})});
 if(problem==='full_output')f.to.items=[item('minecraft:stone',64),item('minecraft:stone',64)];
 if(problem==='write_failure')f.to.failOnce=true;
 const get=f.b.dimension.getBlock;f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0&&problem!=='no_source'?{typeId:'hakkai:wind_rotor',...p,location:p}:p.x===0&&p.y===80&&p.z===-1?barrel(samples):p.x===0&&p.y===80&&p.z===1?barrel(reject):get(p);
 f.b.dimension.getBlockFromRay=()=>undefined;const before=snap(f.from),target=snap(f.to);f.run();
 assert.deepEqual(snap(f.from),before,problem);assert.deepEqual(snap(f.to),target,problem);assert.equal(reject.getItem(0),undefined);
}
