import test from 'node:test';import assert from 'node:assert/strict';
import {workshopStep} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_life.js';
import {factoryTransaction} from '../Hakkai_v7.1.0/BehaviorPack/scripts/factory_transaction.js';
class Item{constructor(typeId,amount=1,tag='',stackable=true){Object.assign(this,{typeId,amount,tag,stackable,maxAmount:64})}clone(){return new Item(this.typeId,this.amount,this.tag,this.stackable)}isStackableWith(x){return this.stackable&&x.stackable&&this.typeId===x.typeId&&this.tag===x.tag}}
const item=(id,n=1,tag='',stackable=true)=>new Item(id,n,tag,stackable);
const inventory=values=>({items:values,size:values.length,getItem(i){return this.items[i]?.clone()},setItem(i,v){this.items[i]=v?.clone()}});
function fixture(){
 const setup={input:{x:0,y:0,z:0},output:{x:2,y:0,z:0}},input=inventory([item('minecraft:wheat',3),item('minecraft:oak_log',1)]),output=inventory([undefined,undefined]);
 const worker={id:'w',isValid:true,typeId:'minecraft:villager_v2',role:'artisan',location:{x:1,y:0,z:0},getComponent:()=>undefined};let loaded=true,barrelIn=true,barrelOut=true,registered=setup,record='before';
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>loaded,getBlock:p=>({typeId:(p.x===0?barrelIn:barrelOut)?'minecraft:barrel':'minecraft:stone',getComponent:()=>({container:p.x===0?input:output})}),getEntities:()=>[worker]};worker.dimension=d;
 const town={d,l:{x:0,y:0,z:0},factoryVillage:true},reports=[];
 const opts={ItemStack:Item,factoryTransaction,factoryResidentRole:()=> 'saw',extraRole:e=>e.role,onCraft:()=>{record='after'},rollbackCraft:()=>{record='before'},currentWorkshop:()=>registered,report:(...x)=>reports.push(x)};
 return {setup,input,output,worker,town,opts,reports,get record(){return record},set loaded(v){loaded=v},set inPresent(v){barrelIn=v},set outPresent(v){barrelOut=v},set registered(v){registered=v},set record(v){record=v}};
}
test('output replaced after input write must not be overwritten',()=>{
 const f=fixture();let first=true;f.input.setItem=(i,v)=>{f.input.items[i]=v?.clone();if(first){first=false;f.output.items[0]=item('minecraft:diamond',4)}};
 assert.equal(workshopStep(f.town,f.setup,f.opts),undefined);assert.equal(f.input.items[0].amount,3);assert.equal(f.output.items[0].typeId,'minecraft:diamond');assert.equal(f.record,'before');assert.ok(f.reports.length);
});
test('missing output barrel or changed registration aborts before output and ledger',()=>{
 for(const mode of ['barrel','unloaded','registration']){
  const f=fixture();let first=true;f.input.setItem=(i,v)=>{f.input.items[i]=v?.clone();if(first){first=false;if(mode==='barrel')f.outPresent=false;if(mode==='unloaded')f.loaded=false;if(mode==='registration')f.registered=undefined}};
  assert.equal(workshopStep(f.town,f.setup,f.opts),undefined,mode);assert.equal(f.output.items[0],undefined,mode);assert.equal(f.record,'before',mode);assert.ok(f.reports.length);
 }
});
test('worker moving away after output write stops production and restores unchanged slots',()=>{
 const f=fixture();let first=true;f.output.setItem=(i,v)=>{f.output.items[i]=v?.clone();if(first){first=false;f.worker.location.x=20}};
 assert.equal(workshopStep(f.town,f.setup,f.opts),undefined);assert.equal(f.input.items[0].amount,3);assert.equal(f.output.items[0],undefined);assert.equal(f.record,'before');
});
test('uncertain output must not cause ingredient duplication on restoration',()=>{
 const f=fixture();let first=true;f.output.setItem=(i,v)=>{f.output.items[i]=v?.clone();if(first){first=false;f.output.items[i]=item('minecraft:diamond',3);throw Error('after write')}};
 assert.equal(workshopStep(f.town,f.setup,f.opts),undefined);assert.equal(f.input.items[0],undefined);assert.equal(f.output.items[0].typeId,'minecraft:diamond');assert.ok(f.reports.some(([s])=>s.includes('復旧')));
});
test('non-comparable ingredients are skipped instead of losing their metadata',()=>{
 const f=fixture();f.input.items[0]=item('minecraft:wheat',3,'custom',false);assert.match(workshopStep(f.town,f.setup,f.opts),/板材/);assert.equal(f.input.items[0].tag,'custom');assert.equal(f.input.items[1],undefined);
});
test('when another actor changes the village record before commit, no stale save is attempted',()=>{
 const f=fixture();let latest='before',writes=0;f.opts.recordValid=()=>latest==='before';f.opts.onCraft=()=>writes++;f.opts.rollbackCraft=()=>{writes+=100};let once=true;
 f.input.setItem=(i,v)=>{f.input.items[i]=v?.clone();if(once){once=false;latest='other'}};
 assert.equal(workshopStep(f.town,f.setup,f.opts),undefined);assert.equal(writes,0);assert.equal(latest,'other');assert.equal(f.input.items[0].amount,3);assert.equal(f.output.items[0],undefined);
});
test('uncertain ledger rollback does not restore ingredients or overwrite external state',()=>{
 const f=fixture();let saved='before';f.opts.onCraft=()=>{saved='other';throw Error('after ledger change')};f.opts.rollbackCraft=()=>{throw Error('record changed elsewhere')};
 assert.equal(workshopStep(f.town,f.setup,f.opts),undefined);assert.equal(saved,'other');assert.equal(f.input.items[0],undefined);assert.equal(f.output.items[0],undefined);assert.ok(f.reports.some(([label])=>label.includes('記録復旧失敗')));
});
test('a multi-slot output with one uncertain slot does not restore the ingredients',()=>{
 const f=fixture();f.worker.role='saw';f.output.items[0]=item('minecraft:oak_planks',62);let writes=0;
 f.output.setItem=(i,v)=>{f.output.items[i]=v?.clone();if(++writes===2){f.output.items[i]=item('minecraft:diamond',1);throw Error('after second write')}};
 assert.equal(workshopStep(f.town,f.setup,f.opts),undefined);assert.equal(f.input.items[1],undefined);assert.equal(f.output.items[1].typeId,'minecraft:diamond');assert.equal(f.output.items[0].amount,62);assert.ok(f.reports.length);
});
test('worker invalidation, role change and dimension change during processing stop cleanly',()=>{
 for(const change of ['invalid','role','dimension']){
  const f=fixture();let once=true;f.input.setItem=(i,v)=>{f.input.items[i]=v?.clone();if(once){once=false;if(change==='invalid')f.worker.isValid=false;if(change==='role')f.worker.role='farmer';if(change==='dimension')f.worker.dimension={id:'minecraft:the_nether'}}};
  assert.equal(workshopStep(f.town,f.setup,f.opts),undefined,change);assert.equal(f.input.items[0].amount,3);assert.equal(f.output.items[0],undefined);assert.equal(f.record,'before');
 }
});
test('actual village tick preserves a changed ledger instead of saving an old workshop plan',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm'),lib=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/village_life.js');
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),code=src.slice(src.indexOf('function cultureTownForSite('),src.indexOf('async function townMenu('));
 for(const stage of ['before','after']){
  const input=inventory([item('minecraft:wheat',3)]),output=inventory([undefined]),setup={input:{x:0,y:1,z:0},output:{x:2,y:1,z:0}},initial={goods:0,lifeWorkshop:setup};let stored=JSON.stringify(initial),changed=false;const reports=[];
  const worker={id:'artisan',isValid:true,typeId:'minecraft:villager_v2',role:'artisan',location:{x:1,y:1,z:0}};
  const d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getBlock:p=>p.y===0?{typeId:'hakkai:town_bell'}:{typeId:'minecraft:barrel',getComponent:()=>({container:p.x?output:input})},getEntities:q=>q.families?[]:[worker],spawnParticle(){}};worker.dimension=d;
  const t={d,l:{x:0,y:0,z:0},key:'town',data:initial},p={isValid:true,dimension:d,location:{x:0,y:1,z:0},getGameMode:()=> 'survival'};
  const foreign={...initial,goods:77};
  if(stage==='before')input.setItem=(i,v)=>{input.items[i]=v?.clone();if(!changed){changed=true;stored=JSON.stringify(foreign);t.data=foreign}};
  const world={getAbsoluteTime:()=>1200,getDynamicProperty:()=>stored};
  const ctx={...lib,world,ns:'hakkai:',GameMode:{Survival:'survival',Adventure:'adventure',Creative:'creative'},townRecord:t=>({...t.data}),townGet:()=>t,townNear:()=>t,currentPlace:()=>undefined,
   num:()=>0,property:(_w,_k,v)=>{stored=v;if(stage==='after'&&!changed){changed=true;stored=JSON.stringify(foreign)}},seasonDay:()=>0,raining:()=>false,dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),state:()=>({}),factoryResidentRole:()=>undefined,villagerJob:e=>e.role,BUILDER_IDS:[],places:[],ItemStack:Item,report:(...r)=>reports.push(r)};
  vm.createContext(ctx);vm.runInContext(code,ctx);ctx.lifeTick(p,undefined,0);
  assert.equal(JSON.parse(stored).goods,77,stage);assert.equal(output.items[0],undefined,stage);assert.ok(reports.length,stage);
  if(stage==='before')assert.equal(input.items[0].amount,3);else assert.equal(input.items[0],undefined,'record uncertainty does not recreate ingredients');
 }
});
test('in-place mutation of registered coordinates cannot change the planned target',()=>{
 const f=fixture();let once=true;f.input.setItem=(i,v)=>{f.input.items[i]=v?.clone();if(once){once=false;f.setup.output.x=3}};
 assert.equal(workshopStep(f.town,f.setup,f.opts),undefined);assert.equal(f.input.items[0].amount,3);assert.equal(f.output.items[0],undefined);assert.ok(f.reports.length);
});
test('invalid worker coordinates fail closed rather than passing a NaN distance check',()=>{
 const f=fixture();f.worker.location.x=NaN;assert.equal(workshopStep(f.town,f.setup,f.opts),undefined);assert.equal(f.input.items[0].amount,3);assert.equal(f.output.items[0],undefined);
});
test('actual tick verifies ledger rollback after a write-then-throw without overwriting a different cache',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm'),lib=await import('../Hakkai_v7.1.0/BehaviorPack/scripts/village_life.js');
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8'),code=src.slice(src.indexOf('function cultureTownForSite('),src.indexOf('async function townMenu('));
 for(const mode of ['restore','silent-failure','changed-cache']){
  const input=inventory([item('minecraft:wheat',3)]),output=inventory([undefined]),setup={input:{x:0,y:1,z:0},output:{x:2,y:1,z:0}},initial={goods:0,lifeWorkshop:setup};let stored=JSON.stringify(initial),writes=0;const reports=[];
  const worker={id:'artisan',isValid:true,typeId:'minecraft:villager_v2',role:'artisan',location:{x:1,y:1,z:0}},d={id:'hakkai:realm_0',isChunkLoaded:()=>true,getBlock:p=>p.y===0?{typeId:'hakkai:town_bell'}:{typeId:'minecraft:barrel',getComponent:()=>({container:p.x?output:input})},getEntities:q=>q.families?[]:[worker],spawnParticle(){}};worker.dimension=d;
  const t={d,l:{x:0,y:0,z:0},key:'town',data:initial},p={isValid:true,dimension:d,location:{x:0,y:1,z:0},getGameMode:()=> 'survival'},world={getAbsoluteTime:()=>1200,getDynamicProperty:()=>stored};
  const ctx={...lib,world,ns:'hakkai:',GameMode:{Survival:'survival',Adventure:'adventure',Creative:'creative'},townRecord:t=>({...t.data}),townGet:()=>t,townNear:()=>t,currentPlace:()=>undefined,num:()=>0,
   property:(_w,_k,v)=>{if(++writes===1){stored=v;if(mode==='changed-cache')t.data={...initial,goods:77};throw Error('write then throw')}if(mode!=='silent-failure')stored=v},
   seasonDay:()=>0,raining:()=>false,dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),state:()=>({}),factoryResidentRole:()=>undefined,villagerJob:e=>e.role,BUILDER_IDS:[],places:[],ItemStack:Item,report:(...r)=>reports.push(r)};
  vm.createContext(ctx);vm.runInContext(code,ctx);ctx.lifeTick(p,undefined,0);assert.equal(output.items[0],undefined,mode);
  if(mode==='restore'){assert.equal(JSON.parse(stored).goods,0);assert.equal(input.items[0].amount,3);assert.ok(!reports.some(([s])=>s.includes('記録復旧失敗')))}
  else {assert.equal(input.items[0],undefined,mode);const error=reports.find(([s])=>s.includes('記録復旧失敗'))?.[1];assert.ok(error,mode);assert.match(error.message,mode==='changed-cache'?/記録参照が別/:/復旧を確認できません/);if(mode==='changed-cache')assert.equal(t.data.goods,77)}
 }
});
