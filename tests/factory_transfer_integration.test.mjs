import {factoryResidentBonus} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_culture.js';
// Runs the actual transfer function with simulated Minecraft objects.
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {kineticNetwork,hasAdjacentWater,factoryRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js';
import {findLineRecipe,filteredDestination} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_lines.js';
import {pipeEndpoints} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transport.js';
import {fluidPumpStep,fluidBasinStep,fluidLoaderStep,adjacentWaterTank,tankState,consumeTankWater,prepareTankChange} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_fluids.js';
import {farmStep} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_farm.js';
import {itemDuctStep} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_ducts.js';
import {MINER_DEPTH,miningPassable,miningResult} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_mining.js';
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
 const ctx={ns:'hakkai:',world:{getTimeOfDay:()=>6000},currentWeather:new Map(),WeatherType:{Thunder:'thunder',Rain:'rain'},system:{currentTick:0},BlockPermutation:{resolve:id=>({id,withState:(k,v)=>({id,getState:x=>x===k?v:undefined})})},ItemStack,total,room,factoryTransaction,MINER_DEPTH,miningPassable,miningResult,kineticNetwork,hasAdjacentWater,factoryRecipe,syncKineticVisual:()=>{},findLineRecipe,filteredDestination,pipeEndpoints,fluidPumpStep,fluidBasinStep,fluidLoaderStep,adjacentWaterTank,tankState,consumeTankWater,prepareTankChange,farmStep,itemDuctStep,farmCursors:new Map(),factoryCycleAt:new Map(),production:(_,n)=>produced.push(n),report:(...x)=>reports.push(x)};
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
 ['assembler',['minecraft:string','minecraft:string','minecraft:paper'],'hakkai:bandage',2],
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
 const f=fixture('crusher',[item('minecraft:coal'),item('hakkai:drop_element_0')]);f.run();assert.deepEqual(snap(f.to),[['hakkai:shard_0',2],undefined]);
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
// End-to-end ore doubling through the actual crusher/washer/mill branches.
for(const metal of ['iron','gold','copper']){
 const crusher=fixture('crusher',[item(`minecraft:raw_${metal}`)]);
 const power=f=>{const get=f.b.dimension.getBlock;f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?{typeId:'hakkai:wind_rotor',...p,location:p}:get(p);f.b.dimension.getBlockFromRay=()=>undefined;};
 power(crusher);crusher.run();assert.deepEqual(snap(crusher.to),[[`hakkai:crushed_${metal}`,2],undefined]);
 const washer=fixture('washer',[crusher.to.getItem(0)]);power(washer);
 const get=washer.b.dimension.getBlock;washer.b.dimension.getBlock=p=>p.x===0&&p.y===80&&p.z===1?{typeId:'minecraft:water'}:get(p);
 washer.run();washer.ctx.system.currentTick=40;washer.run();assert.deepEqual(snap(washer.to),[[`hakkai:washed_${metal}`,2],undefined]);
 const mill=fixture('mill',[washer.to.getItem(0)]);power(mill);mill.run();mill.ctx.system.currentTick=40;mill.run();
 assert.deepEqual(snap(mill.to),[[`minecraft:${metal}_ingot`,2],undefined]);
}
{
 const f=fixture('washer',[item('hakkai:crushed_iron')]);const get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?{typeId:'hakkai:wind_rotor',...p,location:p}:get(p);f.b.dimension.getBlockFromRay=()=>undefined;
 f.run();assert.deepEqual(snap(f.from),[['hakkai:crushed_iron',1]]);assert.deepEqual(snap(f.to),[undefined,undefined]);
}
for(const kind of ['factory_pipe','factory_pipe_west','factory_pipe_north','factory_pipe_south','factory_pipe_up','factory_pipe_down']){
 const named=item('minecraft:diamond',2);named.nameTag='kept';const f=fixture(kind,[named]),p=pipeEndpoints(kind,{x:0,y:80,z:0});
 const barrel=c=>({typeId:'minecraft:barrel',getComponent:()=>({container:c})});
 const k=q=>`${q.x},${q.y},${q.z}`,get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=q=>k(q)===k(p.from)?barrel(f.from):k(q)===k(p.to)?barrel(f.to):get(q);
 f.run();assert.equal(f.from.getItem(0).amount,1,kind);assert.equal(f.to.getItem(0).nameTag,'kept',kind);
 const initial=snap(f.from);f.b.dimension.isChunkLoaded=q=>k(q)!==k(p.to);f.run();assert.deepEqual(snap(f.from),initial,kind);
}
console.log('Three ore doubling lines and six directional barrel pipes OK (simulated)');
for(const fault of ['unpowered','full','write_failure','overload']){
 const f=fixture('crusher',[item('minecraft:raw_iron')]);
 if(fault!=='unpowered'){
  const get=f.b.dimension.getBlock;f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?{typeId:'hakkai:wind_rotor',...p,location:p}:fault==='overload'&&p.y===80&&p.x===0&&p.z>0&&p.z<=4?{typeId:'hakkai:press',...p,location:p}:get(p);f.b.dimension.getBlockFromRay=()=>undefined;
 }
 if(fault==='full')f.to.items=[item('minecraft:stone',64),item('minecraft:stone',64)];
 if(fault==='write_failure'){let once=true;f.to.setItem=(i,v)=>{if(once){once=false;throw Error('simulated');}f.to.items[i]=v;};}
 const beforeIn=snap(f.from),beforeOut=snap(f.to);f.run();assert.deepEqual(snap(f.from),beforeIn,fault);assert.deepEqual(snap(f.to),beforeOut,fault);
}
// Exercise actual tick entry points, not just the isolated fluid helpers.
const fluidPerm=(kind,n)=>({getState:k=>k==='hakkai:fluid'?kind:k==='hakkai:level'?n:undefined,withState:(k,v)=>fluidPerm(k==='hakkai:fluid'?v:kind,k==='hakkai:level'?v:n)});
const tankBlock=(kind,n)=>({typeId:'hakkai:fluid_tank',permutation:fluidPerm(kind,n),setPermutation(p){this.permutation=p;}});
const rotor=p=>({typeId:'hakkai:wind_rotor',...p,location:p});
{
 const f=fixture('fluid_pump',[]),tank=tankBlock(0,0),get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=p=>p.x===-1&&p.y===80&&p.z===0?{typeId:'minecraft:water',permutation:{getState:()=>0}}:p.x===1&&p.y===80&&p.z===0?tank:p.x===0&&p.y===81&&p.z===0?rotor(p):get(p);f.b.dimension.getBlockFromRay=()=>undefined;
 f.run();assert.equal(tankState(tank).n,1);f.run();assert.equal(tankState(tank).n,1,'tick throttling');f.ctx.system.currentTick=40;f.run();assert.equal(tankState(tank).n,2);
}
for(const [kind,input,expected,tankKind,tankLevel,remaining] of [['fluid_loader','minecraft:lava_bucket','minecraft:bucket',0,0,4],['fluid_basin','minecraft:bucket','minecraft:lava_bucket',2,4,0],['washer','hakkai:crushed_iron','hakkai:washed_iron',1,2,1]]){
 const f=fixture(kind,[item(input)]),tank=tankBlock(tankKind,tankLevel),get=f.b.dimension.getBlock;tank.location={x:0,y:80,z:1};
 f.b.dimension.getBlock=p=>p.x===0&&p.y===80&&p.z===1?tank:p.x===0&&p.y===81&&p.z===0?rotor(p):get(p);f.b.dimension.getBlockFromRay=()=>undefined;
 f.run();assert.equal(f.to.getItem(0)?.typeId,expected,kind);assert.equal(tankState(tank).n,remaining,kind);
}
console.log('Actual powered pump, loader, basin and tank-fed washer transfers OK (simulated)');
{
 const f=fixture('fluid_basin',[item('minecraft:dirt')]),tank=tankBlock(1,4),get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=p=>p.x===0&&p.y===80&&p.z===1?tank:get(p);f.run();assert.equal(tankState(tank).n,4);assert.equal(f.to.getItem(0),undefined,'new machines never fall back to fuel');
}
{
 const f=fixture('fluid_basin',[item('minecraft:dirt')]),tank=tankBlock(1,4),get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=p=>p.x===0&&p.y===80&&p.z===1?tank:p.x===0&&p.y===81&&p.z===0?rotor(p):get(p);f.b.dimension.getBlockFromRay=()=>undefined;f.to.failOnce=true;f.run();assert.equal(tankState(tank).n,4);assert.equal(f.from.getItem(0)?.typeId,'minecraft:dirt');assert.equal(f.to.getItem(0),undefined);
}
{
 const f=fixture('fluid_pump',[]),tank=tankBlock(0,0),get=f.b.dimension.getBlock;
 const original={getState:k=>k==='liquid_depth'?0:undefined},lava={typeId:'minecraft:lava',permutation:original,setType(id){this.typeId=id;},setPermutation(p){this.permutation=p;this.typeId='minecraft:lava';}};
 f.b.dimension.getBlock=p=>p.x===-1&&p.y===80&&p.z===0?lava:p.x===1&&p.y===80&&p.z===0?tank:p.x===0&&p.y===81&&p.z===0?rotor(p):get(p);f.b.dimension.getBlockFromRay=()=>undefined;
 f.run();assert.equal(lava.typeId,'minecraft:air');assert.deepEqual(tankState(tank),{n:4,kind:2});f.ctx.system.currentTick=40;f.run();assert.equal(tankState(tank).n,4);
}
{
 const f=fixture('fluid_basin',[undefined]),lava=tankBlock(2,4),water=tankBlock(1,1),get=f.b.dimension.getBlock;lava.location={x:0,y:80,z:-1};water.location={x:0,y:80,z:1};
 f.b.dimension.getBlock=p=>p.x===0&&p.y===80&&p.z===-1?lava:p.x===0&&p.y===80&&p.z===1?water:p.x===0&&p.y===81&&p.z===0?rotor(p):get(p);f.b.dimension.getBlockFromRay=()=>undefined;
 f.run();assert.equal(f.to.getItem(0)?.typeId,'minecraft:obsidian');assert.equal(tankState(lava).n,0);assert.equal(tankState(water).n,0);
}
const cropPerm=(state,age)=>({getState:k=>k===state?age:undefined,withState:(k,v)=>cropPerm(k,v)});
{
 const f=fixture('farm_harvester',[]),get=f.b.dimension.getBlock;const crop={typeId:'hakkai:summer_corn',permutation:cropPerm('hakkai:age',3),setPermutation(p){this.permutation=p;}};
 const output={typeId:'minecraft:barrel',getComponent:()=>({container:f.to})};
 f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?output:p.x===0&&p.y===80&&p.z===-1?rotor(p):p.x===1&&p.y===80&&p.z===0?crop:p.x===1&&p.y===79&&p.z===0?{typeId:'minecraft:farmland'}:get(p);f.b.dimension.getBlockFromRay=()=>undefined;
 f.run();assert.deepEqual(snap(f.to),[['hakkai:summer_corn_produce',2],undefined]);assert.equal(crop.permutation.getState('hakkai:age'),0);
}
{
 const f=fixture('farm_fertilizer',[item('minecraft:bone_meal')]),tank=tankBlock(1,2),get=f.b.dimension.getBlock;tank.location={x:0,y:81,z:0};const crop={typeId:'minecraft:wheat',permutation:cropPerm('growth',3),setPermutation(p){this.permutation=p;}};
 f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?tank:p.x===0&&p.y===80&&p.z===-1?rotor(p):p.x===1&&p.y===80&&p.z===0?crop:p.x===1&&p.y===79&&p.z===0?{typeId:'minecraft:farmland'}:get(p);f.b.dimension.getBlockFromRay=()=>undefined;
 f.run();assert.equal(crop.permutation.getState('growth'),4);assert.equal(tankState(tank).n,1);assert.equal(f.from.getItem(0),undefined);
}
{
 const named=item('minecraft:diamond',2);named.nameTag='named';const f=fixture('item_extractor',[named]),get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?rotor(p):get(p);f.b.dimension.getBlockFromRay=()=>undefined;f.run();assert.equal(f.to.getItem(0)?.nameTag,'named');assert.equal(f.from.getItem(0).amount,1);
}
console.log('Actual powered farm harvester, fertilizer and duct extractor wiring OK (simulated)');
{
 const f=fixture('farm_planter',[item('minecraft:wheat_seeds')]),get=f.b.dimension.getBlock,air={typeId:'minecraft:air',permutation:cropPerm('growth',0),setPermutation(p){this.permutation=p;this.typeId=p.id??'minecraft:air';}};
 f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?rotor(p):p.x===1&&p.y===80&&p.z===0?air:p.x===1&&p.y===79&&p.z===0?{typeId:'minecraft:farmland'}:get(p);f.b.dimension.getBlockFromRay=()=>undefined;
 f.run();assert.equal(air.typeId,'minecraft:wheat');assert.equal(f.from.getItem(0),undefined);
}
{
 // Complete seasonal crop -> powered duct -> powered bread assembly line.
 const harvest=fixture('farm_harvester',[]),crop={typeId:'hakkai:summer_corn',permutation:cropPerm('hakkai:age',3),setPermutation(p){this.permutation=p;}},hget=harvest.b.dimension.getBlock;
 const barrel=c=>({typeId:'minecraft:barrel',getComponent:()=>({container:c})});
 harvest.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?barrel(harvest.to):p.x===0&&p.y===80&&p.z===-1?rotor(p):p.x===1&&p.y===80&&p.z===0?crop:p.x===1&&p.y===79&&p.z===0?{typeId:'minecraft:farmland'}:hget(p);harvest.b.dimension.getBlockFromRay=()=>undefined;harvest.run();
 const assembler=fixture('assembler',[item('minecraft:wheat'),undefined,undefined]),aget=assembler.b.dimension.getBlock;
 assembler.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?rotor(p):aget(p);assembler.b.dimension.getBlockFromRay=()=>undefined;
 const duct=fixture('item_extractor',[]),dget=duct.b.dimension.getBlock;
 duct.b.dimension.getBlock=p=>p.x===-1&&p.y===80&&p.z===0?barrel(harvest.to):p.x===1&&p.y===80&&p.z===0?barrel(assembler.from):p.x===0&&p.y===81&&p.z===0?rotor(p):dget(p);duct.b.dimension.getBlockFromRay=()=>undefined;
 duct.run();duct.ctx.system.currentTick=40;duct.run();assert.equal(assembler.from.getItem(1)?.amount,2);assembler.run();assert.deepEqual(snap(assembler.to),[['minecraft:bread',2],undefined]);assert.equal(crop.permutation.getState('hakkai:age'),0);
}
console.log('Seasonal harvesting → powered transport → bread assembly end-to-end OK (simulated)');
for(const type of ['farm_harvester','farm_fertilizer','farm_planter','item_extractor']){
 const f=fixture(type,[item('minecraft:wheat_seeds')]),before=snap(f.from);f.run();assert.deepEqual(snap(f.from),before,type+' no power');assert.deepEqual(snap(f.to),[undefined,undefined],type+' no power');
}
// The village's exact powered crusher setup runs a real inventory transaction
// and then updates the actual town production record; failed output does not.
{
 const f=fixture('crusher',[item('minecraft:cobblestone',2)]),get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=p=>p.x===0&&p.y===80&&p.z===1?{typeId:'hakkai:wind_rotor',...p,location:p}:get(p);
 f.b.dimension.getBlockFromRay=()=>undefined;
 Object.assign(f.b.dimension,{spawnParticle(){},playSound(){},getPlayers(){return [];}});
 const town={data:{goods:3,work:0},factoryVillage:true};
 Object.assign(f.ctx,{factoryResidentBonus,townNear:()=>town,townRecord:t=>t.data,townSave:(t,v)=>t.data=v,state:()=>({})});f.ctx.world.getAbsoluteTime=()=>450;
 vm.runInContext(src.slice(src.indexOf('function production(b,count){'),src.indexOf('function gatherTown(')),f.ctx);
 f.run();assert.equal(f.to.getItem(0).typeId,'minecraft:gravel');assert.equal(town.data.goods,4);assert.equal(town.data.work,450);
 f.ctx.system.currentTick=50;f.to.failOnce=true;f.run();assert.equal(town.data.goods,4,'failed inventory write never awards goods');
}
// A real successful transaction with a matching adult worker in range gives
// exactly one extra abstract goods unit. Inventory failure gives neither.
{
 const f=fixture('crusher',[item('minecraft:cobblestone',2)]),get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=p=>p.x===0&&p.y===80&&p.z===1?{typeId:'hakkai:wind_rotor',...p,location:p}:get(p);
 f.b.dimension.getBlockFromRay=()=>undefined;
 const worker={isValid:true,nameTag:'風車村の住人 1｜粉砕係',getComponent:()=>undefined};
 Object.assign(f.b.dimension,{spawnParticle(){},playSound(){},getPlayers(){return [];},getEntities(){return [worker];}});
 const town={data:{goods:3,work:0},factoryVillage:true};
 Object.assign(f.ctx,{factoryResidentBonus,townNear:()=>town,townRecord:t=>t.data,townSave:(t,v)=>t.data=v,state:()=>({})});f.ctx.world.getAbsoluteTime=()=>450;
 vm.runInContext(src.slice(src.indexOf('function production(b,count){'),src.indexOf('function gatherTown(')),f.ctx);
 f.run();assert.equal(town.data.goods,5);assert.equal(f.to.getItem(0).amount,1,'worker does not duplicate physical output');
 f.ctx.system.currentTick=50;f.to.failOnce=true;f.run();assert.equal(town.data.goods,5,'failed transaction adds no bonus');
}
// Compressor/sorter are useful with only vanilla materials; the sorter moves
// the selected actual stack with its metadata rather than fabricating an item.
for(const [input,output] of [['iron_ingot','iron_block'],['gold_ingot','gold_block'],['copper_ingot','copper_block'],['diamond','diamond_block'],['emerald','emerald_block'],['coal','coal_block'],['redstone','redstone_block']]){
 const f=fixture('compressor',[item('minecraft:'+input,9)]);f.run();assert.deepEqual(snap(f.from),[undefined]);assert.deepEqual(snap(f.to),[['minecraft:'+output,1],undefined]);
 const short=fixture('compressor',[item('minecraft:'+input,8)]);short.run();assert.deepEqual(snap(short.from),[['minecraft:'+input,8]]);assert.deepEqual(snap(short.to),[undefined,undefined]);
}
for(const id of ['minecraft:raw_iron','minecraft:gold_ingot','hakkai:crushed_copper','hakkai:washed_iron','hakkai:shard_2']){
 const a=item(id,2);a.nameTag='kept name';const f=fixture('sorter',[a]);f.run();
 assert.equal(f.from.getItem(0).amount,1);assert.equal(f.to.getItem(0).typeId,id);assert.equal(f.to.getItem(0).nameTag,'kept name');
}
{
 const a=item('minecraft:raw_iron');a.nameTag='kept';const f=fixture('sorter',[a],[item('minecraft:stone',64)]);f.run();
 assert.equal(f.from.getItem(0).nameTag,'kept');assert.equal(f.to.getItem(0).typeId,'minecraft:stone');
}
// Mining writes output first; if a callback replaces or unloads the ore,
// undo the output and fuel but do not overwrite the new world state.
for(const changed of ['replace','unloaded']){
 const f=fixture('miner',[item('minecraft:coal')]),d=f.b.dimension,get=d.getBlock,set=f.to.setItem.bind(f.to);let changedNow=false;
 d.getBlock=q=>changedNow&&changed==='replace'&&q.x===0&&q.y<80&&q.z===0?{typeId:'minecraft:diamond_block'}:get(q);
 const loaded=d.isChunkLoaded;d.isChunkLoaded=q=>changedNow&&changed==='unloaded'&&q.x===0&&q.y<80&&q.z===0?false:loaded(q);
 f.to.setItem=(i,v)=>{set(i,v);changedNow=true;};
 f.run();assert.equal(f.from.getItem(0).amount,1);assert.equal(f.to.getItem(0),undefined);assert.equal(f.produced.length,0);assert.equal(f.ore.typeId,'hakkai:ore_3');if(changed==='replace')assert.equal(d.getBlock({x:0,y:79,z:0}).typeId,'minecraft:diamond_block');
}
// Recheck the fixed harvester's output position after writing the product.
{
 const f=fixture('farm_harvester',[]),get=f.b.dimension.getBlock,crop={typeId:'minecraft:wheat',permutation:cropPerm('growth',7),setPermutation(p){this.permutation=p;}},output={typeId:'minecraft:barrel',getComponent:()=>({container:f.to})};let replaced=false;
 f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?(replaced?{typeId:'minecraft:stone'}:output):p.x===0&&p.y===80&&p.z===-1?rotor(p):p.x===1&&p.y===80&&p.z===0?crop:p.x===1&&p.y===79&&p.z===0?{typeId:'minecraft:farmland'}:get(p);
 f.b.dimension.getBlockFromRay=()=>undefined;const set=f.to.setItem.bind(f.to);f.to.setItem=(i,v)=>{set(i,v);replaced=true;};f.run();
 assert.equal(f.to.getItem(0),undefined);assert.equal(crop.permutation.getState('growth'),7);assert.equal(f.produced.length,0);
}
{
 const f=fixture('miner',[item('minecraft:coal')]),d=f.b.dimension,get=d.getBlock,set=f.to.setItem.bind(f.to);let replaced=false;
 d.getBlock=q=>replaced&&q.x===1&&q.y===80&&q.z===0?{typeId:'minecraft:stone'}:get(q);f.to.setItem=(i,v)=>{set(i,v);replaced=true;};
 f.run();assert.equal(f.ore.typeId,'hakkai:ore_3');assert.equal(f.to.getItem(0),undefined);assert.equal(f.from.getItem(0).amount,1);assert.equal(f.produced.length,0);
}

// A washer rechecks the live water and machine after inventory mutations.
for(const fault of ['tank_changed','tank_replaced','tank_unloaded','tank_write','water_removed','machine_replaced','barrel_removed']){
 const f=fixture('washer',[item('hakkai:crushed_iron')]),get=f.b.dimension.getBlock;
 let water={typeId:'minecraft:water'},machine=f.b,barrelValid=true;
 const tank=tankBlock(1,2);tank.location={x:0,y:80,z:1};if(fault==='tank_write'){let fail=true;tank.setPermutation=function(p){this.permutation=p;if(fail){fail=false;throw Error('tank write failed after mutation');}};}
 const usesTank=fault.startsWith('tank_');
 f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?rotor(p):p.x===0&&p.y===80&&p.z===1?(usesTank?tank:water):p.x===0&&p.y===80&&p.z===0?machine:p.x===1&&p.y===80&&p.z===0&&!barrelValid?{typeId:'minecraft:air'}:get(p);
 f.b.dimension.getBlockFromRay=()=>undefined;
 const original=f.to.setItem.bind(f.to);let first=true;
 f.to.setItem=(i,v)=>{original(i,v);if(!first)return;first=false;
  if(fault==='tank_changed')tank.permutation=fluidPerm(1,7);
  if(fault==='tank_replaced')tank.typeId='minecraft:stone';
  if(fault==='tank_unloaded')f.b.dimension.isChunkLoaded=p=>!(p.x===0&&p.y===80&&p.z===1);
  if(fault==='water_removed')water={typeId:'minecraft:air'};
  if(fault==='machine_replaced')machine={typeId:'minecraft:stone'};
  if(fault==='barrel_removed')barrelValid=false;
 };
 f.run();assert.deepEqual(snap(f.from),[['hakkai:crushed_iron',1]],fault);assert.deepEqual(snap(f.to),[undefined,undefined],fault);
 if(fault==='tank_changed')assert.equal(tankState(tank).n,7);if(fault==='tank_replaced')assert.equal(tank.typeId,'minecraft:stone');
 if(fault==='tank_write')assert.equal(tankState(tank).n,2);assert.ok(f.reports.length,fault);
}

for(const [kind,inputs] of [
 ['factory_pipe',[item('minecraft:diamond',2)]],
 ['mill',[item('minecraft:coal'),item('minecraft:raw_iron',2)]],
 ['kiln',[item('minecraft:coal'),item('minecraft:sand',2)]],
 ['crusher',[item('minecraft:coal'),item('minecraft:cobblestone')]],
 ['mixer',[item('minecraft:glass_bottle'),item('minecraft:glow_berries'),item('hakkai:crystal_1')]],
 ['assembler',[item('minecraft:string',2),item('minecraft:paper')]],
 ['fluid_loader',[item('minecraft:water_bucket')]],
 ['fluid_basin',[item('minecraft:dirt')]],
])for(const fault of ['machine','input','output','unloaded']){
 const f=fixture(kind,inputs),get=f.b.dimension.getBlock,tank=tankBlock(kind==='fluid_basin'?1:0,kind==='fluid_basin'?4:0);tank.location={x:0,y:80,z:1};
 let changed=false;
 f.b.dimension.getBlock=p=>{
  if(changed&&fault==='machine'&&p.x===0&&p.y===80&&p.z===0)return {typeId:'minecraft:stone'};
  if(changed&&fault==='input'&&p.x===-1&&p.y===80&&p.z===0)return {typeId:'minecraft:stone'};
  if(changed&&fault==='output'&&p.x===1&&p.y===80&&p.z===0)return {typeId:'minecraft:stone'};
  if(p.x===0&&p.y===81&&p.z===0)return rotor(p);
  if(p.x===0&&p.y===80&&p.z===1&&(kind==='fluid_loader'||kind==='fluid_basin'))return tank;
  return get(p);
 };
 f.b.dimension.getBlockFromRay=()=>undefined;
 f.b.dimension.isChunkLoaded=p=>!(changed&&fault==='unloaded'&&p.x===-1&&p.y===80&&p.z===0);
 const before=snap(f.from),write=f.to.setItem.bind(f.to);let first=true;
 f.to.setItem=(i,v)=>{write(i,v);if(first){first=false;changed=true;}};
 f.run();assert.deepEqual(snap(f.from),before,`${kind} ${fault}: input`);assert.deepEqual(snap(f.to),[undefined,undefined],`${kind} ${fault}: output`);
 if(kind==='fluid_loader')assert.deepEqual(tankState(tank),{kind:0,n:0});
 if(kind==='fluid_basin')assert.deepEqual(tankState(tank),{kind:1,n:4});
 assert.ok(f.reports.length,`${kind} ${fault}: reported`);
}
for(const match of [true,false])for(const fault of ['filter','reject','accept','input','machine','unloaded']){
 const named=item('minecraft:diamond',2);named.nameTag='kept';const f=fixture('filter_router',[named]);
 const samples=new Container([item(match?'minecraft:diamond':'minecraft:stone')]),reject=new Container([undefined]);
 const barrel=c=>({typeId:'minecraft:barrel',getComponent:()=>({container:c})}),get=f.b.dimension.getBlock;let changed=false;
 f.b.dimension.getBlock=p=>{
  const k=`${p.x},${p.y},${p.z}`;
  if(changed&&({filter:'0,80,-1',reject:'0,80,1',accept:'1,80,0',input:'-1,80,0',machine:'0,80,0'})[fault]===k)return {typeId:'minecraft:stone'};
  if(k==='0,81,0')return rotor(p);if(k==='0,80,-1')return barrel(samples);if(k==='0,80,1')return barrel(reject);return get(p);
 };
 f.b.dimension.isChunkLoaded=p=>!(changed&&fault==='unloaded'&&p.x===0&&p.y===80&&p.z===-1);
 f.b.dimension.getBlockFromRay=()=>undefined;
 const out=match?f.to:reject,write=out.setItem.bind(out);let first=true;out.setItem=(i,v)=>{write(i,v);if(first){first=false;changed=true;}};
 f.run();assert.equal(f.from.getItem(0).amount,2,`${match} ${fault}`);assert.equal(f.from.getItem(0).nameTag,'kept');assert.equal(out.getItem(0),undefined);assert.ok(f.reports.length);
}
for(const match of [true,false])for(const fault of ['flip','empty']){
 const named=item('minecraft:diamond',2);named.nameTag='kept';const f=fixture('filter_router',[named]);
 const samples=new Container([item(match?'minecraft:diamond':'minecraft:stone')]),reject=new Container([undefined]);
 const barrel=c=>({typeId:'minecraft:barrel',getComponent:()=>({container:c})}),get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=p=>p.x===0&&p.y===81&&p.z===0?rotor(p):p.x===0&&p.y===80&&p.z===-1?barrel(samples):p.x===0&&p.y===80&&p.z===1?barrel(reject):get(p);
 f.b.dimension.getBlockFromRay=()=>undefined;const out=match?f.to:reject,write=out.setItem.bind(out);let first=true;
 out.setItem=(i,v)=>{write(i,v);if(first){first=false;samples.items=[fault==='empty'?undefined:item(match?'minecraft:stone':'minecraft:diamond')];}};
 f.run();assert.equal(f.from.getItem(0).amount,2,`${match} ${fault}`);assert.equal(f.from.getItem(0).nameTag,'kept');assert.equal(out.getItem(0),undefined);assert.ok(f.reports.length);
}

// The three fixed farms must not act after their machine is removed or
// becomes unreadable during an inventory write. All use actual transfer().
for(const kind of ['farm_planter','farm_harvester','farm_fertilizer'])for(const fault of ['replaced','unloaded']){
 const f=fixture(kind,kind==='farm_planter'?[item('minecraft:wheat_seeds')]:kind==='farm_fertilizer'?[item('minecraft:bone_meal')]:[]);
 const d=f.b.dimension,get=d.getBlock,loaded=d.isChunkLoaded;
 const crop={typeId:kind==='farm_planter'?'minecraft:air':'minecraft:wheat',permutation:cropPerm('growth',kind==='farm_harvester'?7:3),setPermutation(p){this.permutation=p;this.typeId=p.id??this.typeId;}};
 const tank=tankBlock(1,2);tank.location={x:0,y:81,z:0};const output={typeId:'minecraft:barrel',getComponent:()=>({container:f.to})};let changed=false;
 d.getBlock=p=>p.x===0&&p.y===80&&p.z===0&&changed&&fault==='replaced'?{typeId:'minecraft:diamond_block'}:
  p.x===0&&p.y===81&&p.z===0?(kind==='farm_harvester'?output:kind==='farm_fertilizer'?tank:rotor(p)):
  p.x===0&&p.y===80&&p.z===-1?rotor(p):p.x===1&&p.y===80&&p.z===0?crop:p.x===1&&p.y===79&&p.z===0?{typeId:'minecraft:farmland'}:get(p);
 d.isChunkLoaded=p=>changed&&fault==='unloaded'&&p.x===0&&p.y===80&&p.z===0?false:loaded(p);d.getBlockFromRay=()=>undefined;
 const inventory=kind==='farm_harvester'?f.to:f.from, before=snap(inventory),set=inventory.setItem.bind(inventory);
 inventory.setItem=(i,v)=>{set(i,v);changed=true;};f.run();
 assert.deepEqual(snap(inventory),before,kind+' '+fault);assert.equal(crop.typeId,kind==='farm_planter'?'minecraft:air':'minecraft:wheat');
 assert.equal(crop.permutation.getState('growth'),kind==='farm_harvester'?7:3);assert.equal(tankState(tank).n,2);assert.equal(f.produced.length,0);assert.ok(f.reports.length);
}
// A mutation can also happen after water has been consumed but before the
// crop update. Restore water and fertilizer if the machine disappears then.
{
 const f=fixture('farm_fertilizer',[item('minecraft:bone_meal')]),d=f.b.dimension,get=d.getBlock,tank=tankBlock(1,2);tank.location={x:0,y:81,z:0};
 const crop={typeId:'minecraft:wheat',permutation:cropPerm('growth',3),setPermutation(p){this.permutation=p;}},set=tank.setPermutation.bind(tank);let changed=false;
 tank.setPermutation=p=>{set(p);changed=true;};
 d.getBlock=p=>p.x===0&&p.y===80&&p.z===0&&changed?{typeId:'minecraft:stone'}:p.x===0&&p.y===81&&p.z===0?tank:p.x===0&&p.y===80&&p.z===-1?rotor(p):p.x===1&&p.y===80&&p.z===0?crop:p.x===1&&p.y===79&&p.z===0?{typeId:'minecraft:farmland'}:get(p);d.getBlockFromRay=()=>undefined;
 f.run();assert.equal(f.from.getItem(0).amount,1);assert.equal(tankState(tank).n,2);assert.equal(crop.permutation.getState('growth'),3);assert.equal(f.produced.length,0);
}
// Changing the miner or the cells between it and a deeper ore after the
// output write must abort. Restoring inventory never overwrites the changed
// machine/path. A passable replacement may still be mined through.
for(const fault of ['machine','machine_unloaded','path_blocked','nearer_ore','path_unloaded','path_passable']){
 const f=fixture('miner',[item('minecraft:coal')]),d=f.b.dimension,get=d.getBlock,loaded=d.isChunkLoaded,set=f.to.setItem.bind(f.to);let changed=false;
 const pathAfter=fault==='path_blocked'?'minecraft:diamond_block':fault==='nearer_ore'?'minecraft:iron_ore':'minecraft:deepslate';
 d.getBlock=p=>p.x===0&&p.z===0&&p.y===80&&changed&&fault==='machine'?{typeId:'minecraft:stone'}:
  p.x===0&&p.z===0&&p.y===79?{typeId:changed?pathAfter:'minecraft:stone'}:get(p);
 d.isChunkLoaded=p=>changed&&p.x===0&&p.z===0&&((p.y===80&&fault==='machine_unloaded')||(p.y===79&&fault==='path_unloaded'))?false:loaded(p);
 f.to.setItem=(i,v)=>{set(i,v);changed=true;};f.run();
 if(fault==='path_passable'){assert.equal(f.ore.typeId,'minecraft:air');assert.equal(f.to.getItem(0).typeId,'hakkai:crystal_3');assert.equal(f.from.getItem(0),undefined);assert.equal(f.produced.length,1);}
 else {assert.equal(f.ore.typeId,'hakkai:ore_3',fault);assert.equal(f.to.getItem(0),undefined,fault);assert.equal(f.from.getItem(0).amount,1,fault);assert.equal(f.produced.length,0,fault);assert.ok(f.reports.length,fault);}
}

// Run the actual miner transaction for every documented ore at every
// supported depth. The guide and runtime share only the mapping, so this
// separately verifies the path scan, inventory and world writes.
for(const {block,out} of (await import('../Hakkai_v7.1.0/BehaviorPack/scripts/factory_mining.js')).miningGuideTargets(20))for(let depth=1;depth<=6;depth++){
 const f=fixture('miner',[item('minecraft:coal')]),get=f.b.dimension.getBlock;f.ore.typeId=block;
 f.b.dimension.getBlock=p=>p.x===0&&p.z===0&&p.y<80?(p.y===80-depth?f.ore:{typeId:'minecraft:stone'}):get(p);
 f.run();assert.equal(f.ore.typeId,'minecraft:air',`${block} depth ${depth}`);assert.deepEqual(snap(f.to),[[out,1],undefined],`${block} depth ${depth}`);assert.equal(f.from.getItem(0),undefined);
}
for(const obstacle of ['minecraft:dirt','minecraft:diamond_ore','minecraft:nether_gold_ore','minecraft:water','hakkai:gantry_frame']){
 const f=fixture('miner',[item('minecraft:coal')]),get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=p=>p.x===0&&p.z===0&&p.y===79?{typeId:obstacle}:get(p);f.run();
 assert.equal(f.ore.typeId,'hakkai:ore_3',obstacle);assert.equal(f.from.getItem(0).amount,1);assert.equal(f.to.getItem(0),undefined);
}
{
 // Stone and air are skipped, but depth seven is outside the actual scan.
 const f=fixture('miner',[item('minecraft:coal')]),get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=p=>p.x===0&&p.z===0&&p.y<80?(p.y===73?f.ore:{typeId:'minecraft:air'}):get(p);f.run();
 assert.equal(f.ore.typeId,'hakkai:ore_3');assert.equal(f.from.getItem(0).amount,1);assert.equal(f.to.getItem(0),undefined);
}
{
 // A nearer supported ore wins even if another supported ore is below it.
 const f=fixture('miner',[item('minecraft:coal')]),get=f.b.dimension.getBlock,near={typeId:'minecraft:iron_ore',permutation:{id:'iron'},setType(id){this.typeId=id;},setPermutation(){this.typeId='minecraft:iron_ore';}};
 f.b.dimension.getBlock=p=>p.x===0&&p.z===0&&p.y===79?near:get(p);f.run();
 assert.equal(near.typeId,'minecraft:air');assert.equal(f.ore.typeId,'hakkai:ore_3');assert.equal(f.to.getItem(0).typeId,'minecraft:raw_iron');
}
for(const fault of ['no_fuel','full','unloaded','night_skip','rain_skip']){
 const f=fixture('miner',fault==='no_fuel'?[undefined]:[item('minecraft:coal')],fault==='full'?[item('minecraft:stone',64)]:[undefined,undefined]);
 if(fault==='unloaded')f.b.dimension.isChunkLoaded=p=>p.y!==79;
 if(fault==='night_skip'){f.ctx.world.getTimeOfDay=()=>14000;f.ctx.system.currentTick=30;}
 if(fault==='rain_skip'){f.ctx.currentWeather.set('hakkai:realm_0','rain');f.ctx.system.currentTick=0;}
 const before=snap(f.from),out=snap(f.to);f.run();assert.equal(f.ore.typeId,'hakkai:ore_3',fault);assert.deepEqual(snap(f.from),before,fault);assert.deepEqual(snap(f.to),out,fault);
}
{
 // The miner can use a running mechanical network without a fuel item.
 const f=fixture('miner',[undefined]),get=f.b.dimension.getBlock;
 f.b.dimension.getBlock=p=>p.x===0&&p.y===80&&p.z===1?{typeId:'hakkai:water_wheel',...p,location:p}:p.x===0&&p.y===80&&p.z===2?{typeId:'minecraft:water'}:get(p);
 f.run();assert.equal(f.ore.typeId,'minecraft:air');assert.equal(f.to.getItem(0).typeId,'hakkai:crystal_3');assert.equal(f.from.getItem(0),undefined);
}
