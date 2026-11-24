import {addVillageMemory} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_life.js';
import assert from 'node:assert/strict';import fs from 'node:fs';
import {BUILDER_IDS,BLUEPRINTS,blueprint,readBuilderProject,startBuilderProject,stepBuilderProject,clearBuilderProject,foundBuilder,autoBuilderPlan,builderHome,builderPaused,setBuilderPaused,constructionCredit} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_builders.js';
import {CULTURE_SITES} from '../Hakkai_v7.1.0/BehaviorPack/scripts/realm_culture.js';
assert.equal(BUILDER_IDS.length,8);assert.equal(BLUEPRINTS.length,5);
const at={x:0,y:80,z:0},key=p=>`${p.x},${p.y},${p.z}`;
function fixture(realm=0){
 let loaded=true,people=[],fail=false,throwsAfterWrite=false;
 const blocks=new Map(),props=new Map();
 const dim={id:`hakkai:realm_${realm}`,isChunkLoaded:()=>loaded,getEntities:()=>people,getPlayers:()=>[],getBlock(p){
  const value=blocks.get(key(p))??(p.y===79?'minecraft:stone':'minecraft:air');
  return {typeId:value,isAir:value==='minecraft:air',isSolid:!['minecraft:air','minecraft:water','minecraft:wheat'].includes(value),isLiquid:value==='minecraft:water',
   setType(type){if(fail){fail=false;throw Error('before write');}blocks.set(key(p),type);if(throwsAfterWrite){throwsAfterWrite=false;throw Error('after write');}},
   setPermutation(perm){this.setType(perm.type);}};
 }};
 const builder={typeId:BUILDER_IDS[realm],isValid:true,dimension:dim,location:{x:7,y:80,z:0},getDynamicProperty:k=>props.get(k),setDynamicProperty(k,v){if(v===undefined)props.delete(k);else props.set(k,v);}};
 return {dim,builder,blocks,props,setLoaded:v=>loaded=v,setPeople:v=>people=v,setFail:v=>fail=v,setThrowAfter:v=>throwsAfterWrite=v};
}
const resolve=(type,states)=>({type,states});
for(const plan of BLUEPRINTS){
 const b=blueprint(plan.id);assert.ok(b.length>50&&b.length<256);
 assert.equal(new Set(b.map(key)).size,b.length,`${plan.id} no duplicate cells`);
 assert.ok(b.every(q=>Math.abs(q.x)<=3&&Math.abs(q.z)<=3&&q.y>=0&&q.y<=4));
 const f=fixture();assert.equal(startBuilderProject(f.builder,plan.id,at),'ok');let completed=0;
 for(let i=0;i<=b.length;i++)assert.ok(['placed','complete'].includes(stepBuilderProject(f.builder,{resolve,completed:()=>completed++})),`${plan.id} step ${i}`);
 assert.equal(completed,1);assert.equal(stepBuilderProject(f.builder,{resolve,completed:()=>completed++}),'done');assert.equal(completed,1);
 for(const q of b)assert.equal(f.blocks.get(key({x:at.x+q.x,y:at.y+q.y,z:at.z+q.z})),q.type);
 assert.equal(startBuilderProject(f.builder,plan.id,at),'invalid');assert.equal(clearBuilderProject(f.builder),true);
}
{
 const p=blueprint('farm'), water=p.findIndex(q=>q.type==='minecraft:water');
 assert.ok(water>0&&p.slice(water+1).every(q=>q.type==='minecraft:wheat'));
 for(const [x,z] of [[-1,0],[1,0],[0,-1],[0,1]])assert.ok(p.slice(0,water).some(q=>q.x===x&&q.y===1&&q.z===z&&q.type==='minecraft:farmland'));
 const f=fixture();assert.equal(startBuilderProject(f.builder,'farm',at),'ok');
 for(let i=0;i<water;i++)assert.equal(stepBuilderProject(f.builder,{resolve}),'placed');
 f.blocks.delete('1,81,0');assert.equal(stepBuilderProject(f.builder,{resolve}),'water_guard');assert.notEqual(f.blocks.get('0,81,0'),'minecraft:water');
}
{
 const f=fixture();f.blocks.set('3,84,3','minecraft:chest');assert.equal(startBuilderProject(f.builder,'house',at),'blocked');assert.equal(f.blocks.get('3,84,3'),'minecraft:chest');
 f.blocks.delete('3,84,3');f.blocks.set('3,79,3','minecraft:water');assert.equal(startBuilderProject(f.builder,'house',at),'floor');f.blocks.delete('3,79,3');
 f.setLoaded(false);assert.ok(['floor','blocked','unloaded'].includes(startBuilderProject(f.builder,'house',at)));f.setLoaded(true);
 assert.equal(startBuilderProject(f.builder,'house',at),'ok');
 f.setPeople([{isValid:true,location:{x:0,y:80,z:0}}]);assert.equal(stepBuilderProject(f.builder,{resolve}),'occupied');assert.equal(f.blocks.size,0);
 f.setPeople([]);f.builder.location.x=30;assert.equal(stepBuilderProject(f.builder,{resolve}),'worker_far');f.builder.location.x=7;
 const first=blueprint('house')[0],cell=key({x:first.x,y:at.y+first.y,z:first.z});f.blocks.set(cell,'minecraft:diamond_block');
 assert.equal(stepBuilderProject(f.builder,{resolve}),'blocked');assert.equal(f.blocks.get(cell),'minecraft:diamond_block');f.blocks.delete(cell);
 f.setFail(true);assert.equal(stepBuilderProject(f.builder,{resolve}),'error');assert.equal(readBuilderProject(f.builder).pending,true);
 assert.equal(stepBuilderProject(f.builder,{resolve}),'placed');assert.equal(readBuilderProject(f.builder).i,1);
 f.setThrowAfter(true);assert.equal(stepBuilderProject(f.builder,{resolve}),'error');assert.equal(stepBuilderProject(f.builder,{resolve}),'recovered');assert.equal(readBuilderProject(f.builder).i,2);
 assert.equal(clearBuilderProject(f.builder),true);assert.equal(f.blocks.size,2,'cancelling never destroys placed work');
}
for(let r=0;r<8;r++){
 const f=fixture(r),site=CULTURE_SITES[r],world={gameRules:{doMobSpawning:true}},props=new Map([[`built_${site.id}`,1]]),spawns=[];
 Object.assign(f.dim,{spawnEntity:(id,loc)=>{const e={id,loc,setDynamicProperty(k,v){this[k]=v;}};spawns.push(e);return e;}});
 const args={site,world,dimension:f.dim,num:(_,k)=>props.get(k)??0,property:(_,k,v)=>props.set(k,v),findFloor:(_,p)=>p,report:()=>{}};
 world.gameRules.doMobSpawning=false;assert.equal(foundBuilder(args),false);world.gameRules.doMobSpawning=true;
 assert.equal(foundBuilder(args),true);assert.equal(foundBuilder(args),false);assert.equal(spawns[0].id,BUILDER_IDS[r]);
}
const main=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
assert.ok(main.includes('foundBuilder({site,world,dimension:p.dimension'));assert.ok(main.includes('builderWorkTick(p,t)'));assert.ok(main.includes('autoBuilderPlan(worker,{sites:site?.repeatKey?[...places,site]:places,world,num,property})'));
console.log('Five real autonomous construction plans, obstruction/water checks, restart recovery and one-time builder founding (mocked)');

