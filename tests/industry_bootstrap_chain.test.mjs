// Run the production transfer function with a connected mock mechanical graph
// and shared barrels. This verifies a real processing path, not Bedrock UI or
// survival mining/vanilla crafting availability.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {kineticNetwork,hasAdjacentWater,factoryRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js';
import {pipeEndpoints} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transport.js';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';
import {adjacentWaterTank,consumeTankWater,prepareTankChange} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_fluids.js';
class ItemStack{constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64})}clone(){return new ItemStack(this.typeId,this.amount)}isStackableWith(o){return this.typeId===o.typeId}}
class Container{constructor(items=[undefined,undefined]){this.items=items;this.size=items.length}getItem(i){return this.items[i]?.clone()}setItem(i,v){this.items[i]=v?.clone()}}
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),start=source.indexOf('function transfer(b){'),end=source.indexOf("safeSub('system','before','startup'",start);assert.ok(start>=0&&end>start);
const key=(x,y,z)=>`${x},${y},${z}`;
function setup(ore){
 const blocks=new Map(),state={currentTick:0},reports=[];
 const d={id:'test:world',isChunkLoaded:()=>true,getBlockFromRay:()=>undefined,getBlock:({x,y,z})=>blocks.get(key(x,y,z))??{typeId:'minecraft:air'}};
 function put(x,y,z,id){const b={typeId:id,x,y,z,location:{x,y,z},dimension:d};blocks.set(key(x,y,z),b);return b}
 function barrel(x,items){const c=new Container(items);put(x,80,0,'minecraft:barrel').getComponent=()=>({container:c});return c}
 const input=barrel(-1,[new ItemStack(`minecraft:raw_${ore}`),undefined]),mid1=barrel(1),mid2=barrel(3),output=barrel(5);
 const crusher=put(0,80,0,'hakkai:crusher'),washer=put(2,80,0,'hakkai:washer'),mill=put(4,80,0,'hakkai:mill');
 for(let x=0;x<=4;x++)put(x,79,0,'hakkai:shaft');put(0,79,1,'hakkai:wind_rotor');
 const total=(c,id)=>c.items.reduce((n,x)=>n+(x?.typeId===id?x.amount:0),0),room=(c,p)=>c.items.reduce((n,x)=>n+(!x?p.maxAmount:x.isStackableWith(p)?x.maxAmount-x.amount:0),0)>=p.amount;
 const ctx={ns:'hakkai:',world:{getTimeOfDay:()=>6000},currentWeather:new Map(),WeatherType:{Thunder:'thunder',Rain:'rain'},system:state,ItemStack,total,room,kineticNetwork,hasAdjacentWater,factoryRecipe,factoryTransaction,pipeEndpoints,adjacentWaterTank,consumeTankWater,prepareTankChange,syncKineticVisual:()=>{},factoryCycleAt:new Map(),production:()=>{},report:(...args)=>reports.push(args)};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 const run=b=>ctx.transfer(b),tick=()=>{state.currentTick+=40};
 return {d,put,input,mid1,mid2,output,crusher,washer,mill,run,tick,reports,blocks};
}
for(const ore of ['iron','gold','copper'])test(`vanilla raw ${ore} to double ingots through connected machines`,()=>{
 const f=setup(ore);assert.deepEqual(kineticNetwork(f.d,{x:0,y:80,z:0}),{status:'running',rpm:16,capacity:128,demand:88});
 f.run(f.crusher);assert.equal(f.input.items[0],undefined);assert.equal(f.mid1.items[0].typeId,`hakkai:crushed_${ore}`);assert.equal(f.mid1.items[0].amount,2);
 f.run(f.washer);assert.equal(f.mid1.items[0].amount,2,'no water: nothing consumed');
 f.put(2,80,1,'minecraft:water');f.run(f.washer);assert.equal(f.mid2.items[0].typeId,`hakkai:washed_${ore}`);
 f.output.items=[new ItemStack('minecraft:stone',64),new ItemStack('minecraft:stone',64)];f.run(f.mill);assert.equal(f.mid2.items[0].amount,1,'full output: nothing consumed');
 f.output.items=[undefined,undefined];f.run(f.mill);f.tick();f.run(f.washer);f.run(f.mill);
 assert.equal(f.output.items[0].typeId,`minecraft:${ore}_ingot`);assert.equal(f.output.items[0].amount,2);assert.equal(f.mid1.items.filter(Boolean).length,0);assert.equal(f.mid2.items.filter(Boolean).length,0);assert.deepEqual(f.reports,[]);
});
test('machine chain does not operate when the wind source is obstructed or overloaded',()=>{
 const f=setup('iron');f.d.getBlockFromRay=()=>({});f.run(f.crusher);assert.equal(f.input.items[0].amount,1);assert.equal(f.mid1.items[0],undefined);
 f.d.getBlockFromRay=()=>undefined;f.put(1,79,1,'hakkai:miner');assert.equal(kineticNetwork(f.d,{x:0,y:80,z:0}).status,'overload');f.run(f.crusher);assert.equal(f.input.items[0].amount,1);
});
