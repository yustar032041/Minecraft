// Inert payloads only: never move inventories, block entities or active
// machines. A directional joint explicitly captures one adjacent payload.
const V=[[1,0,0],[-1,0,0],[0,0,-1],[0,0,1],[0,1,0],[0,-1,0]];
export const JOINTS={'hakkai:gantry_joint':[1,0,0],'hakkai:gantry_joint_west':[-1,0,0],'hakkai:gantry_joint_north':[0,0,-1],'hakkai:gantry_joint_south':[0,0,1],'hakkai:gantry_joint_up':[0,1,0],'hakkai:gantry_joint_down':[0,-1,0]};
const FRAME=new Set(['hakkai:gantry_frame','hakkai:gantry_panel','hakkai:gantry_harvester',...Object.keys(JOINTS)]);
const colors='white orange magenta light_blue yellow lime pink gray light_gray cyan purple blue brown green red black'.split(' ');
const woods='oak spruce birch jungle acacia dark_oak mangrove cherry bamboo pale_oak'.split(' ');
const vanilla=['stone','cobblestone','stone_bricks','brick_block','glass','tinted_glass','smooth_stone','sandstone','red_sandstone','deepslate','cobbled_deepslate','deepslate_bricks','deepslate_tiles','calcite','tuff','quartz_block','prismarine','sea_lantern',...woods.map(w=>w+'_planks'),...colors.flatMap(c=>[c+'_concrete',c+'_wool',c+'_terracotta',c+'_stained_glass'])];
const custom=['abyssal_stone','aether_stone','clockstone','cloudstone','copper_slate','frost_crystal','frost_stone','mirror_ice','moonstone','red_dune_stone','fluid_tank','fluid_pipe'];
export const PAYLOAD=new Set([...vanilla.map(x=>'minecraft:'+x),...custom.map(x=>'hakkai:'+x)]);
export const at=(p,v,n=1)=>({x:p.x+v[0]*n,y:p.y+v[1]*n,z:p.z+v[2]*n});
export const key=p=>`${p.x},${p.y},${p.z}`;
export function loaded(d,p){if(!d.isChunkLoaded(p))throw Error('unloaded');const b=d.getBlock(p);if(!b)throw Error('unavailable');return b;}
export function collectStructure(d,anchor,maxBlocks=32){
 const root=loaded(d,anchor);if(!FRAME.has(root.typeId))return {reason:'anchor'};
 const queue=[anchor],seen=new Set(),parts=[],joints=[];
 for(let i=0;i<queue.length;i++){
  const p=queue[i],k=key(p);if(seen.has(k))continue;seen.add(k);const b=loaded(d,p);if(!FRAME.has(b.typeId))continue;
  parts.push({p,id:b.typeId,permutation:b.permutation});if(parts.length>maxBlocks)return {reason:'size'};
  if(JOINTS[b.typeId])joints.push({p,direction:JOINTS[b.typeId]});
  for(const v of V){const n=at(p,v);if(!seen.has(key(n)))queue.push(n);}
 }
 const selected=new Set(parts.map(x=>key(x.p)));
 for(const j of joints){const p=at(j.p,j.direction),k=key(p);if(selected.has(k))continue;const b=loaded(d,p);
  if(b.typeId==='minecraft:air')continue;
  if(!PAYLOAD.has(b.typeId))return {reason:'unsupported'};
  selected.add(k);parts.push({p,id:b.typeId,permutation:b.permutation});if(parts.length>maxBlocks)return {reason:'size'};
 }
 return {parts};
}
// Compare all public block states. The API cannot identify a replacement
// with exactly the same type and states, or guarantee atomic writes.
function snapshot(permutation,id=permutation.type.id){
 return {id,states:{...permutation.getAllStates()},permutation};
}
function same(block,expected){
 if(block.typeId!==expected.id)return false;
 // The intermediate empty block is compared by type; the actual empty
 // permutation is captured after a successful clear for later rollback.
 if(expected.states===null)return true;
 const a=block.permutation.getAllStates(),b=expected.states,ak=Object.keys(a),bk=Object.keys(b);
 return ak.length===bk.length&&ak.every(k=>Object.hasOwn(b,k)&&a[k]===b[k]);
}
// Destination must be empty or part of this structure. Never carry entities.
// Revalidate before each write and undo only mutations still matching ours.
// Best effort only: matching replacements, concurrent changes, unloaded blocks,
// liquids, failed rollback and process crashes cannot be made atomic here.
export function moveStructure({d,parts,dest,control,report=()=>{}}){
 const sourceKeys=new Set(parts.map(q=>key(q.p))),destinationKeys=new Set();
 if(!control||sourceKeys.has(key(control.p)))return {ok:false,reason:'blocked'};
 for(const part of dest){const k=key(part.p);if(k===key(control.p)||destinationKeys.has(k))return {ok:false,reason:'blocked'};destinationKeys.add(k);const block=loaded(d,part.p);if(!sourceKeys.has(k)&&block.typeId!=='minecraft:air')return {ok:false,reason:'blocked'};}
 const points=[...parts.map(x=>x.p),...dest.map(x=>x.p)];
 const min={x:Math.min(...points.map(x=>x.x))-2,y:Math.min(...points.map(x=>x.y))-2,z:Math.min(...points.map(x=>x.z))-2};
 const max={x:Math.max(...points.map(x=>x.x))+3,y:Math.max(...points.map(x=>x.y))+4,z:Math.max(...points.map(x=>x.z))+3};
 const center={x:(min.x+max.x)/2,y:(min.y+max.y)/2,z:(min.z+max.z)/2};const radius=Math.hypot(max.x-min.x,max.y-min.y,max.z-min.z)/2;
 if(d.getEntities({location:center,maxDistance:radius}).some(e=>e.typeId!=='hakkai:kinetic_visual'&&e.location.x>=min.x&&e.location.x<=max.x&&e.location.y>=min.y&&e.location.y<=max.y&&e.location.z>=min.z&&e.location.z<=max.z))return {ok:false,reason:'entity'};
 const expected=new Map();
 for(const part of parts)expected.set(key(part.p),{p:part.p,...snapshot(part.permutation,part.id)});
 for(const part of dest){const k=key(part.p);if(expected.has(k))continue;
  const b=loaded(d,part.p);if(b.typeId!=='minecraft:air')return {ok:false,reason:'blocked'};
  expected.set(k,{p:part.p,...snapshot(b.permutation,b.typeId)});
 }
 const controller={p:control.p,...snapshot(control.old,control.id)},controlKey=key(control.p);
 expected.set(controlKey,controller);
 const matches=(p,value)=>same(loaded(d,p),value);
 // A source, destination, or controller may already have changed since the
 // structure was selected or while the entity query was performed.
 for(const value of expected.values())if(!matches(value.p,value))return {ok:false,reason:'changed'};
 const writes=[];
 function write(p,next,clear=false){
  const k=key(p),before=expected.get(k);
  if(!matches(control.p,expected.get(controlKey))||!matches(p,before))throw Error('structure changed before write');
  // Push first: a native call may throw after applying the change.
  writes.push({p,before,after:next});
  const b=loaded(d,p);if(clear)b.setType('minecraft:air');else b.setPermutation(next.permutation);
  if(!matches(p,next))throw Error('structure changed during write');
  const actual=loaded(d,p);expected.set(k,{p,...snapshot(actual.permutation,actual.typeId)});
 }
 try{
  const air={id:'minecraft:air',states:null};
  for(const part of parts)write(part.p,air,true);
  for(const part of dest)write(part.p,snapshot(part.permutation));
  // Detect changes to any already-written or pending position before the
  // controller is advanced. This is bounded by the 32-block structure limit.
  for(const value of expected.values())if(!matches(value.p,value))throw Error('structure changed before controller commit');
  write(control.p,snapshot(control.next,control.id));
  // The controller write itself can trigger updates elsewhere.
  for(const value of expected.values())if(!matches(value.p,value))throw Error('structure changed after controller commit');
  return {ok:true,count:parts.length};
 }catch(err){
  let incomplete=false;
  for(const entry of writes.reverse())try{
   const b=loaded(d,entry.p);
   if(same(b,entry.after))b.setPermutation(entry.before.permutation);
   else if(!same(b,entry.before)){incomplete=true;report('移動構造物の変更済み位置は復旧しません',Error('position changed'));}
  }catch(e){incomplete=true;report('移動構造物の復旧失敗',e);}
  report(incomplete?'移動失敗（復旧要確認）':'移動失敗（復旧を試行）',err);return {ok:false,reason:incomplete?'rollback':'failed'};
 }
}
