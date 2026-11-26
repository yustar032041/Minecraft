import {safeBuilderGround} from './village_builders.js';
// Village projects use only recorded builder plots and explicitly registered
// barrels. They never clear or replace a non-air block.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const coord=p=>p&&['x','y','z'].every(k=>Number.isSafeInteger(p[k])&&Math.abs(p[k])<30000000);
// Only blocks present in one of our known builder blueprints. Restored
// containers are empty and machines use their blueprint defaults; existing
// containers, contents, states and crops are never overwritten.
const repairable=new Set(['minecraft:oak_planks','minecraft:oak_log','minecraft:glass','minecraft:stone_bricks','minecraft:gold_block','minecraft:barrel','minecraft:crafting_table','minecraft:composter','minecraft:lantern','minecraft:farmland','minecraft:wheat','minecraft:water','hakkai:crusher','hakkai:wind_rotor']);
export function validPlot(plot,site,blueprint){
 return !!(plot&&coord(plot.at)&&Number.isInteger(plot.stage)&&plot.stage>=0&&plot.stage<5&&blueprint(plot.kind).length&&Math.abs(plot.at.x-site.x)<=40&&Math.abs(plot.at.z-site.z)<=40&&plot.at.y===88);
}
export function repairPlotStep(worker,plot,site,{blueprint,resolve,report=()=>{}}){
 if(!worker?.isValid||!validPlot(plot,site,blueprint)||worker.dimension.id!==`hakkai:realm_${site.dim}`||distance(worker.location,plot.at)>16)return 'invalid';
 const d=worker.dimension,plan=blueprint(plot.kind);
 try{
  // If anyone has modified the design (other than removing blocks), pause the
  // whole plot: this avoids filling holes during a player's renovation.
  let missing;
  for(const q of plan){
   const at={x:plot.at.x+q.x,y:plot.at.y+q.y,z:plot.at.z+q.z};
   if(!d.isChunkLoaded(at))return 'unloaded';const b=d.getBlock(at);if(!b)return 'unloaded';
   if(!b.isAir&&b.typeId!==q.type)return 'modified';
   if(!missing&&b.isAir&&repairable.has(q.type))missing={at,type:q.type,states:q.states,y:q.y};
  }
  if(!missing)return 'intact';
  if(d.getEntities({location:missing.at,maxDistance:2}).some(e=>e.isValid&&distance(e.location,missing.at)<1.6))return 'occupied';
  const get=p=>d.isChunkLoaded(p)?d.getBlock(p):undefined;
  const below=get({x:missing.at.x,y:missing.at.y-1,z:missing.at.z});
  if(!below)return 'unloaded';
  if(missing.type==='minecraft:wheat'&&below.typeId!=='minecraft:farmland')return 'support';
  // Fittings sit on the known full planks or, for festival lanterns,
  // logs. Do not infer collision from arbitrary blocks or preview-only APIs.
  if(['minecraft:barrel','minecraft:crafting_table','minecraft:composter','minecraft:lantern','minecraft:farmland','hakkai:crusher','hakkai:wind_rotor'].includes(missing.type)&&!['minecraft:oak_planks','minecraft:oak_log'].includes(below.typeId))return 'support';
  if(missing.y===0&&!safeBuilderGround(below))return 'support';
  if(missing.type==='minecraft:water'){
   // Only the farm's original enclosed basin can receive water. Check the
   // entire floor, 24 farmland cells and complete outer wall, not merely the
   // four adjacent blocks, before creating a source. No outside drain can be
   // intentionally opened through one of the original basin cells.
   if(plot.kind!=='farm')return 'water_guard';
   for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++){
    const base=get({x:plot.at.x+x,y:plot.at.y,z:plot.at.z+z});
    if(!base)return 'unloaded';if(base.typeId!=='minecraft:oak_planks')return 'water_guard';
    if(x||z){const side=get({x:plot.at.x+x,y:plot.at.y+1,z:plot.at.z+z});
     if(!side)return 'unloaded';if(side.typeId!==(Math.abs(x)===3||Math.abs(z)===3?'minecraft:stone_bricks':'minecraft:farmland'))return 'water_guard';}
   }
   const center={x:plot.at.x+.5,y:plot.at.y+1,z:plot.at.z+.5};
   if(d.getEntities({location:center,maxDistance:9}).some(e=>e.isValid&&Math.abs(e.location.x-center.x)<4.5&&Math.abs(e.location.z-center.z)<4.5&&e.location.y>=plot.at.y-2&&e.location.y<=plot.at.y+5))return 'occupied';
  }
  const b=get(missing.at);if(!b?.isAir)return 'modified';
  if(missing.states){if(typeof resolve!=='function')return 'invalid';b.setPermutation(resolve(missing.type,missing.states));}else b.setType(missing.type);
  return 'repaired';
 }catch(e){report('建築係の修理',e);return 'error';}
}
export function validRoute(t,route){
 const a=route?.input,b=route?.output,limit=t.factoryVillage?50:28;
 return !!(coord(a)&&coord(b)&&distance(a,b)>=3&&distance(a,b)<=16&&distance(t.l,a)<=limit&&distance(t.l,b)<=limit);
}
// Move exactly one unmodified item, preserving item components. Do not use
// arbitrary containers; the only allowed types are normal food/building stock.
const carryTypes=new Set(['minecraft:wheat','minecraft:bread','minecraft:oak_log','minecraft:oak_planks']);
// Non-stackable items cannot be reliably compared by isStackableWith; skip
// them rather than overwriting special data we cannot verify. Counts are
// compared separately because the API deliberately ignores stack size.
function sameStack(a,b){
 if(!a||!b)return !a&&!b;
 return a.typeId===b.typeId&&a.amount===b.amount&&a.isStackableWith(b);
}
export function moveOne(input,output,report=()=>{},checks={}){
 if(!input||!output||input===output)return false;
 const inputPresent=checks.inputPresent??(()=>true),outputPresent=checks.outputPresent??(()=>true),validate=checks.validate??(()=>true);
 let oldIn,oldOut,source=-1,target=-1,nextIn,nextOut;const writes=[];
 try{
  if(!validate()||!inputPresent()||!outputPresent())throw Error('運搬経路を確認できません');
  for(let i=0;i<input.size;i++){
   const v=input.getItem(i);if(!v||!carryTypes.has(v.typeId))continue;
   const candidate=v.clone();if(!sameStack(v,candidate))continue;
   source=i;oldIn=candidate;break;
  }
  if(source<0)return false;
  const unit=oldIn.clone();unit.amount=1;
  for(let i=0;i<output.size;i++){const v=output.getItem(i);if(v&&v.isStackableWith(unit)&&v.amount<v.maxAmount){target=i;oldOut=v.clone();break;}}
  if(target<0)for(let i=0;i<output.size;i++)if(!output.getItem(i)){target=i;break;}
  if(target<0)return false;
  nextIn=oldIn.amount===1?undefined:oldIn.clone();if(nextIn)nextIn.amount--;
  nextOut=oldOut?.clone()??unit.clone();if(oldOut)nextOut.amount++;
  const check=(expectedIn,expectedOut)=>{
   if(!validate()||!inputPresent()||!outputPresent()||!sameStack(input.getItem(source),expectedIn)||!sameStack(output.getItem(target),expectedOut))throw Error('運搬中に経路または樽の中身が変化');
  };
  check(oldIn,oldOut);
  writes.push({container:input,index:source,old:oldIn,next:nextIn,present:inputPresent});input.setItem(source,nextIn);
  check(nextIn,oldOut);
  writes.push({container:output,index:target,old:oldOut,next:nextOut,present:outputPresent});output.setItem(target,nextOut);
  check(nextIn,nextOut);
  return true;
 }catch(e){
  let incomplete=false,outputUncertain=false;
  for(const w of writes.reverse())try{
   // If the output might already have been received, restoring the source
   // could duplicate it. Prefer a reported unresolved result to guessing.
   if(w.container===input&&outputUncertain)throw Error('搬送先が不明なため元を戻しません');
   if(!w.present())throw Error('樽を確認できません');
   const current=w.container.getItem(w.index);
   if(sameStack(current,w.old))continue; // write may have failed before mutation
   if(!sameStack(current,w.next))throw Error('別の品へ変化');
   w.container.setItem(w.index,w.old);
   if(!sameStack(w.container.getItem(w.index),w.old))throw Error('復旧結果を確認できません');
  }catch(x){if(w.container===output)outputUncertain=true;incomplete=true;report('現物運搬の復旧失敗',x);}
  report(incomplete?'現物運搬失敗（復旧要確認）':'現物運搬の復旧を試行',e);return false;
 }
}
const JOB='hakkai:carry_job_v1';
export function readCarry(worker){try{const v=worker.getDynamicProperty(JOB);if(!v)return undefined;const j=JSON.parse(v);return coord(j.input)&&coord(j.output)&&typeof j.dimension==='string'&&typeof j.townKey==='string'&&['pickup','deliver'].includes(j.phase)?j:null;}catch{return null;}}
export function festivalGameStart(day,realm,plot,player,course=0){
 if(![0,1].includes(course)||!plot||plot.kind!=='festival'||!coord(plot.at)||!player?.isValid||distance(player.location,plot.at)>8)return;
 return {day,realm,at:{...plot.at},dimension:player.dimension.id,course,step:0,expires:0};
}
export const GAME_CORNERS=[[-2,-2],[2,-2],[2,2],[-2,2]];
export const GAME_COURSES=[[0,1,2,3],[3,2,1,0,3,2,1,0]];
export function festivalGameAdvance(game,player,day,tick){
 if(!game||!player?.isValid||game.dimension!==player.dimension.id||game.day!==day||tick>game.expires||game.step<0||!GAME_COURSES[game.course]||game.step>=GAME_COURSES[game.course].length)return 'expired';
 const [x,z]=GAME_CORNERS[GAME_COURSES[game.course][game.step]],at={x:game.at.x+x+.5,y:game.at.y+1,z:game.at.z+z+.5};
 if(distance(player.location,at)>1.5)return 'waiting';
 game.step++;return game.step===GAME_COURSES[game.course].length?'complete':'next';
}

