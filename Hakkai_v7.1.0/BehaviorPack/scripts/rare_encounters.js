// Per-attempt thresholds; safety checks and local caps can still prevent spawn.
export function fushiThresholds(grove,night){
 return {chief:grove?(night ? .065 : .045):(night ? .035 : .025),normal:grove?(night ? .45 : .32):(night ? .22 : .16)};
}
// A conservative spawn planner shared by the rare realm and FUSHI encounters.
// It never modifies blocks and stops when the local cap is reached.
export function spawnRareEncounter(player,type,tick,safe,{family,chief=false}={}){
 const d=player.dimension;
 try{
  const cap=family?{families:[family]}:{type};
  if(d.getEntities({...cap,location:player.location,maxDistance:chief?56:48,closest:1}).length)return false;
  for(let i=0;i<8;i++){
   const angle=i*2.39996+(tick%100)/100,radius=(chief?18:12)+(i%3)*2;
   const x=Math.floor(player.location.x+Math.cos(angle)*radius),z=Math.floor(player.location.z+Math.sin(angle)*radius);
   for(const dy of [0,-1,1,-2,2,-3,3]){
    const at={x:x+.5,y:Math.floor(player.location.y)+dy,z:z+.5};
    try{
     if(!d.isChunkLoaded(at)||!safe(d,at)||d.getPlayers({location:at,maxDistance:8,closest:1}).length)continue;
     // Check the whole boss footprint (and its headroom), not just its centre.
     const footprint=chief?1:0;let clear=true;
     for(let dx=-footprint;dx<=footprint;dx++)for(let dz=-footprint;dz<=footprint;dz++){
      const p={x:x+dx+.5,y:at.y,z:z+dz+.5};
      if(!d.isChunkLoaded(p)||!safe(d,p)||!d.getBlock({x:x+dx,y:at.y+2,z:z+dz})?.isAir)clear=false;
     }
     if(!clear)continue;
     d.spawnEntity(type,at,{spawnEvent:'hakkai:wild',initialPersistence:false});return true;
    }catch{}
   }
  }
 }catch{}
 return false;
}
