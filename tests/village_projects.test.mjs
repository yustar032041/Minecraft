import assert from 'node:assert/strict';
import fs from 'node:fs';
import {blueprint,BLUEPRINTS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_builders.js';
import {validPlot,repairPlotStep,validRoute,moveOne,readCarry,festivalGameStart,festivalGameAdvance,GAME_COURSES,GAME_CORNERS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_projects.js';
class Item {constructor(typeId,amount=1,tag=''){this.typeId=typeId;this.amount=amount;this.maxAmount=64;this.tag=tag;}clone(){return new Item(this.typeId,this.amount,this.tag);}isStackableWith(x){return this.typeId===x.typeId&&this.tag===x.tag;}}
function inventory(items){return {items,size:items.length,getItem(i){return this.items[i]?.clone();},setItem(i,v){if(this.fail){this.fail=false;throw Error('failure');}this.items[i]=v?.clone();}};}
const key=p=>`${p.x},${p.y},${p.z}`,site={id:61,dim:0,x:0,z:0};
{
 const at={x:0,y:88,z:0},plot={at,kind:'house',stage:0},blocks=new Map(),entities=[];
 for(const q of blueprint('house'))blocks.set(key({x:q.x,y:88+q.y,z:q.z}),q.type);
 let loaded=true;const d={id:'hakkai:realm_0',isChunkLoaded:()=>loaded,getEntities:()=>entities,getBlock(p){const type=blocks.get(key(p))??(p.y===87?'minecraft:stone':'minecraft:air');return {typeId:type,isAir:type==='minecraft:air',isLiquid:type==='minecraft:water',setType(t){blocks.set(key(p),t);},setPermutation(v){blocks.set(key(p),v.type);}};}};
 const worker={isValid:true,dimension:d,location:{x:5,y:88,z:0}};
 assert.ok(validPlot(plot,site,blueprint));assert.equal(validPlot({...plot,at:{...at,x:100}},site,blueprint),false);
 assert.equal(repairPlotStep(worker,plot,site,{blueprint}),'intact');
 const part={x:-3,y:88,z:-3};blocks.delete(key(part));entities.push({isValid:true,location:part});assert.equal(repairPlotStep(worker,plot,site,{blueprint}),'occupied');entities.pop();
 blocks.set(key({x:3,y:89,z:3}),'minecraft:diamond_block');assert.equal(repairPlotStep(worker,plot,site,{blueprint}),'modified');assert.equal(blocks.has(key(part)),false);
 blocks.set(key({x:3,y:89,z:3}),'minecraft:oak_planks');loaded=false;assert.equal(repairPlotStep(worker,plot,site,{blueprint}),'unloaded');loaded=true;
 assert.equal(repairPlotStep(worker,plot,site,{blueprint}),'repaired');assert.equal(blocks.get(key(part)),'minecraft:oak_planks');
 blocks.delete(key({x:2,y:89,z:-2}));assert.equal(repairPlotStep(worker,plot,site,{blueprint}),'repaired','missing barrel restored');assert.equal(blocks.get(key({x:2,y:89,z:-2})),'minecraft:barrel');assert.equal(repairPlotStep(worker,plot,site,{blueprint}),'intact','existing barrel never overwritten');
 worker.location.x=30;assert.equal(repairPlotStep(worker,plot,site,{blueprint}),'invalid');
}
{
 const a=inventory([new Item('minecraft:wheat',3,'named')]),b=inventory([undefined]);b.fail=true;
 assert.equal(moveOne(a,b),false);assert.equal(a.items[0].amount,3);assert.equal(b.items[0],undefined);
 assert.equal(moveOne(a,b),true);assert.equal(a.items[0].amount,2);assert.equal(b.items[0].amount,1);assert.equal(b.items[0].tag,'named');
 const full=inventory([new Item('minecraft:stone',64)]);assert.equal(moveOne(a,full),false);assert.equal(a.items[0].amount,2);
 assert.equal(moveOne(inventory([new Item('minecraft:diamond',1)]),b),false,'whitelist');
}
{
 const plot={kind:'festival',at:{x:0,y:88,z:0}},p={isValid:true,dimension:{id:'hakkai:realm_0'},location:{x:0,y:89,z:0}};
 for(const course of [0,1]){
  const g=festivalGameStart(1,0,plot,p,course);g.expires=100;
  for(let i=0;i<GAME_COURSES[course].length;i++){
   const [x,z]=GAME_CORNERS[GAME_COURSES[course][i]];p.location={x:x+.5,y:89,z:z+.5};
   assert.equal(festivalGameAdvance(g,p,1,20),i===GAME_COURSES[course].length-1?'complete':'next');
  }
  p.location={x:0,y:89,z:0};
 }
 const g=festivalGameStart(1,0,plot,p);g.expires=100;assert.equal(festivalGameAdvance(g,p,2,50),'expired');assert.equal(festivalGameAdvance(g,p,1,101),'expired');
}
{
 const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 assert.match(main,/villageCarryTick\(p,site,t\)/);assert.match(main,/villageGameTick\(p,t\)/);assert.match(main,/builder_plot_\$\{home\}_\$\{j.stage\}_v1/);assert.equal(BLUEPRINTS[4].id,'festival');
}
console.log('Recorded-plot air-only repairs, barrel transfers and two timed physical festival courses OK (mocked)');
// Exercise the actual menu-to-tick game path, shared rewards and per-course cap.
{
 const vm=await import('node:vm');const life=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/village_life.js');
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const code=src.slice(src.indexOf('function cultureTownForSite('),src.indexOf('async function townMenu('));
 const plot={at:{x:0,y:88,z:0},stage:4,kind:'festival'},properties=new Map([['hakkai:builder_plot_59_4_v1',JSON.stringify(plot)]]),state={},messages=[];
 const d={id:'hakkai:realm_0',getBlock:at=>({typeId:at.y===89?'minecraft:gold_block':'hakkai:town_bell'})};
 const town={d,l:{x:0,y:87,z:0},key:'town',factoryVillage:true,data:{goods:0}};const player={id:'p1',name:'Alice',isValid:true,dimension:d,location:{x:0,y:89,z:0},getGameMode:()=> 'survival',playSound(){}};
 const world={getDynamicProperty:k=>properties.get(k)},system={currentTick:0};
 const context={...life,villageIdentity:s=>s.repeatKey??s.id,validPlot,blueprint,BLUEPRINTS,festivalGameStart,festivalGameAdvance,GAME_CORNERS,GAME_COURSES,world,system,ns:'hakkai:',places:[{...site,id:59}],state:()=>state,townGet:()=>town,townRecord:t=>t.data,property:(_,k,v)=>properties.set(`hakkai:${k}`,v),GameMode:{Survival:'survival',Adventure:'adventure',Creative:'creative'},seasonDay:()=>1,dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),notice:(_p,msg)=>messages.push(msg)};
 vm.createContext(context);vm.runInContext(code,context);
 function run(course){player.location={x:0,y:89,z:0};context.startVillageGame(player,town,1,course);assert.ok(state.villageGame);for(const n of GAME_COURSES[course]){const [x,z]=GAME_CORNERS[n];player.location={x:x+.5,y:89,z:z+.5};context.villageGameTick(player,40);}assert.equal(state.villageGame,undefined);}
 run(0);assert.equal(town.data.goods,1);run(0);assert.equal(town.data.goods,1);run(1);assert.equal(town.data.goods,2);run(0);assert.equal(town.data.goods,2,'switching courses cannot reset the other reward cap');
 assert.ok(town.data.lifeHistory.some(x=>x.who==='Alice'));assert.ok(messages.some(s=>s.includes('完走')));
}
// Two nearby players and two artisans must not create extra simultaneous jobs.
{
 const vm=await import('node:vm');const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const code=src.slice(src.indexOf('function villageCarryTick('),src.indexOf('async function villageSupplyMenu('));
 const town={key:'town',l:{x:0,y:88,z:0},data:{lifeRoute:{}}},a={id:'a',isValid:true},b={id:'b',isValid:true};let starts=0,calls=0;
 const ctx={lifeTownForPlayer:()=>town,lifeNear:()=>true,townRecord:t=>t.data,readCarry:e=>e.job,permit:()=>true,along:()=>{},report:()=>{},vanillaCarryStep:e=>{calls++;if(!e.job){starts++;e.job={townKey:'town'};}return 'walking';},villagerJob:()=> 'artisan',world:{},saveVillageLife:()=>{},addVillageMemory:()=>{},seasonDay:()=>0};
 const p={dimension:{getEntities:({families})=>families[0]==='villager'?[b,a]:[]}};vm.createContext(ctx);vm.runInContext(code,ctx);ctx.villageCarryTick(p,undefined,0);ctx.villageCarryTick(p,undefined,0);
 assert.equal(starts,1);assert.equal(calls,2);assert.equal(b.job,undefined);
}

// Vanilla private inventories are never accessed: the actual item stays in
// the input barrel until the worker arrives and both inventories can commit.
{
 const {vanillaCarryStep}=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/village_projects.js');
 const source=inventory([new Item('minecraft:wheat',2,'named')]),destination=inventory([undefined]),props=new Map(),a={x:0,y:88,z:0},b={x:8,y:88,z:0};
 let loaded=true;const d={id:'hakkai:realm_0',isChunkLoaded:()=>loaded,getEntities:()=>[],getBlock:p=>({typeId:'minecraft:barrel',getComponent:()=>({container:p.x===0?source:destination})})};
 const t={d,l:a,key:'town'},route={input:a,output:b};const w={isValid:true,dimension:d,location:{...a},getComponent:()=>{throw Error('vanilla private inventory accessed')},getDynamicProperty:k=>props.get(k),setDynamicProperty:(k,v)=>v===undefined?props.delete(k):props.set(k,v)};
 const o={town:t,along:()=>{}};
 assert.equal(vanillaCarryStep(w,route,o),'ready');assert.equal(source.items[0].amount,2);
 assert.equal(vanillaCarryStep(w,route,o),'walking');assert.equal(source.items[0].amount,2);
 w.location={...b};destination.items[0]=new Item('minecraft:stone',64);assert.equal(vanillaCarryStep(w,route,o),'waiting');assert.equal(source.items[0].amount,2);
 destination.items[0]=undefined;loaded=false;assert.equal(vanillaCarryStep(w,route,o),'unloaded');loaded=true;
 assert.equal(vanillaCarryStep(w,route,o),'delivered');assert.equal(source.items[0].amount,1);assert.equal(destination.items[0].tag,'named');
 w.location={...a};assert.equal(vanillaCarryStep(w,route,o),'ready');assert.equal(vanillaCarryStep(w,undefined,o),'cancelled');assert.equal(source.items[0].amount,1);
}
