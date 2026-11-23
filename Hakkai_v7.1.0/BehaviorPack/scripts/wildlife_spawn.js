// Bounded attempts only: never load chunks or change blocks to force a spawn.
// Candidate checks are repeated immediately before spawn; engine physics and
// the other players' movement still require real Bedrock testing.
const HEIGHTS=[0,-1,1,-2,2,-3,3,-4,4,-5,5,-6,6];
export function spawnWildlife({player,type,tick,safe,preferred=()=>true,allowNearbyBiome=false,avoid=()=>false}){
 const d=player.dimension,location=player.location;let fallback;
 function spawn(at){
  try{d.spawnEntity(type,at,{spawnEvent:'hakkai:wild',initialPersistence:false});return true;}catch{return false;}
 }
 for(let i=0;i<12;i++){
  const radius=8+(i%4)*2,angle=i*2.39996+(tick%100)/100;
  const x=Math.floor(location.x+Math.cos(angle)*radius)+.5,z=Math.floor(location.z+Math.sin(angle)*radius)+.5;
  for(const dy of HEIGHTS){
   const at={x,y:Math.floor(location.y)+dy,z};
   try{
    if(!d.isChunkLoaded(at)||!safe(d,at)||avoid(at))continue;
    if(d.getPlayers({location:at,maxDistance:6,closest:1}).length)continue;
    let matches=false;try{matches=Boolean(preferred(at));}catch{}
    if(matches){if(spawn(at))return true;continue;}
    if(allowNearbyBiome&&!fallback)fallback=at;
   }catch{} // unknown or unloaded blocks never qualify
  }
 }
 if(fallback){
  try{
   if(d.isChunkLoaded(fallback)&&safe(d,fallback)&&!avoid(fallback)&&!d.getPlayers({location:fallback,maxDistance:6,closest:1}).length)return spawn(fallback);
  }catch{}
 }
 return false;
}
