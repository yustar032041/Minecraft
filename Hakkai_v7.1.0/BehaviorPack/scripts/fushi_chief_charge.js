import {possibleFloor} from './floor_candidate.js';
// Bounded ground charge towards the fixed, already-warned aim. Not a native
// attack or a general-purpose pathfinder. Uses conservative checks and fails
// closed; Bedrock entity collision, movement and floor shapes still need QA.
export const CHIEF_CHARGE_BOUNDS=Object.freeze({width:2.32,height:2.48});
const HALF_WIDTH=CHIEF_CHARGE_BOUNDS.width/2, HEIGHT=CHIEF_CHARGE_BOUNDS.height, SPEED=.3, MAX_DISTANCE=6;
// Square footprint plus the usual player half-width and a small tolerance.
const CONTACT=HALF_WIDTH+.3+.1;
const HAZARD=/(magma|cactus|campfire|leaves|powder_snow|rail|pressure_plate|carpet|fern|vine|dripleaf|pointed_dripstone)/;
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function startChiefCharge(origin,aim,t){
 if(!finite(origin)||!finite(aim)||!Number.isFinite(t)||Math.abs(origin.y-aim.y)>1.5)return undefined;
 const dx=aim.x-origin.x,dz=aim.z-origin.z,n=Math.hypot(dx,dz);
 // A coincident target can still be hit without moving.
 return {position:{...origin},direction:n<.01?{x:0,z:0}:{x:dx/n,z:dz/n},remaining:Math.min(MAX_DISTANCE,n),next:t+1};
}
function clearGround(d,pos,cache){
 const epsilon=.001,r=HALF_WIDTH;
 const loaded=at=>{
  const key=`${Math.floor(at.x/16)}:${Math.floor(at.z/16)}`;
  if(!cache.chunks.has(key))cache.chunks.set(key,d.isChunkLoaded(at));
  return cache.chunks.get(key);
 };
 const block=at=>{
  const key=`${at.x}:${at.y}:${at.z}`;
  if(!cache.blocks.has(key))cache.blocks.set(key,d.getBlock(at));
  return cache.blocks.get(key);
 };
 for(let x=Math.floor(pos.x-r+epsilon);x<=Math.floor(pos.x+r-epsilon);x++)
 for(let z=Math.floor(pos.z-r+epsilon);z<=Math.floor(pos.z+r-epsilon);z++){
  const floor={x,y:Math.floor(pos.y-.01),z};
  if(!loaded(floor))return false;
  const b=block(floor);
  if(!possibleFloor(b,HAZARD))return false;
  for(let y=Math.floor(pos.y+epsilon);y<=Math.floor(pos.y+HEIGHT-epsilon);y++){
   const at={x,y,z};if(!loaded(at)||!block(at)?.isAir)return false;
  }
 }
 for(const [x,z] of [[0,0],[-r+.04,-r+.04],[-r+.04,r-.04],[r-.04,-r+.04],[r-.04,r-.04]]){
  const from={x:pos.x+x,y:pos.y+.04,z:pos.z+z};
  if(!loaded(from)||!loaded({...from,y:pos.y-.08}))return false;
  const hit=d.getBlockFromRay(from,{x:0,y:-1,z:0},{maxDistance:.12,includeLiquidBlocks:false,includePassableBlocks:false});
  if(!hit?.block||String(hit.face).toLowerCase()!=='up'||!hit.faceLocation)return false;
  const h=hit.block.location?.y+hit.faceLocation.y;
  if(!Number.isFinite(h)||Math.abs(h-pos.y)>.035)return false;
 }
 return true;
}
function lineClear(d,from,to){
 const a={x:from.x,y:from.y+.8,z:from.z},b={x:to.x,y:to.y+.8,z:to.z};
 const x=b.x-a.x,y=b.y-a.y,z=b.z-a.z,n=Math.hypot(x,y,z);
 if(!Number.isFinite(n)||!d.isChunkLoaded(a)||!d.isChunkLoaded(b))return false;
 return n<.01||!d.getBlockFromRay(a,{x:x/n,y:y/n,z:z/n},{maxDistance:n});
}
// Returns {done,contact}. Each exact scheduled frame validates the actual
// source, target and prospective path. Nobody else can be damaged here.
export function advanceChiefCharge(e,target,charge,t){
 if(!e?.isValid||!target?.isValid||!charge||t!==charge.next)return {done:true};
 try{
  const d=e.dimension,from={...e.location},p=target.location;
  if(e.isOnGround!==true||!finite(from)||!finite(p)||dist(from,charge.position)>.25||Math.abs(from.y-charge.position.y)>.1)return {done:true};
  const nearby=d.getEntities({location:from,maxDistance:5});
  if(!Array.isArray(nearby))return {done:true};
  const others=nearby.filter(v=>v.isValid&&v.id!==e.id&&v.id!==target.id);
  if(others.some(v=>!finite(v.location)))return {done:true};
  // Entity location is not a collision shape. Keep a generous square margin
  // for other creatures; very large hitboxes still require Bedrock validation.
  const free=pos=>!others.some(v=>Math.abs(v.location.y-pos.y)<HEIGHT&&Math.abs(v.location.x-pos.x)<2.2&&Math.abs(v.location.z-pos.z)<2.2);
  const contact=pos=>Math.abs(p.y-pos.y)<=1.5&&Math.abs(p.x-pos.x)<=CONTACT+1e-6&&Math.abs(p.z-pos.z)<=CONTACT+1e-6;
  const cache={chunks:new Map(),blocks:new Map()};
  if(!clearGround(d,from,cache)||!free(from))return {done:true};
  if(contact(from)){
   if(!lineClear(d,from,p))return {done:true};
   d.spawnParticle('hakkai:mob_impact',{x:from.x,y:from.y+.8,z:from.z});
   return {done:true,contact:true};
  }
  const length=Math.min(SPEED,charge.remaining);if(length<=1e-6)return {done:true};
  let next=from,travel=0,nearContact=false;
  // Sample the swept volume. Stop just before entering the target's contact
  // envelope rather than teleporting the boss into the player's collision box.
  for(let step=Math.min(.1,length);step<=length+1e-8;step=Math.min(length,step+.1)){
   const point={x:from.x+charge.direction.x*step,y:from.y,z:from.z+charge.direction.z*step};
   if(!clearGround(d,point,cache)||!free(point))return {done:true};
   if(contact(point)){nearContact=true;break;}
   next=point;travel=step;
   if(step===length)break;
  }
  if(!travel&&!nearContact)return {done:true};
  // Visual failure cancels movement as well as damage. Native AI movement can
  // interfere between ticks; unexpected displacement cancels the next step.
  d.spawnParticle('hakkai:mob_impact',{x:next.x,y:next.y+.35,z:next.z});
  if(travel){e.clearVelocity();if(!e.tryTeleport(next,{checkForBlocks:true}))return {done:true};}
  charge.position=next;charge.remaining-=travel;charge.next=t+1;
  if(nearContact)return {done:true,contact:lineClear(d,next,p)};
  return {done:charge.remaining<=1e-6};
 }catch{return {done:true};}
}
