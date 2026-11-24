import {at,collectStructure,moveStructure,JOINTS} from './factory_motion.js';
export function bearingState(b){try{if(b?.typeId!=='hakkai:bearing')return;const angle=b.permutation.getState('hakkai:angle'),mode=b.permutation.getState('hakkai:motion');if(Number.isInteger(angle)&&angle>=0&&angle<4&&Number.isInteger(mode)&&mode>=0&&mode<=2)return {angle,mode};}catch{}}
export function setBearingMode(b,mode){if(!bearingState(b)||![0,1,2].includes(mode))return false;try{b.setPermutation(b.permutation.withState('hakkai:motion',mode));return true;}catch{return false;}}
const rotate=(v,step)=>step===1?[-v[2],v[1],v[0]]:[v[2],v[1],-v[0]];
function rotateJoint(id,step){const v=JOINTS[id];if(!v)return undefined;const next=rotate(v,step);return Object.keys(JOINTS).find(k=>JOINTS[k].every((x,i)=>x===next[i]));}
export function bearingStep(b,step,{kineticNetwork,resolve,report=()=>{},maxBlocks=32}){
 if(step!==1&&step!==-1)return {ok:false,reason:'invalid'};
 try{
  const state=bearingState(b),d=b.dimension,p={x:b.x,y:b.y,z:b.z};if(!state)return {ok:false,reason:'invalid'};
  if(kineticNetwork(d,p).status!=='running')return {ok:false,reason:'power'};
  const pivot=at(p,[0,1,0]),selection=collectStructure(d,pivot,maxBlocks);if(!selection.parts)return {ok:false,reason:selection.reason};
  const parts=selection.parts,dest=parts.map(part=>{
   const v=[part.p.x-pivot.x,part.p.y-pivot.y,part.p.z-pivot.z],rotated=rotate(v,step);
   // Directional joint points must rotate with the assembly, preserving its
   // explicit attachment through every 90-degree step. Joints have no state.
   const id=rotateJoint(part.id,step);let permutation=id?resolve(id):part.permutation;
   if(part.id==='minecraft:deepslate'||part.id==='minecraft:quartz_block'){
    const axis=permutation.getState('pillar_axis');if(axis==='x'||axis==='z')permutation=permutation.withState('pillar_axis',axis==='x'?'z':'x');
   }
   return {p:at(pivot,rotated),permutation};
  });
  const angle=(state.angle+step+4)%4,old=b.permutation;
  const result=moveStructure({d,parts,dest,report,commit:()=>b.setPermutation(old.withState('hakkai:angle',angle)),rollback:()=>b.setPermutation(old)});
  return result.ok?{...result,angle}:result;
 }catch(e){report('回転構造物の事前確認失敗',e);return {ok:false,reason:'unloaded'};}
}
const cycleKey=b=>`bearing:${b.dimension.id}:${b.x},${b.y},${b.z}`;
export function armBearing(b,cycleAt,tick){if(cycleAt.size>=8192)cycleAt.clear();cycleAt.set(cycleKey(b),tick+40);}
export function bearingAutoTick(b,{kineticNetwork,resolve,report,cycleAt,tick}){
 const s=bearingState(b);if(!s||!s.mode)return;const n=kineticNetwork(b.dimension,{x:b.x,y:b.y,z:b.z});if(n.status!=='running'){setBearingMode(b,0);return;}
 const k=cycleKey(b),delay=Math.max(10,Math.ceil(40*16/Math.abs(n.rpm)));if(!cycleAt.has(k)){setBearingMode(b,0);return;}if(tick-cycleAt.get(k)<delay)return;
 if(cycleAt.size>=8192)cycleAt.clear();cycleAt.set(k,tick);
 const result=bearingStep(b,s.mode===1?1:-1,{kineticNetwork,resolve,report});if(!result.ok)setBearingMode(b,0);
}
