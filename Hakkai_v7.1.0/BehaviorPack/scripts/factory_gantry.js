import {at,collectStructure,moveStructure,loaded} from './factory_motion.js';
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
  const state=gantryState(controller),controllerId=controller.typeId,oldController=controller.permutation,axis=DIRECTIONS[controllerId.slice(7)],d=controller.dimension,p={x:controller.x,y:controller.y,z:controller.z};
  if(!state||!axis||oldController.getState('hakkai:offset')!==state.offset||oldController.getState('hakkai:motion')!==state.mode)return {ok:false,reason:'invalid'};
  const next=state.offset+step;if(next<0||next>8)return {ok:false,reason:'limit'};
  const power=kineticNetwork(d,p);if(power.status!=='running')return {ok:false,reason:'power'};
  const anchor=at(p,axis,state.offset+1),selection=collectStructure(d,anchor,maxBlocks);
  if(!selection.parts)return {ok:false,reason:selection.reason};
  const farm=planMobileHarvest(controller,selection.parts,axis,step,{ItemStack,factoryTransaction,report});
  if(farm.reason)return {ok:false,reason:farm.reason};
  const dest=selection.parts.map(x=>({p:at(x.p,axis,step),permutation:x.permutation}));
  const result=moveStructure({d,parts:selection.parts,dest,report,control:{p,id:controllerId,old:oldController,next:oldController.withState('hakkai:offset',next)}});
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
function disarm(cycleAt,key){if(cycleAt.size>=8192&&!cycleAt.has(key))cycleAt.clear();cycleAt.set(key,Infinity);}
function currentGantry(d,p,id,offset,mode){
 try{const live=loaded(d,p),state=gantryState(live);return live.typeId===id&&state?.offset===offset&&state.mode===mode?live:undefined;}catch{return undefined;}
}
export function gantryAutoTick(controller,{kineticNetwork,ItemStack,factoryTransaction,report,cycleAt,tick}){
 const s=gantryState(controller);if(!s||s.mode===0)return;
 const d=controller.dimension,p={x:controller.x,y:controller.y,z:controller.z},controllerId=controller.typeId,n=kineticNetwork(d,p);
 const k=`gantry:${d.id}:${p.x},${p.y},${p.z}`;
 if(n.status!=='running'){disarm(cycleAt,k);const live=currentGantry(d,p,controllerId,s.offset,s.mode);if(live)setGantryMode(live,0);return;}
 const delay=Math.max(10,Math.ceil(40*16/Math.abs(n.rpm)));
 // An active state without a live arming record (e.g. after script restart)
 // must not resume unobserved. Require explicit user re-arming.
 if(!cycleAt.has(k)){const live=currentGantry(d,p,controllerId,s.offset,s.mode);if(live)setGantryMode(live,0);return;}
 if(tick-cycleAt.get(k)<delay)return;
 if(cycleAt.size>=8192)cycleAt.clear();cycleAt.set(k,tick);
 const direction=s.mode===3?(s.offset===8?-1:1):s.mode===4?(s.offset===0?1:-1):s.mode===1?1:-1;
 const result=gantryStep(controller,direction,{kineticNetwork,ItemStack,factoryTransaction,report});
 if(!result.ok){
  // Disarm this in-memory run even when the live block cannot be safely
  // stopped; explicit arming replaces this sentinel on the next start.
  disarm(cycleAt,k);
  // Do not stop a different controller or overwrite externally changed mode.
  const live=currentGantry(d,p,controllerId,result.moved?result.offset:s.offset,s.mode);
  if(live)setGantryMode(live,0);return;
 }
 let live=currentGantry(d,p,controllerId,result.offset,s.mode);if(!live){disarm(cycleAt,k);return;}
 if(s.mode===3&&direction===-1)setGantryMode(live,4);
 if(s.mode===4&&direction===1)setGantryMode(live,3);
 // Shuttle reverses only at the end stops, with an extra pause for docks.
 if(s.mode===3&&result.offset===8||s.mode===4&&result.offset===0){
  if(!setGantryMode(live,s.mode===3?4:3)){const unchanged=currentGantry(d,p,controllerId,result.offset,s.mode);if(unchanged)setGantryMode(unchanged,0);return;}
  cycleAt.set(k,tick+40);
 }
}
