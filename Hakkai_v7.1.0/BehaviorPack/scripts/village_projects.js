// Village projects use only recorded builder plots and explicitly registered
// barrels. They never clear or replace a non-air block.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const coord=p=>p&&['x','y','z'].every(k=>Number.isSafeInteger(p[k])&&Math.abs(p[k])<30000000);
const repairable=new Set(['minecraft:oak_planks','minecraft:oak_log','minecraft:glass','minecraft:stone_bricks','minecraft:gold_block']);
export function validPlot(plot,site,blueprint){
 return !!(plot&&coord(plot.at)&&Number.isInteger(plot.stage)&&plot.stage>=0&&plot.stage<5&&blueprint(plot.kind).length&&Math.abs(plot.at.x-site.x)<=40&&Math.abs(plot.at.z-site.z)<=40&&plot.at.y===88);
}
export function repairPlotStep(worker,plot,site,{blueprint,report=()=>{}}){
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
   if(!missing&&b.isAir&&repairable.has(q.type))missing={at,type:q.type};
  }
  if(!missing)return 'intact';
  if(d.getEntities({location:missing.at,maxDistance:2}).some(e=>e.isValid&&distance(e.location,missing.at)<1.6))return 'occupied';
  const b=d.getBlock(missing.at);if(!b?.isAir)return 'modified';b.setType(missing.type);return 'repaired';
 }catch(e){report('建築係の修理',e);return 'error';}
}
export function validRoute(t,route){
 const a=route?.input,b=route?.output,limit=t.factoryVillage?50:28;
 return !!(coord(a)&&coord(b)&&distance(a,b)>=3&&distance(a,b)<=16&&distance(t.l,a)<=limit&&distance(t.l,b)<=limit);
}
// Move exactly one unmodified item, preserving item components. Do not use
// arbitrary containers; the only allowed types are normal food/building stock.
const carryTypes=new Set(['minecraft:wheat','minecraft:bread','minecraft:oak_log','minecraft:oak_planks']);
export function moveOne(input,output,report=()=>{}){
 if(!input||!output||input===output)return false;
 let oldIn,oldOut,source=-1,target=-1,nextIn,nextOut;
 try{
  for(let i=0;i<input.size;i++){const v=input.getItem(i);if(v&&carryTypes.has(v.typeId)){source=i;oldIn=v.clone();break;}}
  if(source<0)return false;
  const unit=oldIn.clone();unit.amount=1;
  for(let i=0;i<output.size;i++){const v=output.getItem(i);if(v&&v.isStackableWith(unit)&&v.amount<v.maxAmount){target=i;oldOut=v.clone();break;}}
  if(target<0)for(let i=0;i<output.size;i++)if(!output.getItem(i)){target=i;break;}
  if(target<0)return false;
  nextIn=oldIn.amount===1?undefined:oldIn.clone();if(nextIn)nextIn.amount--;
  nextOut=oldOut?.clone()??unit.clone();if(oldOut)nextOut.amount++;
  // Neither side is overwritten until the full plan is known.
  try{input.setItem(source,nextIn);output.setItem(target,nextOut);return true;}
  catch(e){try{output.setItem(target,oldOut);}catch(x){report('運搬先の復旧失敗',x);}try{input.setItem(source,oldIn);}catch(x){report('運搬元の復旧失敗',x);}report('現物運搬の復旧を試行',e);return false;}
 }catch(e){report('現物運搬の確認',e);return false;}
}
const JOB='hakkai:carry_job_v1';
export function readCarry(worker){try{const v=worker.getDynamicProperty(JOB);if(!v)return undefined;const j=JSON.parse(v);return coord(j.input)&&coord(j.output)&&typeof j.dimension==='string'&&typeof j.townKey==='string'&&['pickup','deliver'].includes(j.phase)?j:null;}catch{return null;}}
// Cargo is held in the resident's one-slot entity inventory, not an abstract
// counter. A saved route survives chunk reloads and route unregistration.
export function carryStep(worker,route,{town,along,report=()=>{}}){
 try{
  if(!worker?.isValid)return 'invalid';const d=worker.dimension,cargo=worker.getComponent('minecraft:inventory')?.container;
  if(!cargo||cargo.size!==1)return 'no_inventory';
  let job=readCarry(worker);if(job===null)return 'invalid';
  if(!job){
   if(cargo.getItem(0))return 'cargo_waiting';
   if(!validRoute(town,route)||d.id!==town.d.id)return 'idle';
   job={input:route.input,output:route.output,dimension:d.id,townKey:town.key,phase:'pickup'};worker.setDynamicProperty(JOB,JSON.stringify(job));
  }
  if(job.dimension!==d.id||job.townKey!==town.key)return 'dimension';
  // Inventory is authoritative if interrupted between transfer and job save.
  const carrying=!!cargo.getItem(0);job.phase=carrying?'deliver':'pickup';
  const at=carrying?job.output:job.input;
  if(!d.isChunkLoaded(at))return 'unloaded';
  const barrel=d.getBlock(at);if(barrel?.typeId!=='minecraft:barrel')return 'barrel_missing';
  if(distance(worker.location,at)>2.5){
   if(!d.getEntities({families:['monster'],location:worker.location,maxDistance:9,closest:1}).length)along(worker,at.x+.5-worker.location.x,at.z+.5-worker.location.z,.13);
   return 'walking';
  }
  const inv=barrel.getComponent('minecraft:inventory')?.container;if(!inv)return 'no_inventory';
  if(carrying){if(!moveOne(cargo,inv,report))return 'output_full';worker.setDynamicProperty(JOB,undefined);return 'delivered';}
  if(!route||!validRoute(town,route)||distance(route.input,job.input)>0||distance(route.output,job.output)>0){worker.setDynamicProperty(JOB,undefined);return 'cancelled';}
  if(!moveOne(inv,cargo,report))return 'empty';
  job.phase='deliver';worker.setDynamicProperty(JOB,JSON.stringify(job));return 'picked_up';
 }catch(e){report('住人の運搬',e);return 'error';}
}
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

// Recovery is available directly from the carrier even if the route was
// removed or the destination disappeared; it never conjures a replacement.
export function retrieveCargo(worker,inventory,report=()=>{}){
 try{const cargo=worker?.getComponent('minecraft:inventory')?.container;
  if(!moveOne(cargo,inventory,report))return false;
  worker.setDynamicProperty(JOB,undefined);return true;
 }catch(e){report('運搬品の受け取り',e);return false;}
}
