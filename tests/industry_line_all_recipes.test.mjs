// Real transfer path with mock world/barrels. Does not emulate Bedrock crafting,
// item components, chunk lifecycle, networking or actual player inventory.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {kineticNetwork,hasAdjacentWater,factoryRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_network.js';
import {pipeEndpoints} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transport.js';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';
import {LINE_RECIPES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_line_recipes.js';
import {findLineRecipe} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_lines.js';
import {INDUSTRY_CHAPTERS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/industry_guide.js';
class ItemStack{constructor(typeId,amount=1){Object.assign(this,{typeId,amount,maxAmount:64})}clone(){return new ItemStack(this.typeId,this.amount)}isStackableWith(o){return this.typeId===o.typeId}}
class Container{constructor(items){this.items=items;this.size=items.length}getItem(i){return this.items[i]?.clone()}setItem(i,v){this.items[i]=v?.clone()}}
const source=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),start=source.indexOf('function transfer(b){'),end=source.indexOf("safeSub('system','before','startup'",start);assert.ok(start>=0&&end>start);
function fixture(kind,recipe,{noPower=false,full=false}={}){
 const blocks=new Map(),reports=[],system={currentTick:100},key=(x,y,z)=>`${x},${y},${z}`;
 const dim={id:'test:world',isChunkLoaded:()=>true,getBlockFromRay:()=>noPower?{}:undefined,getBlock:({x,y,z})=>blocks.get(key(x,y,z))??{typeId:'minecraft:air'}};
 function put(x,y,z,id){const b={typeId:id,x,y,z,location:{x,y,z},dimension:dim};blocks.set(key(x,y,z),b);return b}
 const input=new Container([...recipe.costs.map(c=>new ItemStack(c.id,c.count)),undefined]),output=new Container(full?[new ItemStack('minecraft:stone',64)]:[undefined,undefined]);
 put(-1,80,0,'minecraft:barrel').getComponent=()=>({container:input});put(1,80,0,'minecraft:barrel').getComponent=()=>({container:output});
 const machine=put(0,80,0,`hakkai:${kind}`);put(0,79,0,'hakkai:shaft');put(0,79,1,'hakkai:wind_rotor');
 const total=(c,id)=>c.items.reduce((n,x)=>n+(x?.typeId===id?x.amount:0),0);
 const room=(c,p)=>c.items.reduce((n,x)=>n+(!x?p.maxAmount:x.isStackableWith(p)?x.maxAmount-x.amount:0),0)>=p.amount;
 const ctx={ns:'hakkai:',world:{getTimeOfDay:()=>6000},currentWeather:new Map(),WeatherType:{Thunder:'thunder',Rain:'rain'},system,ItemStack,total,room,kineticNetwork,hasAdjacentWater,factoryRecipe,factoryTransaction,pipeEndpoints,findLineRecipe,syncKineticVisual:()=>{},factoryCycleAt:new Map(),production:()=>{},report:(...v)=>reports.push(v)};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 return {input,output,reports,run:()=>ctx.transfer(machine)};
}
for(const [kind,recipes] of Object.entries(LINE_RECIPES))for(const recipe of recipes){
 test(`${kind}/${recipe.name}: actual transfer produces the indexed result`,()=>{
  const f=fixture(kind,recipe);f.run();assert.equal(f.output.items[0]?.typeId,recipe.output);assert.equal(f.output.items[0]?.amount,recipe.amount);
  assert.ok(f.input.items.every(x=>!x));assert.deepEqual(f.reports,[]);
 });
 test(`${kind}/${recipe.name}: full output or no power consumes nothing`,()=>{
  for(const opt of [{noPower:true},{full:true}]){const f=fixture(kind,recipe,opt),before=f.input.items.map(x=>x&&[x.typeId,x.amount]);f.run();assert.deepEqual(f.input.items.map(x=>x&&[x.typeId,x.amount]),before);}
 });
}
test('industry book names the ice-blossom recipe output rather than inventing an item',()=>{
 const recipe=LINE_RECIPES.mixer.find(r=>r.name==='ice_tonic');assert.equal(recipe.output,'hakkai:mana_tonic');
 const chapter=INDUSTRY_CHAPTERS.find(([name])=>name==='混合と組立')[1];assert.match(chapter,/完成するのは魔力の薬/);assert.match(chapter,/パンプキンパイ/);
});
