// Best effort rescue, only while the boss is loaded and ticked. No blocks are
// changed and a blocked or occupied destination is never forced.
export function isOutsideWardenArena(e){
 try{const l=e.location;return Math.abs(l.x)>15.5||Math.abs(l.z)>15.5||l.y<76||l.y>95;}catch{return true;}
}
export function rescueWarden(e){
 try{
  if(!isOutsideWardenArena(e))return false;
  const d=e.dimension,centre={x:.5,y:80,z:-6.5};
  if(d.getPlayers({location:centre,maxDistance:4,closest:1}).length)return false;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
   for(let dy=-1;dy<=2;dy++){
    const p={x:Math.floor(centre.x)+dx,y:centre.y+dy,z:Math.floor(centre.z)+dz};
    if(!d.isChunkLoaded(p))return false;
    const b=d.getBlock(p);if(!b)return false;
    if(dy===-1){if(!b.isSolid||b.isLiquid||/magma|cactus|campfire|powder_snow/.test(b.typeId))return false;}
    else if(!b.isAir)return false;
   }
  }
  return e.tryTeleport(centre,{checkForBlocks:true})===true;
 }catch{return false;}
}
