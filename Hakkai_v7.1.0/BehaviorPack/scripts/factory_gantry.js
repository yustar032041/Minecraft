import {at,collectStructure,moveStructure} from './factory_motion.js';
import {planMobileHarvest} from './factory_mobile_farm.js';
const DIRECTIONS={gantry:[1,0,0],gantry_west:[-1,0,0],gantry_north:[0,0,-1],gantry_south:[0,0,1],gantry_up:[0,1,0],gantry_down:[0,-1,0]};
export function isGantry(id){return typeof id==='string'&&id.startsWith('hakkai:')&&Object.hasOwn(DIRECTIONS,id.slice(7));}
export function gantryState(b){try{if(!isGantry(b?.typeId))return undefined;const offset=b.permutation.getState('hakkai:offset'),mode=b.permutation.getState('hakkai:motion');if(!Number.isInteger(offset)||offset<0||offset>8||!Number.isInteger(mode)||mode<0||mode>4)return undefined;return {offset,mode};}catch{return undefined;}}
export function setGantryMode(b,mode){if(!gantryState(b)||![0,1,2,3,4].includes(mode))return false;try{b.setPermutation(b.permutation.withState('hakkai:motion',mode));return true;}catch{return false;}}
// No yielding between preflight, writes and best-effort rollback. The engine
// offers no multi-block atomic transaction: never claim crash safety.
export function gantryStep(controller,step,{kineticNetwork,ItemStack,factoryTransaction,report=()=>{},maxBlocks=32}){
 if(step!==1&&step!==-1)return {ok:false,reason:'invalid'};
 try{
  const state=gantryState(controller),axis=DIRECTIONS[controller.typeId.slice(7)],d=controller.dimension,p={x:controller.x,y:controller.y,z:controller.z};
  if(!state||!axis)return {ok:false,reason:'invalid'};
  const next=state.offset+step;if(next<0||next>8)return {ok:false,reason:'limit'};
  const power=kineticNetwork(d,p);if(power.status!=='running')return {ok:false,reason:'power'};
  const anchor=at(p,axis,state.offset+1),selection=collectStructure(d,anchor,maxBlocks);
  if(!selection.parts)return {ok:false,reason:selection.reason};
  const farm=planMobileHarvest(controller,selection.parts,axis,step,{ItemStack,factoryTransaction,report});
  if(farm.reason)return {ok:false,reason:farm.reason};
  const dest=selection.parts.map(x=>({p:at(x.p,axis,step),permutation:x.permutation})),oldController=controller.permutation;
  const result=moveStructure({d,parts:selection.parts,dest,report,commit:()=>controller.setPermutation(oldController.withState('hakkai:offset',next)),rollback:()=>controller.setPermutation(oldController)});
  if(!result.ok)return result;
  try{if(!farm.run())return {ok:false,reason:'farm_after_move',offset:next,moved:true};}
  catch(err){report('移動後の収穫失敗',err);return {ok:false,reason:'farm_after_move',offset:next,moved:true};}
  return {...result,offset:next};
 }catch(err){report('移動構造物の事前確認失敗',err);return {ok:false,reason:'unloaded'};}
}
export function armGantry(controller,cycleAt,tick){
 if(cycleAt.size>=8192)cycleAt.clear();
 cycleAt.set(`gantry:${controller.dimension.id}:${controller.x},${controller.y},${controller.z}`,tick+40);
}
export function gantryAutoTick(controller,{kineticNetwork,ItemStack,factoryTransaction,report,cycleAt,tick}){
 const s=gantryState(controller);if(!s||s.mode===0)return;
 const d=controller.dimension,p={x:controller.x,y:controller.y,z:controller.z},n=kineticNetwork(d,p);
 if(n.status!=='running'){setGantryMode(controller,0);return;}
 const k=`gantry:${d.id}:${p.x},${p.y},${p.z}`,delay=Math.max(10,Math.ceil(40*16/Math.abs(n.rpm)));
 // An active state without a live arming record (e.g. after script restart)
 // must not resume unobserved. Require explicit user re-arming.
 if(!cycleAt.has(k)){setGantryMode(controller,0);return;}
 if(tick-cycleAt.get(k)<delay)return;
 if(cycleAt.size>=8192)cycleAt.clear();cycleAt.set(k,tick);
 const direction=s.mode===3?(s.offset===8?-1:1):s.mode===4?(s.offset===0?1:-1):s.mode===1?1:-1;
 const result=gantryStep(controller,direction,{kineticNetwork,ItemStack,factoryTransaction,report});
 if(result.ok&&s.mode===3&&direction===-1)setGantryMode(controller,4);
 if(result.ok&&s.mode===4&&direction===1)setGantryMode(controller,3);
 if(!result.ok){setGantryMode(controller,0);return;}
 // Shuttle reverses only at the end stops, with an extra pause for docks.
 if(s.mode===3&&result.offset===8||s.mode===4&&result.offset===0){
  if(!setGantryMode(controller,s.mode===3?4:3)){setGantryMode(controller,0);return;}
  cycleAt.set(k,tick+40);
 }
}
