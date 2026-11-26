import {possibleFloor} from './floor_candidate.js';

// The authored wildlife family has collision boxes <= 0.9 wide and <= 2 high
// (checked by tests). SpawnWildlife supplies block-centered, integer-Y points.
// Five downward rays are a conservative support check, not a claim that an
// engine collision shape, dynamic geometry, or entity occupancy is reproduced.
const BAD_FLOOR=/(magma|cactus|campfire|leaves|powder_snow|rail|pressure_plate|carpet|fern|vine|dripleaf|pointed_dripstone)/;
const OFFSET=.43;
const PROBES=[[0,0],[-OFFSET,-OFFSET],[-OFFSET,OFFSET],[OFFSET,-OFFSET],[OFFSET,OFFSET]];
export function validWildlifeGround(d,at){
 if(!d||!at||![at.x,at.y,at.z].every(Number.isFinite)||!Number.isInteger(at.y)||
    Math.abs(at.x-Math.floor(at.x)-.5)>.001||Math.abs(at.z-Math.floor(at.z)-.5)>.001)return false;
 try{
  const x=Math.floor(at.x),z=Math.floor(at.z),floor={x,y:at.y-1,z};
  if(!d.isChunkLoaded(floor)||!possibleFloor(d.getBlock(floor),BAD_FLOOR))return false;
  for(let y=at.y;y<at.y+2;y++){
   const pos={x,y,z};if(!d.isChunkLoaded(pos)||!d.getBlock(pos)?.isAir)return false;
  }
  for(const [dx,dz] of PROBES){
   const from={x:at.x+dx,y:at.y+.04,z:at.z+dz};
   const hit=d.getBlockFromRay(from,{x:0,y:-1,z:0},{maxDistance:.12,includeLiquidBlocks:false,includePassableBlocks:false});
   if(!hit?.block||!hit.faceLocation||String(hit.face).toLowerCase()!=='up')return false;
   const loc=hit.block.location,top=loc?.y+hit.faceLocation.y;
   if(!loc||loc.x!==x||loc.z!==z||!Number.isFinite(top)||Math.abs(top-at.y)>.035)return false;
  }
  return true;
 }catch{return false;}
}
