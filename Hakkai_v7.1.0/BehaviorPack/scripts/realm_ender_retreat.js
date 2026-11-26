import {possibleFloor} from './floor_candidate.js';
// Conservative landing check for the eight realm travelers. Their candidate
// coordinates are block-centered; this assumes the authored .65 x 2.75 box.
// It does not prove Bedrock collision, dynamic entity shapes, or rendering.
const HALF=.325,HEIGHT=2.75;
const BAD_FLOOR=/(magma|cactus|campfire|leaves|powder_snow|rail|pressure_plate|carpet|fern|vine|dripleaf|pointed_dripstone)/;
export function validRealmEnderRetreat(d,at){
 if(!d||!at||![at.x,at.y,at.z].every(Number.isFinite))return false;
 try{
  const eps=.001;
  for(let x=Math.floor(at.x-HALF+eps);x<=Math.floor(at.x+HALF-eps);x++)
  for(let z=Math.floor(at.z-HALF+eps);z<=Math.floor(at.z+HALF-eps);z++){
   const floor={x,y:Math.floor(at.y-.01),z};if(!d.isChunkLoaded(floor))return false;
   const b=d.getBlock(floor);
   if(!possibleFloor(b,BAD_FLOOR))return false;
   for(let y=Math.floor(at.y+eps);y<=Math.floor(at.y+HEIGHT-eps);y++){
    const block={x,y,z};if(!d.isChunkLoaded(block)||!d.getBlock(block)?.isAir)return false;
   }
  }
  const r=HALF-.02;
  for(const [x,z] of [[0,0],[-r,-r],[-r,r],[r,-r],[r,r]]){
   const from={x:at.x+x,y:at.y+.04,z:at.z+z};
   if(!d.isChunkLoaded(from)||!d.isChunkLoaded({...from,y:at.y-.08}))return false;
   const hit=d.getBlockFromRay(from,{x:0,y:-1,z:0},{maxDistance:.12,includeLiquidBlocks:false,includePassableBlocks:false});
   if(!hit?.block||!hit.faceLocation||String(hit.face).toLowerCase()!=='up')return false;
   const y=hit.block.location?.y+hit.faceLocation.y;
   if(!Number.isFinite(y)||Math.abs(y-at.y)>.035)return false;
  }
  return true;
 }catch{return false;}
}
