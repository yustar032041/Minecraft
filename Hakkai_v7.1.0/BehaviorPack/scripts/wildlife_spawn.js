// Bounded attempts only: never load chunks or change blocks to force a spawn.
// Candidate checks are repeated immediately before spawn; engine physics and
// the other players' movement still require real Bedrock testing.
// Search the same bounded directions but include floors up to 16 blocks away
// vertically, helping deep cave ledges where a level surface is scarce.
const HEIGHTS=[0,...Array.from({length:16},(_,i)=>[-i-1,i+1]).flat()];
export function spawnWildlife({player,type,tick,safe,preferred=()=>true,allowNearbyBiome=false,avoid=()=>false,capacity=()=>true,confirm=()=>true}){
 const d=player.dimension,location=player.location;const fallbacks=[];
 // Keep density queries bounded even when several candidate regions are full.
 let capacityChecks=0,groundChecks=0;const maxCapacityChecks=4,maxGroundChecks=24,maxFallbacksPerColumn=2;
 // Candidate search is synchronous: take one position snapshot to avoid as
 // many as 396 repeated dimension player queries. If the snapshot is not
 // trustworthy, fall back to the original filtered query for every candidate.
 let players;
 try{
  players=d.getPlayers().map(p=>{
   const pos=p.location;
   if(!pos||![pos.x,pos.y,pos.z].every(Number.isFinite))throw Error('missing player location');
   return {x:pos.x,y:pos.y,z:pos.z};
  });
 }catch{players=undefined;}
 function nearby(at){
  if(!players)return d.getPlayers({location:at,maxDistance:6,closest:1}).length>0;
  return players.some(p=>(p.x-at.x)**2+(p.y-at.y)**2+(p.z-at.z)**2<=36);
 }
 function spawn(at){
  // Limit shape probes even if hundreds of preliminary candidates pass. A
  // rejected/unknown support never bypasses the player or density checks.
  if(groundChecks>=maxGroundChecks)return 'stop';
  groundChecks++;
  try{if(!confirm(d,at))return groundChecks>=maxGroundChecks?'stop':false;}
  catch{return groundChecks>=maxGroundChecks?'stop':false;}
  // Recheck players after support inspection and immediately before spawning.
  try{if(d.getPlayers({location:at,maxDistance:6,closest:1}).length)return false;}catch{return 'stop';}
  if(capacityChecks>=maxCapacityChecks)return 'stop';
  capacityChecks++;
  try{if(!capacity(d,at))return 'full';}catch{return 'stop';}
  try{const selected=typeof type==='function'?type(at):type;if(typeof selected!=='string'||!selected)return false;d.spawnEntity(selected,at,{spawnEvent:'hakkai:wild',initialPersistence:false});return true;}catch{return false;}
 }
 for(let i=0;i<12;i++){
  const radius=8+(i%4)*2,angle=i*2.39996+(tick%100)/100;
  const x=Math.floor(location.x+Math.cos(angle)*radius)+.5,z=Math.floor(location.z+Math.sin(angle)*radius)+.5;
  for(const dy of HEIGHTS){
   const at={x,y:Math.floor(location.y)+dy,z};
   try{
    if(!d.isChunkLoaded(at)||!safe(d,at))continue;
    // Avoid the comparatively expensive protection/light scan for positions
    // already occupied by a player. The same rules are still applied.
    if(nearby(at)||avoid(at))continue;
    let matches=false;try{matches=Boolean(preferred(at));}catch{}
    if(matches){
     const result=spawn(at);
     if(result===true)return true;
     if(result==='stop'||result==='full'&&capacityChecks>=maxCapacityChecks)return false;
     // A full 32-block neighbourhood makes nearby heights in the same column
     // poor alternatives. Try another direction, never bypass the cap.
     if(result==='full')break;
     continue;
    }
    // Retain up to two heights per direction. The preliminary safe check is
    // not a full footprint test: the first ledge may fail the final rays,
    // while a second ledge in the same cave can be usable. Round-robin below
    // still tries distinct directions first and preserves the same global caps.
    if(allowNearbyBiome){
     const column=fallbacks[i]??(fallbacks[i]=[]);
     if(column.length<maxFallbacksPerColumn)column.push(at);
    }
   }catch{} // unknown or unloaded blocks never qualify
  }
 }
 for(let height=0;height<maxFallbacksPerColumn;height++)for(const column of fallbacks){
  const fallback=column?.[height];if(!fallback)continue;
  try{
   if(!d.isChunkLoaded(fallback)||!safe(d,fallback)||d.getPlayers({location:fallback,maxDistance:6,closest:1}).length||avoid(fallback))continue;
   const result=spawn(fallback);
   if(result===true)return true;
   if(result==='stop'||result==='full'&&capacityChecks>=maxCapacityChecks)return false;
  }catch{}
 }
 return false;
}
