import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
import {blueprint,BLUEPRINTS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_builders.js';
import {repairPlotStep} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_projects.js';
import {VILLAGE_GUIDE_CHAPTERS} from '../Hakkai_v7.1.0/BehaviorPack/scripts/village_guide.js';
import {selectGuidePage} from '../Hakkai_v7.1.0/BehaviorPack/scripts/guide_navigation.js';
const key=p=>`${p.x},${p.y},${p.z}`,site={id:61,dim:0,x:0,z:0},resolve=(type,states)=>({type,states});
function fixture(kind,stage){
 const plot={kind,stage,at:{x:0,y:88,z:0}},blocks=new Map(),writes=[],entities=[];let loaded=true;
 for(const q of blueprint(kind))blocks.set(key({x:q.x,y:88+q.y,z:q.z}),{type:q.type,states:q.states});
 const d={id:'hakkai:realm_0',isChunkLoaded:()=>loaded,getEntities:()=>entities,getBlock(p){
  const data=blocks.get(key(p))??{type:p.y===87?'minecraft:stone':'minecraft:air'},type=data.type;
  return {typeId:type,isAir:type==='minecraft:air',isSolid:!['minecraft:air','minecraft:water','minecraft:wheat'].includes(type),isLiquid:type==='minecraft:water',
   setType(t){writes.push({at:{...p},type:t});blocks.set(key(p),{type:t});},setPermutation(v){writes.push({at:{...p},...v});blocks.set(key(p),v);}};
 }};
 const worker={isValid:true,dimension:d,location:{x:8,y:88,z:0}};
 return {plot,blocks,writes,entities,worker,remove:(x,y,z)=>blocks.delete(key({x,y:88+y,z})),setLoaded:v=>loaded=v,step:(bp=blueprint)=>repairPlotStep(worker,plot,site,{blueprint:bp,resolve})};
}
// Every individual original blueprint cell, including water, must be
// recoverable in an otherwise intact, loaded and unoccupied mock structure.
for(const [stage,plan] of BLUEPRINTS.entries())for(const q of blueprint(plan.id)){
 const f=fixture(plan.id,stage);f.remove(q.x,q.y,q.z);
 assert.equal(f.step(),'repaired',`${plan.id} ${q.type} at ${q.x},${q.y},${q.z}`);
 assert.equal(f.blocks.get(key({x:q.x,y:88+q.y,z:q.z}))?.type,q.type);
}
{
 const f=fixture('factory',1);
 const original={type:'minecraft:barrel',inventory:['diamond'],state:{facing:'north'}};f.blocks.set('-1,89,0',original);
 assert.equal(f.step(),'intact');assert.equal(f.writes.length,0);assert.equal(f.blocks.get('-1,89,0'),original,'existing full container is never touched');
 f.remove(-1,1,0);assert.equal(f.step(),'repaired');assert.deepEqual(f.blocks.get('-1,89,0'),{type:'minecraft:barrel'},'replacement barrel is empty, never copy dropped inventory');
 f.remove(0,1,0);assert.equal(f.step(),'repaired');assert.equal(f.blocks.get('0,89,0').type,'hakkai:crusher');
 f.remove(0,1,1);assert.equal(f.step(),'repaired');assert.equal(f.blocks.get('0,89,1').type,'hakkai:wind_rotor');
 f.remove(-3,1,-3);assert.equal(f.step(),'repaired');assert.equal(f.blocks.get('-3,89,-3').type,'minecraft:lantern');
}
{
 const f=fixture('farm',2);f.remove(1,1,0);f.remove(0,1,0);f.remove(1,2,0);
 assert.equal(f.step(),'repaired');assert.equal(f.blocks.get('1,89,0').type,'minecraft:farmland');assert.deepEqual(f.blocks.get('1,89,0').states,{moisturized_amount:7});
 f.entities.push({isValid:true,location:{x:3.8,y:89,z:0}});assert.equal(f.step(),'occupied','no water while anyone is inside the whole farm');f.entities.pop();
 assert.equal(f.step(),'repaired');assert.equal(f.blocks.get('0,89,0').type,'minecraft:water');
 assert.equal(f.step(),'repaired');assert.equal(f.blocks.get('1,90,0').type,'minecraft:wheat');
 assert.equal(f.step(),'intact');
 // A flowing or custom block is never overwritten; rebuilding is suspended.
 f.blocks.set('0,89,0',{type:'minecraft:stone'});f.remove(1,2,0);const n=f.writes.length;
 assert.equal(f.step(),'modified');assert.equal(f.writes.length,n);assert.equal(f.blocks.get('0,89,0').type,'minecraft:stone');
}
{
 const f=fixture('farm',2);f.remove(0,1,0);f.remove(3,1,0);
 const partial=kind=>kind==='farm'?[{x:0,y:1,z:0,type:'minecraft:water'}]:[];
 assert.equal(f.step(partial),'water_guard','water cannot be placed if the enclosing ring is incomplete');
 f.setLoaded(false);assert.equal(f.step(),'unloaded');f.setLoaded(true);
 assert.equal(f.step(),'repaired','the wall is repaired first');assert.equal(f.step(),'repaired','then the contained source');
}
{
 const f=fixture('farm',2);f.remove(1,2,0);f.blocks.set('1,89,0',{type:'minecraft:dirt'});
 assert.equal(f.step(),'modified');assert.equal(f.blocks.get('1,89,0').type,'minecraft:dirt');
 // Validate the crop-support check even if a corrupted/incomplete plan omitted the soil.
 const partial=()=>[{x:1,y:2,z:0,type:'minecraft:wheat'}];assert.equal(f.step(partial),'support');assert.equal(f.blocks.has('1,90,0'),false);
}
{
 assert.ok(VILLAGE_GUIDE_CHAPTERS.length>=10);for(const [title,body] of VILLAGE_GUIDE_CHAPTERS){assert.ok(title&&body.length>75);}
 const combined=VILLAGE_GUIDE_CHAPTERS.map(x=>x.join(' ')).join('\n');for(const word of ['16日','しゃがんで','空の新品','改装前','未検証','四隅めぐり','運搬中の品'])assert.ok(combined.includes(word),word);
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');const a=src.indexOf('async function villageGuide('),z=src.indexOf('async function dispatchGuide(',a);assert.ok(a>=0&&z>a);
 let choices=[3,6,1],seen=[];const p={isValid:true};const ctx={VILLAGE_GUIDE_CHAPTERS,checkEightRealmMemory:()=>0,realmRankUpdate:()=>0,realmRanks:[['','new']],era:()=>'',realmEchoCount:()=>0,places:[],visited:()=>false,currentPlace:()=>undefined,GUIDE_SECTIONS:[],itemTexture:x=>x,form:async(_p,title,body,rows)=>{seen.push({title,body,rows});return choices.shift();}};
 ctx.guideSelect=(p,title,body,rows)=>selectGuidePage(p,title,body,rows,ctx.form);
 vm.createContext(ctx);vm.runInContext(src.slice(a,z),ctx);await ctx.guide(p);
 assert.ok(seen[0].rows[3][0].includes('村と四季のガイド'));assert.ok(seen.some(s=>s.title.includes('物資係の現物運搬')));assert.ok(seen.some(s=>s.body.includes('3〜16')));
}
console.log('Barrel, machine, crops, full water enclosure and real guide-book navigation OK (mocked)');
// Expanding repair to inventories, machines and water requires a new opt-in,
// even when the user had enabled the old, less intrusive repair mode.
{
 const src=fs.readFileSync('Hakkai_v7.1.0/BehaviorPack/scripts/main.js','utf8');
 const code=src.slice(src.indexOf('async function villageRepairMenu('),src.indexOf('async function villageSharedRequest('));
 const props=new Map([['builder_repair_enabled_61_v1',1]]),world={},seen=[],site={id:61};
 const ctx={villageSite:()=>site,num:(_,k)=>props.get(k)??0,property:(_,k,v)=>props.set(k,v),BLUEPRINTS:[{},{},{},{},{}],readVillagePlot:()=>undefined,form:async(_p,_t,body,rows)=>{seen.push({body,rows});return 0;},lifeNear:()=>true,notice:()=>{},world};
 vm.createContext(ctx);vm.runInContext(code,ctx);await ctx.villageRepairMenu({},{});
 assert.ok(seen[0].body.includes('停止'));assert.ok(seen[0].rows[0][0].includes('許可'));assert.equal(props.get('builder_repair_enabled_61_v2'),1);
 await ctx.villageRepairMenu({},{});assert.equal(props.get('builder_repair_enabled_61_v2'),0);
 assert.match(src,/builder_repair_enabled_\$\{home\}_v2/);assert.doesNotMatch(src,/builder_repair_enabled_\$\{home\}_v1/);
}
