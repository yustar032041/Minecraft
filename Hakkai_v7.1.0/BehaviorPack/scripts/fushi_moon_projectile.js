// Scripted visual projectile, not a Bedrock projectile entity. It has a fixed
// launch-to-mark trajectory and stops at the first wall/entity. Its caller
// owns target authorization, damage and exact tick scheduling.
const SPEED=1.5, MAX_DISTANCE=32;
const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
const at=(p,v,k)=>({x:p.x+v.x*k,y:p.y+v.y*k,z:p.z+v.z*k});
export function startChiefMoon(origin,aim,t){
 if(!finite(origin)||!finite(aim)||!Number.isFinite(t))return undefined;
 const delta={x:aim.x-origin.x,y:aim.y-origin.y,z:aim.z-origin.z};
 const length=Math.hypot(delta.x,delta.y,delta.z);
 if(length<.01||length>MAX_DISTANCE)return undefined;
 return {position:{...origin},direction:{x:delta.x/length,y:delta.y/length,z:delta.z/length},remaining:length,next:t+1};
}
// Each frame is raycast and rendered before it can return a hit. Missing
// chunk/raycast APIs, malformed hits or a wall cancel safely; particles are cosmetic.
// A different entity absorbs the projectile without being damaged.
export function advanceChiefMoon(d,flight,t,sourceId,targetId,particleId='hakkai:mob_time',speed=SPEED){
 if(!d||!flight||t!==flight.next||!sourceId||!targetId||!Number.isFinite(speed)||speed<=0||speed>2)return {done:true};
 try{
  const from=flight.position,len=Math.min(speed,flight.remaining),dir=flight.direction;
  if(!finite(from)||!finite(dir)||!Number.isFinite(len)||len<=0)return {done:true};
  const end=at(from,dir,len);
  for(const k of [0,len/2,len])if(!d.isChunkLoaded(at(from,dir,k)))return {done:true};
  if(!d.getBlock(from)?.isAir)return {done:true};
  const block=d.getBlockFromRay(from,dir,{maxDistance:len});let wallDistance=len;
  if(block){
   const b=block.block?.location,f=block.faceLocation;if(!finite(b)||!finite(f))return {done:true};
   wallDistance=Math.hypot(b.x+f.x-from.x,b.y+f.y-from.y,b.z+f.z-from.z);
   if(!Number.isFinite(wallDistance))return {done:true};
   wallDistance=Math.max(0,Math.min(len,wallDistance));
  }
  const hits=d.getEntitiesFromRay(from,dir,{maxDistance:len,ignoreBlockCollision:false});
  if(!Array.isArray(hits))return {done:true};
  // A malformed hit is ambiguous; don't allow it to conceal an obstruction.
  if(hits.some(h=>!h?.entity||!Number.isFinite(h.distance)||h.distance<0))return {done:true};
  const candidates=hits.filter(h=>h.entity.isValid&&h.entity.id!==sourceId&&h.distance<=len&&(!block||h.distance<wallDistance))
   .sort((a,b)=>a.distance-b.distance);
  const first=candidates[0];
  // Equal-distance overlapping bounds have no reliable ordering. A different
  // entity at the same distance shields the target regardless of API order.
  const ambiguous=first&&candidates.some(h=>h.entity.id!==first.entity.id&&h.distance<=first.distance);
  const travel=first?first.distance:wallDistance;
  // Snapshot before particle callbacks: a contact cannot authorize a later
  // position if an API hook changes the target during rendering.
  const contact=first?.entity?.location?{...first.entity.location}:undefined;
  for(let k=0;k<travel;k+=.5)try{d.spawnParticle(particleId,at(from,dir,k));}catch{}
  try{d.spawnParticle(particleId,at(from,dir,travel));}catch{}
  if(first)return {done:true,hit:!ambiguous&&first.entity.id===targetId?first.entity:undefined,contact};
  if(block)return {done:true};
  flight.position=end;flight.remaining-=len;flight.next=t+1;
  return {done:flight.remaining<=1e-6};
 }catch{return {done:true};}
}
