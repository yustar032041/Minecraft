// Restricted, block-by-block linear contraptions. Only dedicated inert frame
// and panel blocks are movable; no inventories or arbitrary vanilla blocks.
const DIRECTIONS={gantry:[1,0,0],gantry_west:[-1,0,0],gantry_north:[0,0,-1],gantry_south:[0,0,1],gantry_up:[0,1,0],gantry_down:[0,-1,0]};
const MOVABLE=new Set(['hakkai:gantry_frame','hakkai:gantry_panel']);
const NEIGHBORS=[[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]];
const at=(p,v,n=1)=>({x:p.x+v[0]*n,y:p.y+v[1]*n,z:p.z+v[2]*n}),key=p=>`${p.x},${p.y},${p.z}`;
export function isGantry(id){return typeof id==='string'&&id.startsWith('hakkai:')&&Object.hasOwn(DIRECTIONS,id.slice(7));}
export function gantryState(b){try{if(!isGantry(b?.typeId))return undefined;const offset=b.permutation.getState('hakkai:offset'),mode=b.permutation.getState('hakkai:motion');if(!Number.isInteger(offset)||offset<0||offset>8||!Number.isInteger(mode)||mode<0||mode>2)return undefined;return {offset,mode};}catch{return undefined;}}
export function setGantryMode(b,mode){if(!gantryState(b)||![0,1,2].includes(mode))return false;try{b.setPermutation(b.permutation.withState('hakkai:motion',mode));return true;}catch{return false;}}
function loaded(d,p){if(!d.isChunkLoaded(p))throw Error('unloaded');const b=d.getBlock(p);if(!b)throw Error('unavailable');return b;}
// No yielding between preflight, writes and best-effort rollback. The engine
// offers no multi-block atomic transaction: never claim crash safety.
export function gantryStep(controller,step,{kineticNetwork,report=()=>{},maxBlocks=32}){
 if(step!==1&&step!==-1)return {ok:false,reason:'invalid'};
 try{
  const state=gantryState(controller),axis=DIRECTIONS[controller.typeId.slice(7)],d=controller.dimension,p={x:controller.x,y:controller.y,z:controller.z};
  if(!state||!axis)return {ok:false,reason:'invalid'};
  const next=state.offset+step;if(next<0||next>8)return {ok:false,reason:'limit'};
  const power=kineticNetwork(d,p);if(power.status!=='running')return {ok:false,reason:'power'};
  const anchor=at(p,axis,state.offset+1),root=loaded(d,anchor);
  if(!MOVABLE.has(root.typeId))return {ok:false,reason:'anchor'};
  const queue=[anchor],seen=new Set(),parts=[];
  for(let i=0;i<queue.length;i++){
   const q=queue[i],k=key(q);if(seen.has(k))continue;seen.add(k);
   const b=loaded(d,q);if(!MOVABLE.has(b.typeId))continue;
   parts.push({p:q,permutation:b.permutation});if(parts.length>maxBlocks)return {ok:false,reason:'size'};
   for(const v of NEIGHBORS){const n=at(q,v);if(!seen.has(key(n)))queue.push(n);}
  }
  const sourceKeys=new Set(parts.map(q=>key(q.p))),dest=parts.map(x=>({p:at(x.p,axis,step),permutation:x.permutation}));
  for(const part of dest){const block=loaded(d,part.p);if(!sourceKeys.has(key(part.p))&&block.typeId!=='minecraft:air')return {ok:false,reason:'blocked'};}
  const points=[...parts.map(x=>x.p),...dest.map(x=>x.p)];
  const min={x:Math.min(...points.map(x=>x.x))-2,y:Math.min(...points.map(x=>x.y))-2,z:Math.min(...points.map(x=>x.z))-2};
  const max={x:Math.max(...points.map(x=>x.x))+3,y:Math.max(...points.map(x=>x.y))+4,z:Math.max(...points.map(x=>x.z))+3};
  const center={x:(min.x+max.x)/2,y:(min.y+max.y)/2,z:(min.z+max.z)/2};
  const radius=Math.hypot(max.x-min.x,max.y-min.y,max.z-min.z)/2;
  const entities=d.getEntities({location:center,maxDistance:radius});
  if(entities.some(e=>e.typeId!=='hakkai:kinetic_visual'&&e.location.x>=min.x&&e.location.x<=max.x&&e.location.y>=min.y&&e.location.y<=max.y&&e.location.z>=min.z&&e.location.z<=max.z))return {ok:false,reason:'entity'};
  const originals=new Map();for(const q of points){const k=key(q);if(!originals.has(k))originals.set(k,{p:q,permutation:loaded(d,q).permutation});}
  const oldController=controller.permutation;
  try{
   for(const part of parts)loaded(d,part.p).setType('minecraft:air');
   for(const part of dest)loaded(d,part.p).setPermutation(part.permutation);
   controller.setPermutation(oldController.withState('hakkai:offset',next));
   return {ok:true,count:parts.length,offset:next};
  }catch(err){
   let incomplete=false;for(const old of originals.values())try{loaded(d,old.p).setPermutation(old.permutation);}catch(e){incomplete=true;report('移動構造物の復旧失敗',e);}
   try{controller.setPermutation(oldController);}catch(e){incomplete=true;report('移動装置の復旧失敗',e);}
   report(incomplete?'移動失敗（復旧要確認）':'移動失敗（復旧を試行）',err);return {ok:false,reason:incomplete?'rollback':'failed'};
  }
 }catch(err){report('移動構造物の事前確認失敗',err);return {ok:false,reason:'unloaded'};}
}
export function armGantry(controller,cycleAt,tick){
 if(cycleAt.size>=8192)cycleAt.clear();
 cycleAt.set(`gantry:${controller.dimension.id}:${controller.x},${controller.y},${controller.z}`,tick+40);
}
export function gantryAutoTick(controller,{kineticNetwork,report,cycleAt,tick}){
 const s=gantryState(controller);if(!s||s.mode===0)return;
 const d=controller.dimension,p={x:controller.x,y:controller.y,z:controller.z},n=kineticNetwork(d,p);
 if(n.status!=='running'){setGantryMode(controller,0);return;}
 const k=`gantry:${d.id}:${p.x},${p.y},${p.z}`,delay=Math.max(10,Math.ceil(40*16/Math.abs(n.rpm)));
 // An active state without a live arming record (e.g. after script restart)
 // must not resume unobserved. Require explicit user re-arming.
 if(!cycleAt.has(k)){setGantryMode(controller,0);return;}
 if(tick-cycleAt.get(k)<delay)return;
 if(cycleAt.size>=8192)cycleAt.clear();cycleAt.set(k,tick);
 const result=gantryStep(controller,s.mode===1?1:-1,{kineticNetwork,report});
 if(!result.ok)setGantryMode(controller,0);
}