{
 const f=fixture(),get=f.dim.getBlock;f.dim.getBlock=p=>p.y===87?{typeId:'minecraft:stone',isSolid:true,isAir:false,isLiquid:false}:get(p);f.builder.location.y=88;f.builder.setDynamicProperty('hakkai:builder_home_v1',61);
 const site={id:61,dim:0,kind:'culture',x:0,z:0,size:65},props=new Map([['built_61',1]]),world={};
 const args={sites:[site],world,num:(_,k)=>props.get(k)??0,property:(_,k,v)=>props.set(k,v)};
 assert.equal(builderHome(f.builder),61);assert.equal(autoBuilderPlan(f.builder,args),'started');
 const job=readBuilderProject(f.builder);assert.equal(job.kind,'house');assert.equal(job.homeId,61);assert.equal(job.stage,0);
 assert.ok(Math.abs(job.at.x)<=28&&Math.abs(job.at.z)<=28,'site buffer stays within village');
 assert.equal(autoBuilderPlan(f.builder,args),'idle','one project per builder');clearBuilderProject(f.builder);
 setBuilderPaused(f.builder,true);assert.equal(builderPaused(f.builder),true);assert.equal(autoBuilderPlan(f.builder,args),'idle');
 setBuilderPaused(f.builder,false);props.set('builder_stage_61_v1',4);assert.equal(autoBuilderPlan(f.builder,args),'started','upgraded four-stage village builds festival next');assert.equal(readBuilderProject(f.builder).kind,'festival');clearBuilderProject(f.builder);props.set('builder_stage_61_v1',5);assert.equal(autoBuilderPlan(f.builder,args),'finished');
 props.set('builder_stage_61_v1',0);props.set('built_61',0);assert.equal(autoBuilderPlan(f.builder,args),'no_home');
 const unassigned=fixture();assert.equal(autoBuilderPlan(unassigned.builder,args),'no_home','spawn eggs cannot auto-build');
}
{
 let d={goods:10};d=constructionCredit(d,'farm');assert.equal(d.goods,18);assert.equal(constructionCredit(d,'farm'),undefined,'credit once');
 d=constructionCredit(d,'house');assert.equal(d.goods,26);assert.equal(constructionCredit({goods:199},'factory').goods,200);
}
// A block that appeared next to the footprint after scouting must not be
// replaced, and its neighbors must not be touched either.
{
 const f=fixture();assert.equal(startBuilderProject(f.builder,'house',at),'ok');
 f.blocks.set('-4,80,-3','minecraft:chest');assert.equal(stepBuilderProject(f.builder,{resolve}),'blocked');
 assert.equal(f.blocks.get('-4,80,-3'),'minecraft:chest');assert.equal(f.blocks.size,1);
}
// Exercise the production worker loop with real project functions and a town.
{
 const vm=await import('node:vm');const f=fixture(),get=f.dim.getBlock;
 f.dim.getBlock=p=>p.y===87?{typeId:'minecraft:stone',isSolid:true,isAir:false,isLiquid:false}:get(p);
 f.builder.location.y=88;f.builder.setDynamicProperty('hakkai:builder_home_v1',61);
 f.dim.getEntities=q=>q.families?.includes('hakkai_builder')?[f.builder]:[];f.dim.getPlayers=()=>[];
 const props=new Map([['built_61',1]]),town={l:{x:40,y:88,z:40},d:f.dim,data:{goods:0}},site={id:61,kind:'culture',dim:0,x:0,z:0,size:65};
 const ctx={villageSiteByHome:id=>site.id===id?site:undefined,villageBuilt:(s,w,num)=>num(w,`built_${s.id}`)===1,BUILDER_IDS,BLUEPRINTS,blueprint,readBuilderProject,stepBuilderProject,clearBuilderProject,builderHome,builderPaused,autoBuilderPlan,constructionCredit,places:[site],world:{},num:(_,k)=>props.get(k)??0,property:(_,k,v)=>props.set(k,v),permit:()=>true,along:()=>{},townNear:()=>town,townRecord:t=>t.data,townSave:(t,v)=>t.data=v,ns:'hakkai:',BlockPermutation:{resolve},report:()=>{},cultureTownForSite:()=>town,saveVillageLife:(t,v)=>t.data=v,addVillageMemory,seasonDay:()=>0};
 // The test bell exists only for the completion credit check.
 const get2=f.dim.getBlock;f.dim.getBlock=p=>p.x===40&&p.y===88&&p.z===40?{typeId:'hakkai:town_bell'}:get2(p);
 vm.createContext(ctx);vm.runInContext(main.slice(main.indexOf('function builderWorkTick('),main.indexOf('function visibleFrom(')),ctx);
 for(let step=0;step<1500&&(props.get('builder_stage_61_v1')??0)<5;step++){
  ctx.builderWorkTick({dimension:f.dim,location:{x:0,y:88,z:0}},step*40);
  const job=readBuilderProject(f.builder);if(job)f.builder.location={x:job.at.x+5.5,y:88,z:job.at.z+.5};
 }
 assert.equal(props.get('builder_stage_61_v1'),5,'actual loop advances five plans');
 assert.equal(town.data.goods,40);assert.equal(town.data.builderCredits,31);
 assert.equal(readBuilderProject(f.builder),undefined);ctx.builderWorkTick({dimension:f.dim,location:{x:0,y:88,z:0}},100000);assert.equal(town.data.goods,40,'no repeat credit');
}
{
 const f=fixture();assert.equal(startBuilderProject(f.builder,'factory',at),'ok');let credits=0;
 const p=blueprint('factory');for(let i=0;i<p.length;i++)assert.equal(stepBuilderProject(f.builder,{resolve,completed:()=>credits++}),'placed');
 f.blocks.delete('-3,80,-3');assert.equal(stepBuilderProject(f.builder,{resolve,completed:()=>credits++}),'incomplete');assert.equal(credits,0,'incomplete structures never earn credit');
 assert.equal(f.blocks.has('-3,80,-3'),false,'never repair over player modifications');
}
{
 const f=fixture();f.blocks.set('0,79,0','minecraft:chest');assert.equal(startBuilderProject(f.builder,'house',at),'floor','containers are not foundation');
}