// Ordinary villagers' private inventory belongs to vanilla AI. Do not use it
// as cargo: the item remains in the registered input barrel until the worker
// reaches the output, then one real item is moved in a single guarded step.
export function vanillaCarryStep(worker,route,{town,along,report=()=>{},currentRoute=()=>route}){
 try{
  if(!worker?.isValid)return 'invalid';const d=worker.dimension;
  let job=readCarry(worker);if(job===null)return 'invalid';
  if(job&&job.mode!=='barrel_transfer')return 'invalid';
  if(!job){
   if(!validRoute(town,route)||d.id!==town.d.id)return 'idle';
   job={input:route.input,output:route.output,dimension:d.id,townKey:town.key,phase:'pickup',mode:'barrel_transfer'};
   worker.setDynamicProperty(JOB,JSON.stringify(job));
  }
  if(job.dimension!==d.id||job.townKey!==town.key)return 'dimension';
  // No cargo has left the input; changing or unregistering the route cancels.
  if(!validRoute(town,route)||distance(route.input,job.input)>0||distance(route.output,job.output)>0){worker.setDynamicProperty(JOB,undefined);return 'cancelled';}
  if(!d.isChunkLoaded(job.input)||!d.isChunkLoaded(job.output))return 'unloaded';
  const input=d.getBlock(job.input),output=d.getBlock(job.output);
  if(input?.typeId!=='minecraft:barrel'||output?.typeId!=='minecraft:barrel')return 'barrel_missing';
  const target=job.phase==='pickup'?job.input:job.output;
  if(distance(worker.location,target)>2.5){
   if(!d.getEntities({families:['monster'],location:worker.location,maxDistance:9,closest:1}).length)along(worker,target.x+.5-worker.location.x,target.z+.5-worker.location.z,.13);
   return 'walking';
  }
  if(job.phase==='pickup'){
   const inv=input.getComponent('minecraft:inventory')?.container;if(!inv)return 'no_inventory';
   let available=false;for(let i=0;i<inv.size;i++){const v=inv.getItem(i);if(v&&carryTypes.has(v.typeId)&&sameStack(v,v.clone())){available=true;break;}}
   if(!available)return 'empty';job.phase='deliver';worker.setDynamicProperty(JOB,JSON.stringify(job));return 'ready';
  }
  const source=input.getComponent('minecraft:inventory')?.container,dest=output.getComponent('minecraft:inventory')?.container;
  if(!source||!dest)return 'no_inventory';
  // Clear the delivery job before touching items. If clearing throws (even
  // after mutation), no item has moved; it cannot be delivered repeatedly.
  worker.setDynamicProperty(JOB,undefined);
  if(readCarry(worker)!==undefined)throw Error('運搬記録を解除できません');
  const present=at=>()=>d.isChunkLoaded(at)&&d.getBlock(at)?.typeId==='minecraft:barrel';
  const validate=()=>{
   if(!worker.isValid||worker.dimension.id!==job.dimension||town.d.id!==job.dimension||distance(worker.location,job.output)>2.5||readCarry(worker)!==undefined)return false;
   const fresh=currentRoute();return validRoute(town,fresh)&&distance(fresh.input,job.input)===0&&distance(fresh.output,job.output)===0;
  };
  let failed=false;
  const ok=moveOne(source,dest,(...args)=>{failed=true;report(...args);},{validate,inputPresent:present(job.input),outputPresent:present(job.output)});
  if(ok)return 'delivered';
  // A full/empty inventory can wait. An uncertain write/recovery must stop,
  // otherwise a subsequent tick might transfer another item after partial work.
  if(failed)return 'error';
  if(readCarry(worker)!==undefined)throw Error('運搬記録が変更されました');
  worker.setDynamicProperty(JOB,JSON.stringify(job));return 'waiting';
 }catch(e){report('普通村人の運搬',e);return 'error';}
}
