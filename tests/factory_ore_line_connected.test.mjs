import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {kineticNetwork,hasAdjacentWater,factoryRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js';
import {findLineRecipe,filteredDestination} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_lines.js';
import {pipeEndpoints} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transport.js';
import {fluidPumpStep,fluidBasinStep,fluidLoaderStep,adjacentWaterTank,tankState,consumeTankWater,prepareTankChange} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_fluids.js';
import {farmStep} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_farm.js';
import {itemDuctStep} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_ducts.js';
import {MINER_DEPTH,miningPassable,miningResult} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_mining.js';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';

class ItemStack{
 constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64})}
 clone(){return new ItemStack(this.typeId,this.amount)}
 isStackableWith(other){return this.typeId===other.typeId}
}
class Container{
 constructor(items=[]){this.items=Array.from({length:4},(_,i)=>items[i]);this.size=this.items.length}
 getItem(i){return this.items[i]?.clone()}
 setItem(i,v){this.items[i]=v?.clone()}
}
const item=(id,amount=1)=>new ItemStack(id,amount);
const snap=c=>c.items.filter(Boolean).map(i=>[i.typeId,i.amount]);
const key=({x,y,z})=>`${x},${y},${z}`;
const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
const start=src.indexOf('function transfer(b){'),end=src.indexOf("safeSub('system','before','startup'",start);
assert.ok(start>=0&&end>start);
function line(metal){
 const blocks=new Map(),containers=[new Container([item(`minecraft:raw_${metal}`)]),new Container(),new Container(),new Container()],reports=[],produced=[];
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getBlockFromRay:()=>undefined,getBlock(p){return blocks.get(key(p))??{typeId:'minecraft:air',...p,location:{...p},dimension:d}}};
 function put(x,y,z,id,extra={}){const p={x,y,z},b={typeId:id.startsWith('minecraft:')?id:'hakkai:'+id,...p,location:p,dimension:d,...extra};blocks.set(key(p),b);return b}
 const barrels=containers.map((c,i)=>put(i*2-1,80,0,'minecraft:barrel',{getComponent:()=>({container:c})}));
 const machines=['crusher','washer','mill'].map((id,i)=>put(i*2,80,0,id));
 for(let x=0;x<=4;x++)put(x,81,0,x===1?'clutch':'shaft',x===1?{permutation:{getState:()=>1}}:{});
 const clutch=blocks.get('1,81,0');let engaged=true;clutch.permutation.getState=()=>engaged?1:0;
 put(0,82,0,'wind_rotor');put(2,80,1,'minecraft:water');
 const total=(c,id)=>c.items.reduce((n,v)=>n+(v?.typeId===id?v.amount:0),0);
 const room=(c,s)=>c.items.reduce((n,v)=>n+(!v?s.maxAmount:v.isStackableWith(s)?v.maxAmount-v.amount:0),0)>=s.amount;
 const ctx={ns:'hakkai:',world:{getTimeOfDay:()=>6000},currentWeather:new Map(),WeatherType:{Thunder:'thunder',Rain:'rain'},system:{currentTick:0},BlockPermutation:{resolve:id=>({id,withState:(k,v)=>({id,getState:x=>x===k?v:undefined})})},ItemStack,total,room,factoryTransaction,MINER_DEPTH,miningPassable,miningResult,kineticNetwork,hasAdjacentWater,factoryRecipe,syncKineticVisual:()=>{},findLineRecipe,filteredDestination,pipeEndpoints,fluidPumpStep,fluidBasinStep,fluidLoaderStep,adjacentWaterTank,tankState,consumeTankWater,prepareTankChange,farmStep,itemDuctStep,farmCursors:new Map(),factoryCycleAt:new Map(),production:(b,n)=>produced.push([b.typeId,n]),report:(...x)=>reports.push(x)};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
 return {d,blocks,put,barrels,machines,containers,ctx,reports,produced,setEngaged:v=>engaged=v,run(t){ctx.system.currentTick=t;for(const b of machines)ctx.transfer(b)}};
}
for(const metal of ['iron','gold','copper'])test(`connected powered ${metal} line processes shared barrels from ore to two ingots`,()=>{
 const f=line(metal);for(const m of f.machines){const n=kineticNetwork(f.d,m.location);assert.equal(n.status,'running');assert.equal(n.capacity,128);assert.equal(n.demand,88);assert.equal(n.rpm,16)}
 f.run(0);assert.deepEqual(f.containers.map(snap),[[],[[`hakkai:crushed_${metal}`,1]],[],[[`minecraft:${metal}_ingot`,1]]]);
 f.run(39);assert.deepEqual(snap(f.containers[3]),[[`minecraft:${metal}_ingot`,1]]);
 f.run(40);assert.deepEqual(f.containers.map(snap),[[],[],[],[[`minecraft:${metal}_ingot`,2]]]);assert.equal(f.reports.length,0);
});
test('connected line retains intermediate ore while water is missing and resumes after water returns',()=>{
 const f=line('iron');f.blocks.delete('2,80,1');f.run(0);f.run(40);
 assert.deepEqual(f.containers.map(snap),[[],[['hakkai:crushed_iron',2]],[],[]]);
 f.put(2,80,1,'minecraft:water');f.run(80);f.run(120);
 assert.deepEqual(f.containers.map(snap),[[],[],[],[['minecraft:iron_ingot',2]]]);
});
test('a disengaged clutch isolates the washer and mill without consuming their inputs',()=>{
 const f=line('copper');f.setEngaged(false);f.run(0);f.run(40);
 assert.deepEqual(f.containers.map(snap),[[],[['hakkai:crushed_copper',2]],[],[]]);assert.equal(kineticNetwork(f.d,f.machines[1].location).status,'no_source');
 f.setEngaged(true);f.run(80);f.run(120);assert.deepEqual(snap(f.containers[3]),[['minecraft:copper_ingot',2]]);
});
test('a full output barrel retains intermediate material and resumes when emptied',()=>{
 const f=line('gold');f.containers[3].items=Array.from({length:4},()=>item('minecraft:stone',64));f.run(0);f.run(40);
 assert.deepEqual(f.containers.map(snap),[[],[],[['hakkai:washed_gold',2]],Array.from({length:4},()=>['minecraft:stone',64])]);
 f.containers[3].items.fill(undefined);f.run(80);f.run(120);assert.deepEqual(f.containers.map(snap),[[],[],[],[['minecraft:gold_ingot',2]]]);
});
test('overload blocks every stage including with fallback fuel and resumes once removed',()=>{
 const f=line('iron');f.containers[0].items[1]=item('minecraft:coal',1);f.put(4,81,1,'press');
 for(const m of f.machines)assert.equal(kineticNetwork(f.d,m.location).status,'overload');
 f.run(0);assert.deepEqual(f.containers.map(snap),[[['minecraft:raw_iron',1],['minecraft:coal',1]],[],[],[]]);
 f.blocks.delete('4,81,1');f.run(40);f.run(80);assert.deepEqual(snap(f.containers[3]),[['minecraft:iron_ingot',2]]);assert.deepEqual(snap(f.containers[0]),[['minecraft:coal',1]]);
});
test('an unloaded network boundary does not partially power the line',()=>{
 const f=line('iron');f.d.isChunkLoaded=p=>key(p)!=='3,82,0';for(const m of f.machines)assert.equal(kineticNetwork(f.d,m.location).status,'incomplete');
 f.run(0);assert.deepEqual(f.containers.map(snap),[[['minecraft:raw_iron',1]],[],[],[]]);
 f.d.isChunkLoaded=()=>true;f.run(40);f.run(80);assert.deepEqual(snap(f.containers[3]),[['minecraft:iron_ingot',2]]);
});
for(const stage of ['crusher','washer','mill'])for(const fault of ['source_removed','overload','unloaded'])test(`${stage}: connected power ${fault} during inventory write stops ore processing`,()=>{
 const f=line('iron'),index=['crusher','washer','mill'].indexOf(stage),input=f.containers[index],output=f.containers[index+1];
 if(index>0){f.containers[0].items.fill(undefined);input.items[0]=item(index===1?'hakkai:crushed_iron':'hakkai:washed_iron')}
 let first=true;const set=output.setItem.bind(output);output.setItem=(i,v)=>{set(i,v);if(first){first=false;if(fault==='source_removed')f.blocks.delete('0,82,0');if(fault==='overload')f.put(4,81,1,'press');if(fault==='unloaded')f.d.isChunkLoaded=p=>key(p)!=='3,82,0'}};
 f.ctx.transfer(f.machines[index]);
 assert.deepEqual(snap(input),[[index===0?'minecraft:raw_iron':index===1?'hakkai:crushed_iron':'hakkai:washed_iron',1]]);
 assert.deepEqual(snap(output),[]);assert.ok(f.reports.length);assert.equal(f.produced.length,0);
});
test('a changed but still powered gear ratio aborts the stale washer cadence',()=>{
 const f=line('iron');f.put(0,83,0,'wind_rotor');f.containers[0].items.fill(undefined);f.containers[1].items[0]=item('hakkai:crushed_iron');
 let first=true;const set=f.containers[2].setItem.bind(f.containers[2]);f.containers[2].setItem=(i,v)=>{set(i,v);if(first){first=false;f.put(1,81,0,'gear_up')}};
 f.ctx.transfer(f.machines[1]);const net=kineticNetwork(f.d,f.machines[1].location);assert.equal(net.status,'running');assert.equal(net.rpm,-32);
 assert.deepEqual(snap(f.containers[1]),[['hakkai:crushed_iron',1]]);assert.deepEqual(snap(f.containers[2]),[]);assert.ok(f.reports.length);
});
test('washer restores tank water and items if power fails during tank write',()=>{
 const f=line('iron');f.containers[0].items.fill(undefined);f.containers[1].items[0]=item('hakkai:crushed_iron');
 const perm=(fluid,level)=>({getState:k=>k==='hakkai:fluid'?fluid:k==='hakkai:level'?level:undefined,withState:(k,v)=>perm(k==='hakkai:fluid'?v:fluid,k==='hakkai:level'?v:level)});
 let first=true;const tank=f.put(2,80,1,'fluid_tank',{permutation:perm(1,2),setPermutation(p){this.permutation=p;if(first){first=false;f.blocks.delete('0,82,0')}}});
 f.ctx.transfer(f.machines[1]);assert.deepEqual(tankState(tank),{kind:1,n:2});assert.deepEqual(snap(f.containers[1]),[['hakkai:crushed_iron',1]]);assert.deepEqual(snap(f.containers[2]),[]);assert.ok(f.reports.length);
});
test('the original fuel-only ore processing path remains available without a network',()=>{
 const f=line('iron');f.blocks.delete('0,82,0');f.containers[0].items[1]=item('minecraft:coal');f.ctx.transfer(f.machines[0]);
 assert.deepEqual(snap(f.containers[0]),[]);assert.deepEqual(snap(f.containers[1]),[['hakkai:crushed_iron',2]]);assert.equal(f.reports.length,0);
});
